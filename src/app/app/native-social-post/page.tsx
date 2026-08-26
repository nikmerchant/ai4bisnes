import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSlice1Access } from "@/lib/native-social-post/access";
import { canUseNativeSocialPostTier } from "@/lib/native-social-post/domain";
import { loadNativeSocialPostContext } from "@/lib/native-social-post/context.server";
import { NativeSocialPostClient } from "./native-social-post-client";

export default async function NativeSocialPostPage() {
  const context = await loadNativeSocialPostContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : context.reason === "not_onboarded" ? "/onboarding" : "/app");
  if (!currentSlice1Access(context.user).allowed) redirect("/app");
  if (!canUseNativeSocialPostTier(context.tier)) redirect("/naik-taraf");

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm">
        <Link href="/app" className="text-neutral-500 underline">← Hari Ini</Link>
        <Link href="/app/wizard/social-post" className="text-neutral-500 underline">Legacy Smart Bridge</Link>
      </nav>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">AI4Bisnes 2.0 · Slice 1 Candidate</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Business Context → Social Post</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500">Jana hasil dalam platform, edit sebagai artifact, simpan, buka semula dan luluskan sebelum digunakan.</p>
      </div>
      <NativeSocialPostClient business={context.business} initial={null} />
    </main>
  );
}
