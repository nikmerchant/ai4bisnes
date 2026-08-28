import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentSlice2Access } from "@/lib/native-offer/access";
import { canUseNativeOfferTier } from "@/lib/native-offer/domain";
import { loadNativeOfferContext } from "@/lib/native-offer/context.server";
import { loadNativeOffer } from "@/lib/native-offer/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NativeOfferClient } from "../native-offer-client";

export default async function ReopenNativeOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await loadNativeOfferContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : "/app");
  if (!currentSlice2Access(context.user).allowed) redirect("/app");
  if (!canUseNativeOfferTier(context.tier)) redirect("/naik-taraf");
  const { id } = await params;
  const artifactId = Number(id);
  if (!Number.isSafeInteger(artifactId) || artifactId < 1) notFound();
  const stored = await loadNativeOffer({ admin: createAdminClient(), userId: context.user.id, artifactId });
  if (!stored) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm"><Link href="/app/native-offer" className="text-neutral-500 underline">← Tawaran baharu</Link><Link href="/app" className="text-neutral-500 underline">Hari Ini</Link></nav>
      <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Artifact #{stored.id}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Buka semula Tawaran</h1><p className="mt-2 text-sm text-neutral-500">Dicipta {new Date(stored.createdAt).toLocaleString("ms-MY")} · Status {stored.artifact.status.toUpperCase()}</p></div>
      <NativeOfferClient business={context.business} initial={{ id: stored.id, artifact: stored.artifact, request: stored.request, telemetry: stored.telemetry }} />
    </main>
  );
}
