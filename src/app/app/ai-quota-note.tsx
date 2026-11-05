import type { AiQuota } from "@/lib/telemetry-view";

export function AiQuotaNote({ quota }: { quota: AiQuota | null }) {
  if (!quota) return null;
  const reset = new Date(quota.resetsAt).toLocaleDateString("ms-MY", { day: "numeric", month: "long", timeZone: "UTC" });
  return (
    <p className="rounded-xl border border-zinc-200 p-3 text-xs text-neutral-500 dark:border-zinc-800">
      Baki AI bulan ini: <strong className="text-neutral-800 dark:text-neutral-100">{quota.remaining}/{quota.limit}</strong> · set semula {reset}
    </p>
  );
}
