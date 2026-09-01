import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentVisualPackagingAccess } from "@/lib/visual-packaging/access";
import { loadVisualPackagingContext } from "@/lib/visual-packaging/context.server";
import { buildApprovedContentCreateSnapshot, canUseVisualPackagingTier, type VisualPackagingRequestV1 } from "@/lib/visual-packaging/domain";
import { loadContentCreateArtifact } from "@/lib/content-create/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VisualPlanClient } from "./visual-plan-client";

export default async function VisualPlanPage({ searchParams }: { searchParams: Promise<{ sourceContentCreateId?: string }> }) {
  const context = await loadVisualPackagingContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : "/app");
  if (!canUseVisualPackagingTier(context.tier)) redirect("/naik-taraf");
  if (!currentVisualPackagingAccess(context.user).allowed) redirect("/app");
  const { sourceContentCreateId: raw } = await searchParams;
  const sourceContentCreateId = Number(raw);
  if (!raw || !Number.isSafeInteger(sourceContentCreateId) || sourceContentCreateId < 1) notFound();
  const source = await loadContentCreateArtifact({ admin: createAdminClient(), userId: context.user.id, artifactId: sourceContentCreateId });
  if (!source || source.artifact.status !== "approved" || source.artifact.platform !== "tiktok") notFound();
  let sourceSnapshot;
  try { sourceSnapshot = buildApprovedContentCreateSnapshot({ id: source.id, artifact: source.artifact }); }
  catch { notFound(); }
  const initialRequest: VisualPackagingRequestV1 = { entry: "from_content_create", sourceContentCreateId: source.id, format: "short_video", packagingIntent: "attention", productionConstraints: "" };
  return <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
    <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm"><Link href={`/app/content-create/${source.id}`} className="text-neutral-500 underline">← Content TikTok diluluskan</Link><Link href="/app" className="text-neutral-500 underline">Hari Ini</Link></nav>
    <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Approved TikTok Content → Production direction</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Bina Visual Plan</h1><p className="mt-2 max-w-3xl text-sm text-neutral-500">Bina arahan visual dan packaging yang selari dengan content diluluskan. Tiada media dijana.</p></div>
    <VisualPlanClient source={sourceSnapshot} initial={null} initialRequest={initialRequest} />
  </main>;
}
