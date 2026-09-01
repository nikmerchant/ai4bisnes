import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentVisualPackagingAccess } from "@/lib/visual-packaging/access";
import { loadVisualPackagingContext } from "@/lib/visual-packaging/context.server";
import { canUseVisualPackagingTier } from "@/lib/visual-packaging/domain";
import { loadVisualPackagingArtifact } from "@/lib/visual-packaging/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VisualPlanClient } from "../visual-plan-client";

export default async function VisualPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await loadVisualPackagingContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : "/app");
  if (!canUseVisualPackagingTier(context.tier)) redirect("/naik-taraf");
  if (!currentVisualPackagingAccess(context.user).allowed) redirect("/app");
  const { id } = await params;
  const artifactId = Number(id);
  if (!Number.isSafeInteger(artifactId) || artifactId < 1) notFound();
  const stored = await loadVisualPackagingArtifact({ admin: createAdminClient(), userId: context.user.id, artifactId });
  if (!stored) notFound();
  return <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
    <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm"><Link href={`/app/content-create/${stored.artifact.sourceContentCreateId}`} className="text-neutral-500 underline">← Content sumber</Link><Link href="/app" className="text-neutral-500 underline">Hari Ini</Link></nav>
    <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Visual plan #{stored.id}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Buka semula Bina Visual Plan</h1><p className="mt-2 text-sm text-neutral-500 tabular-nums">Status {stored.artifact.status.toUpperCase()} · Revision {stored.artifact.revision}</p></div>
    <VisualPlanClient source={stored.artifact.sourceSnapshot} initial={{ id: stored.id, artifact: stored.artifact, request: stored.request, telemetry: stored.telemetry, sourceText: stored.sourceText }} />
  </main>;
}
