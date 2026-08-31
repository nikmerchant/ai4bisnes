import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentContentCreateAccess } from "@/lib/content-create/access";
import { loadContentCreateContext } from "@/lib/content-create/context.server";
import { buildApprovedOfferSnapshot, canUseContentCreateTier, type ContentCreateRequestV1 } from "@/lib/content-create/domain";
import { loadNativeOffer } from "@/lib/native-offer/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentCreateClient } from "./content-create-client";

export default async function ContentCreatePage({ searchParams }: { searchParams: Promise<{ sourceOfferId?: string }> }) {
  const context = await loadContentCreateContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : context.reason === "not_onboarded" ? "/onboarding" : "/app");
  if (!canUseContentCreateTier(context.tier)) redirect("/naik-taraf");
  if (!currentContentCreateAccess(context.user).allowed) redirect("/app");

  const { sourceOfferId: rawSourceOfferId } = await searchParams;
  const sourceOfferId = Number(rawSourceOfferId);
  if (!rawSourceOfferId || !Number.isSafeInteger(sourceOfferId) || sourceOfferId < 1) notFound();
  const source = await loadNativeOffer({ admin: createAdminClient(), userId: context.user.id, artifactId: sourceOfferId });
  if (!source || source.artifact.status !== "approved") notFound();
  const sourceOfferSnapshot = buildApprovedOfferSnapshot({ id: source.id, artifact: source.artifact, validUntil: source.request.validUntil });
  const initialRequest: ContentCreateRequestV1 = {
    entry: "from_offer",
    sourceOfferId: source.id,
    platform: "facebook",
    objective: "sales",
    contentRole: "convert",
    proofNote: "",
    extraContext: "",
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm">
        <Link href={`/app/native-offer/${source.id}`} className="text-neutral-500 underline">← Tawaran diluluskan</Link>
        <Link href="/app" className="text-neutral-500 underline">Hari Ini</Link>
      </nav>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Approved Offer → Social Content</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Bina Content untuk Tawaran Ini</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-500">Bina strategi ringkas dan draf social text yang mengekalkan fakta tawaran diluluskan tanpa mereka proof, urgency atau hasil.</p>
      </div>
      <ContentCreateClient business={context.business} sourceOffer={sourceOfferSnapshot} initial={null} initialRequest={initialRequest} />
    </main>
  );
}
