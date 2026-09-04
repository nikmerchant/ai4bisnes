import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAffiliatePromoAccess } from "@/lib/affiliate-promo/access";
import { loadAffiliatePromoContext } from "@/lib/affiliate-promo/context.server";
import { AffiliatePromoClient } from "./affiliate-promo-client";

export default async function AffiliatePromoPage() {
  const context = await loadAffiliatePromoContext();
  if (!context.ok) redirect(context.reason === "unauthenticated" ? "/masuk" : "/app/affiliate");
  if (!currentAffiliatePromoAccess(context.user).allowed) redirect("/app");
  return <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
    <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm"><Link href="/app/affiliate" className="inline-flex min-h-11 items-center rounded px-2 text-neutral-500 underline active:scale-[0.96]">← Program Affiliate</Link><Link href="/app" className="inline-flex min-h-11 items-center rounded px-2 text-neutral-500 underline active:scale-[0.96]">Workspace</Link></nav>
    <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Affiliate aktif · provider OFF</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Studio Promosi Affiliate</h1><p className="mt-2 max-w-3xl text-sm text-neutral-500">Bina dua varian promosi BM siap salin. Pautan referral dan disclosure wajib dimasukkan secara automatik.</p></div>
    <AffiliatePromoClient referralLink={`https://ai4bisnes.com/?ref=${context.referralCode}`} />
  </main>;
}
