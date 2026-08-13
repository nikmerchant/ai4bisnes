import Link from "next/link";
import { redirect } from "next/navigation";
import { dapatkanProfil } from "../shared";
import { ContentCalendarClient } from "./content-calendar-client";
import type { PlanArtifact, SavedPlan } from "../plan-engine/types";

function isArtifact(value: unknown): value is PlanArtifact {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.schema_version === 1 && data.plan_kind === "content_calendar" && Array.isArray(data.items);
}

export default async function ContentCalendarPage() {
  const { supabase, profil } = await dapatkanProfil();
  if (profil.tier !== "max") redirect("/naik-taraf");

  const { data } = await supabase
    .from("generated_outputs")
    .select("id, inputs, created_at")
    .eq("task_slug", "content-calendar-plan")
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
        <Link href="/app/wizard" className="underline">Semua tugasan</Link>
      </nav>
      <div className="mb-6">
        <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">🗓️ Kalendar Kandungan</h1><span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">🏆 MAX</span></div>
        <p className="mt-2 text-sm text-neutral-500">Sediakan pelan kandungan 30 hari, import jawapan AI, edit setiap hari dan simpan semuanya di satu tempat.</p>
      </div>
      <ContentCalendarClient savedPlans={savedPlans} />
    </main>
  );
}
