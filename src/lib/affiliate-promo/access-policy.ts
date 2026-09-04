export type AffiliatePromoAccessUser = { id: string; email?: string | null };
export type AffiliatePromoAccessInput = { nodeEnv?: string; deploymentTarget?: string; enabled?: string; allowlist?: string; user: AffiliatePromoAccessUser };

function flagEnabled(value: string | undefined) { return value?.trim().toLowerCase() === "true"; }
function allowlisted(value: string | undefined, user: AffiliatePromoAccessUser) {
  const accepted = new Set(String(value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  return accepted.has(user.id.toLowerCase()) || Boolean(user.email && accepted.has(user.email.toLowerCase()));
}

export function resolveAffiliatePromoAccess(input: AffiliatePromoAccessInput) {
  if (input.nodeEnv !== "production") return { allowed: true, reason: "local_default" as const };
  if (input.deploymentTarget !== "production-canary") return { allowed: false, reason: "production_fail_closed" as const };
  if (!flagEnabled(input.enabled)) return { allowed: false, reason: "flag_disabled" as const };
  if (!String(input.allowlist || "").trim()) return { allowed: false, reason: "allowlist_required" as const };
  if (!allowlisted(input.allowlist, input.user)) return { allowed: false, reason: "not_allowlisted" as const };
  return { allowed: true, reason: "allowlisted_production_canary" as const };
}
