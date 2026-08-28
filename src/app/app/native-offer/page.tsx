import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSlice2Access } from "@/lib/native-offer/access";
import { canUseNativeOfferTier, type NativeOfferRequest } from "@/lib/native-offer/domain";
import { loadNativeOfferContext } from "@/lib/native-offer/context.server";
import { loadNativeSocialPost } from "@/lib/native-social-post/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NativeOfferClient } from "./native-offer-client";

export default async function NativeOfferPage({ searchParams }: { searchParams: Promise<{ sourcePostId?: string }> }) {
  const context = await loadNativeOfferContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : context.reason === "not_onboarded" ? "/onboarding" : "/app");
  if (!currentSlice2Access(context.user).allowed) redirect("/app");
  if (!canUseNativeOfferTier(context.tier)) redirect("/naik-taraf");

  const { sourcePostId: rawSourcePostId } = await searchParams;
  let sourcePostLabel: string | undefined;
  let sourcePostId: number | null = null;
  if (rawSourcePostId !== undefined) {
    const candidateId = Number(rawSourcePostId);
    if (!Number.isSafeInteger(candidateId) || candidateId < 1) redirect("/app/native-offer");
    const storedSource = await loadNativeSocialPost({ admin: createAdminClient(), userId: context.user.id, artifactId: candidateId });
    if (!storedSource || storedSource.artifact.status !== "approved") redirect("/app/native-offer");
    sourcePostId = storedSource.id;
    sourcePostLabel = storedSource.artifact.topic;
  }
  const initialRequest: NativeOfferRequest = {
    entry: sourcePostId ? "from_social_post" : "standalone",
    sourcePostId,
    offerType: "promotion",
    product: context.business.products,
    goal: "sales",
    validUntil: "",
    extraNote: "",
    audience: context.business.targetCustomer,
    priceGuidance: context.business.priceRange,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm">
        <Link href="/app" className="text-neutral-500 underline">← Hari Ini</Link>
        <Link href="/app/native-social-post" className="text-neutral-500 underline">Social Post 2.0</Link>
      </nav>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">AI4Bisnes 2.0 · Slice 2 Candidate</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Bina Tawaran daripada Business Context</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500">Jana tawaran berstruktur — janji, komponen nilai, risk reversal dan CTA — edit, simpan dan luluskan sebelum digunakan.</p>
      </div>
      <NativeOfferClient business={context.business} initial={null} initialRequest={initialRequest} sourcePostLabel={sourcePostLabel} />
    </main>
  );
}
