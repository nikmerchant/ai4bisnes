import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildBusinessContextSnapshot,
  type NativeSocialPostBusinessProfile,
} from "./domain";
import { resolveNativeSocialPostEntitlement, type SubscriptionEntitlementRow } from "./entitlement-policy";

export type NativeSocialPostProfileRow = {
  business_name: string | null;
  products: string | null;
  target_customer: string | null;
  location: string | null;
  tier: string | null;
  onboarded: boolean | null;
  usp: string | null;
  tone_of_voice: string | null;
  price_range: string | null;
  platforms: string | null;
  categories: { name_ms?: string | null } | Array<{ name_ms?: string | null }> | null;
};

function categoryName(value: NativeSocialPostProfileRow["categories"]) {
  if (Array.isArray(value)) return value[0]?.name_ms || "";
  return value?.name_ms || "";
}

export async function loadNativeSocialPostContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "unauthenticated" as const };

  await supabase.rpc("semak_langganan");
  const [{ data, error }, { data: subscriptionRows, error: subscriptionError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("business_name, products, target_customer, location, tier, onboarded, usp, tone_of_voice, price_range, platforms, categories(name_ms)")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("tier,status,expires_at")
      .eq("user_id", user.id),
  ]);
  if (error || !data) return { ok: false as const, reason: "profile_unavailable" as const };
  if (subscriptionError) return { ok: false as const, reason: "entitlement_unavailable" as const };

  const profile = data as NativeSocialPostProfileRow;
  if (!profile.onboarded) return { ok: false as const, reason: "not_onboarded" as const };
  const businessProfile: NativeSocialPostBusinessProfile = {
    businessName: profile.business_name || "Bisnes saya",
    category: categoryName(profile.categories),
    products: profile.products || "Produk atau servis",
    targetCustomer: profile.target_customer || "Pelanggan sasaran",
    location: profile.location || "Malaysia",
    usp: profile.usp || "",
    toneOfVoice: profile.tone_of_voice || "mesra dan profesional",
    priceRange: profile.price_range || "",
    platforms: profile.platforms || "",
  };

  return {
    ok: true as const,
    user,
    supabase,
    tier: resolveNativeSocialPostEntitlement((subscriptionRows ?? []) as SubscriptionEntitlementRow[], new Date()),
    business: buildBusinessContextSnapshot(businessProfile),
  };
}
