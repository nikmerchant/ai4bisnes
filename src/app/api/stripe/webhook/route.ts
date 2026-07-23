import { NextRequest } from "next/server";
import { dapatkanStripe } from "@/lib/stripe";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

  let event;
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
        const session = event.data.object as any;
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

        await admin.from("subscriptions").upsert(
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
          { onConflict: "user_id,tier", ignoreDuplicates: false }
        );

        // Naik taraf profile user
        await admin
          .from("profiles")
          .update({ tier })
          .eq("id", user_id);

        console.log(
          `✅ Stripe: ${user_id} → ${tier} (${period}) subscription ${subId}`
        );

        // Rekod komisen affiliate kalau ada
        try {
          await janaKomisenAffiliate(admin, {
            user_id,
            tier,
            period,
            price_rm: priceRm,
          });
        } catch (e) {
          console.error("Komisen affiliate gagal:", e);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const status = sub.status; // active, past_due, canceled, unpaid
        const { user_id } = sub.metadata ?? {};

        if (!user_id) return new Response("ok");

        // Update status dan expiry
        const updates: Record<string, string | null> = {
          status:
            status === "active"
              ? "active"
              : status === "past_due"
                ? "past_due"
                : status === "canceled"
                  ? "cancelled"
                  : status === "unpaid"
                    ? "unpaid"
                    : "incomplete",
        };

        if ((sub as any).current_period_end) {
          updates.expires_at = new Date(
            (sub as any).current_period_end * 1000
          ).toISOString();
        }

        await admin
          .from("subscriptions")
          .update(updates as any)
          .eq("stripe_subscription_id", sub.id);

        // Kalau cancelled, turunkan tier ke basic
        if (status === "canceled" || status === "unpaid") {
          await admin
            .from("profiles")
            .update({ tier: "basic" })
            .eq("id", user_id);
        }

        console.log(
          `🔄 Stripe: sub ${sub.id} → ${status} (${user_id})`
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const { user_id } = sub.metadata ?? {};

        if (!user_id) return new Response("ok");

        await admin
          .from("subscriptions")
          .update({ status: "cancelled", expires_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);

        await admin
          .from("profiles")
          .update({ tier: "basic" })
          .eq("id", user_id);

        console.log(`🗑️ Stripe: sub ${sub.id} deleted, ${user_id} → basic`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const subId = invoice.subscription as string;

        if (subId) {
          await admin
            .from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subId = invoice.subscription as string;

        if (subId) {
          await admin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    // Jangan return error — Stripe akan retry. Lebih baik log dan ack.
  }

  return new Response("ok");
}

// Fungsi komisen affiliate (porting dari callback toyyibPay)
async function janaKomisenAffiliate(
  admin: any,
  {
    user_id,
    price_rm,
  }: { user_id: string; tier: string; period: string; price_rm: number }
) {
  const { data: pembayar } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", user_id)
    .single();
  if (!pembayar?.referred_by) return;

  await admin.from("affiliate_commissions").upsert(
    {
      referrer_id: pembayar.referred_by,
      referred_user_id: user_id,
      subscription_id: user_id, // guna user_id sebagai ref sementara
      amount_rm: price_rm * 0.2,
    },
    { onConflict: "subscription_id", ignoreDuplicates: true }
  );
}
