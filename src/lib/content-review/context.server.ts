import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildContentReviewBusinessContextSnapshot } from "./domain";
import { resolveNativeSocialPostEntitlement, type SubscriptionEntitlementRow } from "../native-social-post/entitlement-policy";

type Profile = { business_name: string | null; products: string | null; target_customer: string | null; location: string | null; onboarded: boolean | null; usp: string | null; tone_of_voice: string | null; price_range: string | null; platforms: string | null; categories: { name_ms?: string | null } | Array<{ name_ms?: string | null }> | null };
function category(value: Profile["categories"]) { return Array.isArray(value) ? value[0]?.name_ms || "" : value?.name_ms || ""; }

export async function loadContentReviewContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "unauthenticated" as const };
  await supabase.rpc("semak_langganan");
  const admin = createAdminClient();
  const [{ data, error }, { data: subscriptions, error: subscriptionError }] = await Promise.all([
    supabase.from("profiles").select("business_name, products, target_customer, location, onboarded, usp, tone_of_voice, price_range, platforms, categories(name_ms)").eq("id", user.id).maybeSingle(),
    admin.from("subscriptions").select("tier,status,expires_at").eq("user_id", user.id),
  ]);
  if (error || !data) return { ok: false as const, reason: "profile_unavailable" as const };
  if (subscriptionError) return { ok: false as const, reason: "entitlement_unavailable" as const };
  const profile = data as Profile;
  if (!profile.onboarded) return { ok: false as const, reason: "not_onboarded" as const };
  return {
    ok: true as const,
    user,
    tier: resolveNativeSocialPostEntitlement((subscriptions ?? []) as SubscriptionEntitlementRow[], new Date()),
    business: buildContentReviewBusinessContextSnapshot({ businessName: profile.business_name || "Bisnes saya", category: category(profile.categories), products: profile.products || "Produk atau servis", targetCustomer: profile.target_customer || "Pelanggan sasaran", location: profile.location || "Malaysia", usp: profile.usp || "", toneOfVoice: profile.tone_of_voice || "mesra dan profesional", priceRange: profile.price_range || "", platforms: profile.platforms || "" }),
  };
}
