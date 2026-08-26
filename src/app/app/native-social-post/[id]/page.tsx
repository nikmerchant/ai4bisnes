import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentSlice1Access } from "@/lib/native-social-post/access";
import { canUseNativeSocialPostTier } from "@/lib/native-social-post/domain";
import { loadNativeSocialPostContext } from "@/lib/native-social-post/context.server";
import { loadNativeSocialPost } from "@/lib/native-social-post/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NativeSocialPostClient } from "../native-social-post-client";

export default async function ReopenNativeSocialPostPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await loadNativeSocialPostContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : "/app");
  if (!currentSlice1Access(context.user).allowed) redirect("/app");
  if (!canUseNativeSocialPostTier(context.tier)) redirect("/naik-taraf");
  const { id } = await params;
  const artifactId = Number(id);
  if (!Number.isSafeInteger(artifactId) || artifactId < 1) notFound();
  const stored = await loadNativeSocialPost({ admin: createAdminClient(), userId: context.user.id, artifactId });
  if (!stored) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm"><Link href="/app/native-social-post" className="text-neutral-500 underline">← Social Post baharu</Link><Link href="/app" className="text-neutral-500 underline">Hari Ini</Link></nav>
      <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Artifact #{stored.id}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Buka semula Social Post</h1><p className="mt-2 text-sm text-neutral-500">Dicipta {new Date(stored.createdAt).toLocaleString("ms-MY")} · Status {stored.artifact.status.toUpperCase()}</p></div>
      <NativeSocialPostClient business={context.business} initial={{ id: stored.id, artifact: stored.artifact, request: stored.request, telemetry: stored.telemetry }} />
    </main>
  );
}
