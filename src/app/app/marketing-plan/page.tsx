import Link from "next/link";
import { redirect } from "next/navigation";
import { dapatkanProfil } from "../shared";
import { MarketingPlanClient } from "./marketing-plan-client";
import type { PlanArtifact, SavedPlan } from "../plan-engine/types";

function isArtifact(value: unknown): value is PlanArtifact {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.schema_version === 1 && data.plan_kind === "marketing_30d" && Array.isArray(data.items);
}

export default async function MarketingPlanPage() {
  const { supabase, profil } = await dapatkanProfil();
  if (profil.tier !== "max") redirect("/naik-taraf");

  const { data } = await supabase
    .from("generated_outputs")
    .select("id, inputs, created_at")
    .eq("task_slug", "marketing-plan-plan")
    .order("created_at", { ascending: false })
    .limit(10);

  const savedPlans: SavedPlan[] = (data || []).flatMap((row) => {
    const inputs = row.inputs && typeof row.inputs === "object" ? row.inputs as Record<string, unknown> : {};
    if (!isArtifact(inputs.artifact)) return [];
    return [{ outputId: Number(row.id), createdAt: String(row.created_at), artifact: inputs.artifact }];
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <nav className="mb-5 flex gap-4 text-sm text-neutral-500">
        <Link href="/app" className="underline">← Dashboard</Link>
        <Link href="/app/content-calendar" className="underline">Kalendar Kandungan</Link>
      </nav>
      <div className="mb-6">
        <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">📊 Pelan Pemasaran 30 Hari</h1><span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">🏆 MAX</span></div>
        <p className="mt-2 text-sm text-neutral-500">Susun satu tindakan pemasaran praktikal setiap hari—daripada awareness dan content hingga WhatsApp, jualan dan follow-up.</p>
      </div>
      <MarketingPlanClient savedPlans={savedPlans} />
    </main>
  );
}
