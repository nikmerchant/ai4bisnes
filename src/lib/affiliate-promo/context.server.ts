import "server-only";
import { createClient } from "@/lib/supabase/server";
import { validateAffiliateReferralCode } from "./referral-policy";

export async function loadAffiliatePromoContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "unauthenticated" as const };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return { ok: false as const, reason: "affiliate_unavailable" as const };
  const referralCode = validateAffiliateReferralCode(profile?.referral_code);
  if (!referralCode) return { ok: false as const, reason: "affiliate_inactive" as const };
  return { ok: true as const, user, referralCode };
}
