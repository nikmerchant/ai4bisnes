import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentContentReviewAccess } from "@/lib/content-review/access";
import { loadContentReviewContext } from "@/lib/content-review/context.server";
import { canUseContentReviewTier } from "@/lib/content-review/domain";
import { loadContentReviewArtifact } from "@/lib/content-review/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentReviewClient } from "../content-review-client";

export default async function ReopenContentReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await loadContentReviewContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : "/app");
  if (!currentContentReviewAccess(context.user).allowed) redirect("/app");
  if (!canUseContentReviewTier(context.tier)) redirect("/naik-taraf");
  const { id } = await params;
  const artifactId = Number(id);
  if (!Number.isSafeInteger(artifactId) || artifactId < 1) notFound();
  const stored = await loadContentReviewArtifact({ admin: createAdminClient(), userId: context.user.id, artifactId });
  if (!stored) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm"><Link href="/app/content-review" className="text-neutral-500 underline">← Review baharu</Link><Link href="/app/native-social-post" className="text-neutral-500 underline">Tulis Post</Link></nav>
      <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Review artifact #{stored.id}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Buka semula Review & Improve</h1><p className="mt-2 text-sm text-neutral-500">Dicipta {new Date(stored.createdAt).toLocaleString("ms-MY")} · Status {stored.artifact.status.toUpperCase()} · Revision {stored.artifact.improvedDraft.revision}</p></div>
      <ContentReviewClient business={context.business} initial={{ id: stored.id, artifact: stored.artifact, request: stored.request, telemetry: stored.telemetry, sourceText: stored.sourceText }} />
    </main>
  );
}
