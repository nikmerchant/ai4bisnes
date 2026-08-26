export type SubscriptionEntitlementRow = {
  tier?: string | null;
  status?: string | null;
  expires_at?: string | null;
};

const RANK: Record<string, number> = { basic: 0, pro: 1, max: 2 };

export function resolveNativeSocialPostEntitlement(
  rows: SubscriptionEntitlementRow[],
  now: Date
): "basic" | "pro" | "max" {
  let selected: "basic" | "pro" | "max" = "basic";
  for (const row of rows) {
    const tier = row.tier === "max" ? "max" : row.tier === "pro" ? "pro" : "basic";
    if (row.status !== "active") continue;
    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) continue;
    }
    if (RANK[tier] > RANK[selected]) selected = tier;
  }
  return selected;
}
