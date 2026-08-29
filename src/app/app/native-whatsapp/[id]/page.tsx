import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentSlice3Access } from "@/lib/native-whatsapp/access";
import { canUseNativeWhatsAppTier } from "@/lib/native-whatsapp/domain";
import { loadNativeWhatsAppContext } from "@/lib/native-whatsapp/context.server";
import { loadNativeWhatsAppDraft } from "@/lib/native-whatsapp/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NativeWhatsAppClient } from "../native-whatsapp-client";

export const dynamic = "force-dynamic";

export default async function ReopenNativeWhatsAppPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await loadNativeWhatsAppContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : "/app");
  if (!currentSlice3Access(context.user).allowed) redirect("/app");
  if (!canUseNativeWhatsAppTier(context.tier)) redirect("/naik-taraf");
  const { id } = await params;
  const artifactId = Number(id);
  if (!Number.isSafeInteger(artifactId) || artifactId < 1) notFound();
  const stored = await loadNativeWhatsAppDraft({ admin: createAdminClient(), userId: context.user.id, artifactId });
  if (!stored) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-sm"><Link href="/app/native-whatsapp" className="text-neutral-500 underline">← Balasan baharu</Link><Link href="/app" className="text-neutral-500 underline">Hari Ini</Link></nav>
      <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Artifact #{stored.id}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Buka semula Draf Balasan</h1><p className="mt-2 text-sm text-neutral-500">Dicipta {new Date(stored.createdAt).toLocaleString("ms-MY")} · Status {stored.artifact.status.toUpperCase()}</p></div>
      <NativeWhatsAppClient business={context.business} initial={{ id: stored.id, artifact: stored.artifact, request: stored.request, telemetry: stored.telemetry }} approvedOffers={[]} />
    </main>
  );
}
