import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentContentReviewAccess } from "@/lib/content-review/access";
import { loadContentReviewContext } from "@/lib/content-review/context.server";
import { canUseContentReviewTier, type ContentReviewRequestV1 } from "@/lib/content-review/domain";
import { renderSocialPostText } from "@/lib/native-social-post/domain";
import { loadNativeSocialPost } from "@/lib/native-social-post/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentReviewClient } from "./content-review-client";

export default async function ContentReviewPage({ searchParams }: { searchParams: Promise<{ sourceSocialPostId?: string }> }) {
  const context = await loadContentReviewContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : context.reason === "not_onboarded" ? "/onboarding" : "/app");
  if (!currentContentReviewAccess(context.user).allowed) redirect("/app");
  if (!canUseContentReviewTier(context.tier)) redirect("/naik-taraf");

  const query = await searchParams;
  let initialRequest: ContentReviewRequestV1 | undefined;
  const requestedSourceId = query.sourceSocialPostId ? Number(query.sourceSocialPostId) : null;
  if (query.sourceSocialPostId !== undefined) {
    if (!Number.isSafeInteger(requestedSourceId) || !requestedSourceId || requestedSourceId < 1) notFound();
    const source = await loadNativeSocialPost({ admin: createAdminClient(), userId: context.user.id, artifactId: requestedSourceId });
    if (!source || !(["draft", "approved"] as const).includes(source.artifact.status)) notFound();
    initialRequest = {
      entry: "from_social_post",
      sourceSocialPostId: source.id,
      sourceText: renderSocialPostText(source.artifact),
      platform: source.artifact.platform,
      objective: source.artifact.objective,
      desiredAction: "",
      extraContext: "",
    };
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm">
        <Link href="/app/native-social-post" className="text-neutral-500 underline">← Tulis Post</Link>
        <Link href="/app" className="text-neutral-500 underline">Hari Ini</Link>
      </nav>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Tulis Post · Review & Improve</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Semak lebih mendalam</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-500">Diagnosis content sedia ada, pilih satu bottleneck utama, semak risiko claim dan baiki draf tanpa menghantarnya ke mana-mana.</p>
      </div>
      <ContentReviewClient business={context.business} initial={null} initialRequest={initialRequest} />
    </main>
  );
}
