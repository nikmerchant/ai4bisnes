import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSlice3Access } from "@/lib/native-whatsapp/access";
import { canUseNativeWhatsAppTier, type NativeWhatsAppRequest } from "@/lib/native-whatsapp/domain";
import { loadNativeWhatsAppContext } from "@/lib/native-whatsapp/context.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NativeWhatsAppClient, type ApprovedOfferOption } from "./native-whatsapp-client";

export const dynamic = "force-dynamic";

export default async function NativeWhatsAppPage({ searchParams }: { searchParams: Promise<{ sourceOfferId?: string }> }) {
  const context = await loadNativeWhatsAppContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : context.reason === "not_onboarded" ? "/onboarding" : "/app");
  if (!currentSlice3Access(context.user).allowed) redirect("/app");
  if (!canUseNativeWhatsAppTier(context.tier)) redirect("/naik-taraf");

  const admin = createAdminClient();
  const { data: offerRows, error: offerError } = await admin
    .from("native_offer_artifacts")
    .select("id, artifact")
    .eq("user_id", context.user.id)
    .order("id", { ascending: false })
    .limit(20);
  const approvedOffers: ApprovedOfferOption[] = [];
  if (!offerError && Array.isArray(offerRows)) {
    for (const row of offerRows as Array<{ id: number; artifact?: { status?: string; headline?: string } }>) {
      if (row.artifact?.status === "approved" && typeof row.artifact.headline === "string") {
        approvedOffers.push({ id: row.id, headline: row.artifact.headline });
      }
    }
  }

  const { sourceOfferId: rawSourceOfferId } = await searchParams;
  let sourceOfferLabel: string | undefined;
  let sourceOfferId: number | null = null;
  if (rawSourceOfferId !== undefined) {
    const candidateId = Number(rawSourceOfferId);
    const match = approvedOffers.find((offer) => offer.id === candidateId);
    if (match) {
      sourceOfferId = match.id;
      sourceOfferLabel = match.headline;
    }
  }

  const initialRequest: NativeWhatsAppRequest = {
    entry: sourceOfferId ? "from_offer" : "standalone",
    sourceOfferId,
    replyIntent: sourceOfferId ? "send_offer" : "answer_inquiry",
    customerMessage: "",
    customerName: "",
    extraNote: "",
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm">
        <Link href="/app" className="text-neutral-500 underline">← Hari Ini</Link>
        <Link href="/app/native-offer" className="text-neutral-500 underline">Bina Tawaran</Link>
      </nav>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">AI4Bisnes 2.0 · Slice 3 Candidate</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Balas WhatsApp Pelanggan</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500">Tampal mesej pelanggan, pilih niat balasan, dan dapatkan draf berstruktur berdasarkan Business Context anda. Semak → luluskan → salin → tampal ke WhatsApp.</p>
      </div>
      <NativeWhatsAppClient business={context.business} initial={null} initialRequest={initialRequest} approvedOffers={approvedOffers} sourceOfferLabel={sourceOfferLabel} />
    </main>
  );
}
