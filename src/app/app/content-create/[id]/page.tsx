import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentContentCreateAccess } from "@/lib/content-create/access";
import { loadContentCreateContext } from "@/lib/content-create/context.server";
import { canUseContentCreateTier } from "@/lib/content-create/domain";
import { loadContentCreateArtifact } from "@/lib/content-create/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentCreateClient } from "../content-create-client";

export default async function ReopenContentCreatePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await loadContentCreateContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : "/app");
  if (!canUseContentCreateTier(context.tier)) redirect("/naik-taraf");
  if (!currentContentCreateAccess(context.user).allowed) redirect("/app");
  const { id } = await params;
  const artifactId = Number(id);
  if (!Number.isSafeInteger(artifactId) || artifactId < 1) notFound();
  const stored = await loadContentCreateArtifact({ admin: createAdminClient(), userId: context.user.id, artifactId });
  if (!stored) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm">
        <Link href={`/app/native-offer/${stored.artifact.sourceOfferId}`} className="text-neutral-500 underline">← Tawaran sumber</Link>
        <Link href="/app" className="text-neutral-500 underline">Hari Ini</Link>
      </nav>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Content artifact #{stored.id}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Buka semula Bina Content</h1>
        <p className="mt-2 text-sm text-neutral-500">Dicipta {new Date(stored.createdAt).toLocaleString("ms-MY")} · Status {stored.artifact.status.toUpperCase()} · Revision {stored.artifact.draft.revision}</p>
      </div>
      <ContentCreateClient business={context.business} sourceOffer={stored.artifact.sourceOfferSnapshot} initial={{ id: stored.id, artifact: stored.artifact, request: stored.request, telemetry: stored.telemetry, sourceText: stored.sourceText }} />
    </main>
  );
}
