import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { dapatkanStripe } from "@/lib/stripe";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";

// Dahlia uses item periods and nested invoice subscriptions; keep legacy fallbacks.
type LegacySubscription = Stripe.Subscription & { current_period_end?: number };
type LegacyInvoice = Stripe.Invoice & { subscription?: Stripe.Invoice.Parent.SubscriptionDetails["subscription"] };

function resolvePeriodEnd(sub: LegacySubscription): number | undefined {
  const validEnd = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0 &&
    Number.isFinite(new Date(value * 1000).getTime());
  const ends = (sub.items?.data ?? [])
    .map((item) => item.current_period_end)
    .filter(validEnd);
  return ends.length > 0
    ? Math.max(...ends)
    : validEnd(sub.current_period_end) ? sub.current_period_end : undefined;
}

function resolveInvoiceSubscriptionId(invoice: LegacyInvoice): string | undefined {
  const subscription = invoice.parent?.subscription_details?.subscription;
  const id = typeof subscription === "string" ? subscription : subscription?.id;
  if (id) return id;
  const legacy = invoice.subscription;
  return typeof legacy === "string" ? legacy : legacy?.id;
}

export const dynamic = "force-dynamic";

// Stripe Webhook — terima event subscription dari Stripe Billing
// Stripe akan POST ke endpoint ni bila customer bayar, subscribe, etc.

export async function POST(req: NextRequest) {
  const stripe = dapatkanStripe();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("Stripe webhook: missing signature or secret");
    return new Response("not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    console.error("Stripe webhook signature verification failed:", e);
    return new Response("invalid signature", { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY tidak diset");
    return new Response("not configured", { status: 500 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session: Stripe.Checkout.Session = event.data.object;
        const subId = session.subscription as string;
        const customerId = session.customer as string;
        const { user_id, tier, period } = session.metadata ?? {};

        if (!user_id || !tier || !period || !subId) {
          console.error("Webhook: metadata incomplete", session.id);
          return new Response("ok");
        }

        // Simpan rekod langganan dalam Supabase
        const priceRm =
          tier === "max" ? (period === "tahunan" ? 690 : 69) : period === "tahunan" ? 490 : 49;

        const { data: subscription, error: subscriptionError } = await admin.from("subscriptions").upsert(
          {
            user_id,
            tier,
            period,
            price_rm: priceRm,
            status: "active",
            stripe_subscription_id: subId,
            stripe_customer_id: customerId,
            starts_at: new Date().toISOString(),
            // expires_at diisi webhook customer.subscription.updated
          },
          { onConflict: "stripe_subscription_id", ignoreDuplicates: false }
        ).select("id").single();
        if (subscriptionError) throw subscriptionError;
        if (!subscription || (typeof subscription.id !== "number" && typeof subscription.id !== "string")) {
          throw new Error("Subscription upsert did not return an id");
        }

        // Naik taraf profile user
        const { error: profileError } = await admin
          .from("profiles")
          .update({ tier })
          .eq("id", user_id);
        if (profileError) throw profileError;

        console.log(
          `✅ Stripe: ${user_id} → ${tier} (${period}) subscription ${subId}`
        );

        break;
      }

      case "customer.subscription.created": {
        // Expiry only: events can arrive before or after checkout, so status
        // stays owned by checkout.session.completed and subscription.updated.
        const sub: LegacySubscription = event.data.object;
        const periodEnd = resolvePeriodEnd(sub);
        if (periodEnd !== undefined) {
          const { error } = await admin
            .from("subscriptions")
            .update({ expires_at: new Date(periodEnd * 1000).toISOString() })
            .eq("stripe_subscription_id", sub.id);
          if (error) throw error;
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub: LegacySubscription = event.data.object;
        const status = sub.status; // active, past_due, canceled, unpaid
        const { user_id } = sub.metadata ?? {};

        if (!user_id) return new Response("ok");

        // Update status dan expiry
        const updates: Record<string, string | null> = {
          status:
            status === "active" || status === "trialing"
              ? "active"
              : status === "past_due"
                ? "past_due"
                : status === "canceled"
                  ? "cancelled"
                  : status === "unpaid"
                    ? "unpaid"
                    : "incomplete",
        };

        const periodEnd = resolvePeriodEnd(sub);
        if (periodEnd !== undefined) {
          updates.expires_at = new Date(periodEnd * 1000).toISOString();
        }

        const { error: subscriptionError } = await admin
          .from("subscriptions")
          .update(updates)
          .eq("stripe_subscription_id", sub.id);
        if (subscriptionError) throw subscriptionError;

        // Kalau cancelled, turunkan tier ke basic
        if (status === "canceled" || status === "unpaid") {
          const { error: profileError } = await admin
            .from("profiles")
            .update({ tier: "basic" })
            .eq("id", user_id);
          if (profileError) throw profileError;
        }

        console.log(
          `🔄 Stripe: sub ${sub.id} → ${status} (${user_id})`
        );
        break;
      }

      case "invoice.paid": {
        const invoice: LegacyInvoice = event.data.object;
        const subId = resolveInvoiceSubscriptionId(invoice);

        if (subId) {
          const { error } = await admin
            .from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", subId);
          if (error) throw error;
          await rekodKomisen(admin, invoice, subId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice: LegacyInvoice = event.data.object;
        const subId = resolveInvoiceSubscriptionId(invoice);

        if (subId) {
          const { error } = await admin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);
          if (error) throw error;
        }
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    // Return a retryable failure instead of acknowledging an incomplete write.
    return new Response("db write failed", { status: 500 });
  }

  return new Response("ok");
}

// Satu komisen bagi setiap invois MYR yang dibayar, termasuk pembaharuan/prorata.
async function rekodKomisen(
  admin: SupabaseClient,
  invoice: Stripe.Invoice,
  subId: string
) {
  if (invoice.amount_paid <= 0 || invoice.currency !== "myr") return;

  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("id, user_id")
    .eq("stripe_subscription_id", subId)
    .single();
  if (subscriptionError) throw subscriptionError;
  if (!subscription) throw new Error("Subscription not found for paid invoice");

  const { data: pembayar, error: profileError } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", subscription.user_id)
    .single();
  if (profileError) throw profileError;
  if (!pembayar?.referred_by || pembayar.referred_by === subscription.user_id) return;

  const { error } = await admin.from("affiliate_commissions").upsert(
    {
      referrer_id: pembayar.referred_by,
      referred_user_id: subscription.user_id,
      subscription_id: subscription.id,
      stripe_invoice_id: invoice.id,
      amount_rm: Math.round(invoice.amount_paid / 10) / 100,
    },
    { onConflict: "stripe_invoice_id", ignoreDuplicates: true }
  );
  if (error) throw error;
}
