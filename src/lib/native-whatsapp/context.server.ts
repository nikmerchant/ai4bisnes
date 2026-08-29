import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildWhatsAppBusinessContextSnapshot,
} from "./domain";
import { resolveNativeSocialPostEntitlement, type SubscriptionEntitlementRow } from "../native-social-post/entitlement-policy";

export type NativeWhatsAppProfileRow = {
  business_name: string | null;
  products: string | null;
  target_customer: string | null;
  tier: string | null;
  onboarded: boolean | null;
  tone_of_voice: string | null;
  price_range: string | null;
};

export async function loadNativeWhatsAppContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "unauthenticated" as const };

  await supabase.rpc("semak_langganan");
  const admin = createAdminClient();
  const [{ data, error }, { data: subscriptionRows, error: subscriptionError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("business_name, products, target_customer, tier, onboarded, tone_of_voice, price_range")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("subscriptions")
      .select("tier,status,expires_at")
      .eq("user_id", user.id),
  ]);
  if (error || !data) return { ok: false as const, reason: "profile_unavailable" as const };
  if (subscriptionError) return { ok: false as const, reason: "entitlement_unavailable" as const };

  const profile = data as NativeWhatsAppProfileRow;
  if (!profile.onboarded) return { ok: false as const, reason: "not_onboarded" as const };
  const business = buildWhatsAppBusinessContextSnapshot({
    businessName: profile.business_name || "Bisnes saya",
    products: profile.products || "Produk atau servis",
    targetCustomer: profile.target_customer || "Pelanggan sasaran",
    toneOfVoice: profile.tone_of_voice || "mesra dan profesional",
    priceRange: profile.price_range || "",
  });

  return {
    ok: true as const,
    user,
    supabase,
    tier: resolveNativeSocialPostEntitlement((subscriptionRows ?? []) as SubscriptionEntitlementRow[], new Date()),
    business,
  };
}
