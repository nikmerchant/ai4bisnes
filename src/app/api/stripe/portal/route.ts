import { NextRequest, NextResponse } from "next/server";
import { dapatkanStripe, dapatkanDomain } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Buka Stripe Customer Portal — pengguna urus langganan sendiri
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/masuk", req.url));
  }

  // Dapatkan stripe_customer_id dari subscriptions
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.redirect(
      new URL("/naik-taraf?ralat=Tiada+langganan+aktif", req.url)
    );
  }

  try {
    const stripe = dapatkanStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${dapatkanDomain()}/app`,
    });

    return NextResponse.redirect(session.url);
  } catch (e) {
    console.error("Portal session error:", e);
    return NextResponse.redirect(
      new URL("/naik-taraf?ralat=Gagal+membuka+portal", req.url)
    );
  }
}
