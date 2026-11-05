// A4B-038: what a viewer may see of generation telemetry and their monthly AI quota.
// Full telemetry stays in the database; only ops users (AI4B_OPS_USER_IDS) get it back.

export type ViewerTelemetry<T> = { aiGenerated: boolean; detail: T | null };
export type AiQuota = { used: number; limit: number; remaining: number; resetsAt: string };

export function isOpsUser(user: { id: string }) {
  const ids = String(process.env.AI4B_OPS_USER_IDS || "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
  return ids.includes(user.id.trim().toLowerCase());
}

export function forViewer<T extends { mode: string }>(telemetry: T, user: { id: string }): ViewerTelemetry<T> {
  return { aiGenerated: telemetry.mode === "provider", detail: isOpsUser(user) ? telemetry : null };
}

// Matches checkUsage in the routes: calendar month in UTC.
export function aiQuota(used: number, limit: number, now = new Date()): AiQuota {
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  return { used, limit, remaining: Math.max(0, limit - used), resetsAt };
}
