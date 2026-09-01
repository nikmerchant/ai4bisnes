import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNativeSocialPostEntitlement, type SubscriptionEntitlementRow } from "../native-social-post/entitlement-policy";

export async function loadVisualPackagingContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "unauthenticated" as const };
  await supabase.rpc("semak_langganan");
  const admin = createAdminClient();
  const { data: subscriptions, error } = await admin.from("subscriptions").select("tier,status,expires_at").eq("user_id", user.id);
  if (error) return { ok: false as const, reason: "entitlement_unavailable" as const };
  return { ok: true as const, user, tier: resolveNativeSocialPostEntitlement((subscriptions ?? []) as SubscriptionEntitlementRow[], new Date()) };
}
