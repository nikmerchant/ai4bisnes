import Link from "next/link";
import { boardItemChaining, describeBoardItem, type WorkspaceBoardItem } from "@/lib/workspace/domain";
import { CtaSpinner } from "@/app/cta-spinner";

const LAUNCHERS = [
  { emoji: "📱", nama: "Tulis Post", desc: "Hantaran media sosial berstruktur, siap diluluskan", href: "/app/wizard/social-post" },
  { emoji: "🎁", nama: "Bina Tawaran", desc: "Tawaran jualan daripada post yang diluluskan", href: "/app/native-offer" },
  { emoji: "💬", nama: "Balas WhatsApp", desc: "Draf balasan pelanggan untuk salinan manual", href: "/app/native-whatsapp" },
  { emoji: "🚀", nama: "Rancang Kempen", desc: "Pelan kempen berperingkat untuk bulan anda", href: "/app/marketing-plan" },
];

const AFFILIATE_PROMO_LAUNCHER = { emoji: "✨", nama: "Studio Promosi Affiliate", desc: "Dua varian promosi BM dengan referral dan disclosure", href: "/app/affiliate-promo" };

function Masa({ iso }: { iso: string }) {
  const masa = new Date(iso);
  return <span className="tabular-nums">{Number.isNaN(masa.getTime()) ? "" : masa.toLocaleDateString("ms-MY", { day: "numeric", month: "short" })}</span>;
}

export function WorkspaceView({ businessName, tier, board, affiliatePromoEnabled = false }: { businessName: string; tier: string; board: WorkspaceBoardItem[]; affiliatePromoEnabled?: boolean }) {
  const launchers = affiliatePromoEnabled ? [...LAUNCHERS, AFFILIATE_PROMO_LAUNCHER] : LAUNCHERS;
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Workspace Fokus</p>
          <h1 className="mt-1 text-2xl font-bold">Selamat datang, {businessName} 👋</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-zinc-100 px-3 py-1 font-bold uppercase dark:bg-zinc-900">{tier}</span>
          <Link href="/onboarding" className="rounded px-0.5 underline active:opacity-70">Kemaskini profil<CtaSpinner /></Link>
        </div>
      </header>

      <section aria-label="Goal Launcher" className="grid gap-4 sm:grid-cols-2">
        {launchers.map((launcher) => (
          <Link
            key={launcher.nama}
            href={launcher.href}
            className="inline-flex min-h-11 items-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-5 text-white transition-transform hover:scale-[1.01] active:opacity-90"
          >
            <div>
              <h2 className="text-lg font-extrabold">{launcher.emoji} {launcher.nama}</h2>
              <p className="mt-1 text-sm text-white/80">{launcher.desc}</p>
            </div>
          </Link>
        ))}
      </section>

      <section aria-label="Journey Board" className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Journey Board</h2>
          <p className="text-xs text-neutral-500">Semua artifact anda · baca sahaja</p>
        </div>
        {board.length === 0 ? (
          <p className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm text-neutral-500 dark:bg-zinc-900">Belum ada artifact. Mulakan dengan salah satu pelancar di atas.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-900">
            {board.map((item) => {
              const chaining = boardItemChaining(item);
              const label = describeBoardItem(item).label;
              const detailHref = detailHrefFor(item);
              return (
                <li key={`${item.kind}-${item.artifactId}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"}`}>
                    {item.status === "approved" ? "DILULUSKAN" : "DRAF"}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}{item.revision ? ` · R${item.revision}` : ""}</span>
                  {detailHref ? (
                    <Link href={detailHref} className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-2 hover:underline">{item.title}<CtaSpinner /></Link>
                  ) : (
                    <span className="text-sm font-medium">{item.title}</span>
                  )}
                  <span className="ml-auto text-xs text-neutral-400"><Masa iso={item.updatedAt} /></span>
                  {chaining && (
                    <Link href={chaining.href} className="inline-flex min-h-11 items-center rounded-lg bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700">{chaining.label} →<CtaSpinner /></Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function detailHrefFor(item: WorkspaceBoardItem): string | null {
  if (item.kind === "social_post") return `/app/native-social-post/${item.artifactId}`;
  if (item.kind === "offer") return `/app/native-offer/${item.artifactId}`;
  if (item.kind === "whatsapp") return `/app/native-whatsapp/${item.artifactId}`;
  if (item.kind === "content_engine" && item.engineKind === "content_review") return `/app/content-review/${item.artifactId}`;
  if (item.kind === "content_engine" && item.engineKind === "content_create") return `/app/content-create/${item.artifactId}`;
  if (item.kind === "content_engine" && item.engineKind === "visual_packaging") return `/app/visual-plan/${item.artifactId}`;
  if (item.kind === "content_engine" && item.engineKind === "performance_learning") return `/app/performance/${item.artifactId}`;
  return null;
}
