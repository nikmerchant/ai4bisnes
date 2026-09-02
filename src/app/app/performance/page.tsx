import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentPerformanceLearningAccess } from "@/lib/performance-learning/access";
import { loadPerformanceLearningContext } from "@/lib/performance-learning/context.server";
import { buildApprovedPerformanceSourceSnapshot, canUsePerformanceLearningTier, type PerformanceLearningRequestV1 } from "@/lib/performance-learning/domain";
import { loadContentCreateArtifact } from "@/lib/content-create/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PerformanceClient } from "./performance-client";

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ sourceContentCreateId?: string }> }) {
  const context = await loadPerformanceLearningContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : "/app");
  if (!canUsePerformanceLearningTier(context.tier)) redirect("/naik-taraf");
  if (!currentPerformanceLearningAccess(context.user).allowed) redirect("/app");
  const { sourceContentCreateId: raw } = await searchParams;
  const sourceContentCreateId = Number(raw);
  if (!raw || !Number.isSafeInteger(sourceContentCreateId) || sourceContentCreateId < 1) notFound();
  // Owner-scoped approved source on ANY platform; every invalid source (draft,
  // missing, cross-owner, corrupted) resolves to the same generic 404.
  const source = await loadContentCreateArtifact({ admin: createAdminClient(), userId: context.user.id, artifactId: sourceContentCreateId });
  if (!source || source.artifact.status !== "approved") notFound();
  let sourceSnapshot;
  try { sourceSnapshot = buildApprovedPerformanceSourceSnapshot({ id: source.id, artifact: source.artifact }); }
  catch { notFound(); }
  const initialRequest: PerformanceLearningRequestV1 = { entry: "from_content_create", sourceContentCreateId: source.id, metrics: { impressions: 0, clicks: 0, saves: 0, shares: 0, leads: 0 }, platformWindowDays: 7, snapshotNote: "" };
  return <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
    <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm"><Link href={`/app/content-create/${source.id}`} className="text-neutral-500 underline">← Content diluluskan</Link><Link href="/app" className="text-neutral-500 underline">Hari Ini</Link></nav>
    <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Approved Content → Prestasi → Pembelajaran</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Rekod Prestasi</h1><p className="mt-2 max-w-3xl text-sm text-neutral-500">Rekodkan snapshot metrik platform anda untuk content yang diluluskan. Diagnosis deterministic dan cadangan seterusnya dijana secara lokal; tiada panggilan provider atau platform.</p></div>
    <PerformanceClient source={sourceSnapshot} initial={null} initialRequest={initialRequest} />
  </main>;
}
