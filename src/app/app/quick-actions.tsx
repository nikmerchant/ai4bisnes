import Link from "next/link";

/* Tier badge — kecil, sebelah nama tugas */
function TierBadge({ tier }: { tier: "basic" | "pro" | "max" }) {
  if (tier === "basic") return null;
  const style =
    tier === "max"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
      : "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300";
  const emoji = tier === "max" ? "🏆" : "⚡";
  return (
    <span
      className={`ml-1 inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[10px] font-bold leading-none ${style}`}
    >
      {emoji} {tier === "max" ? "MAX" : "PRO"}
    </span>
  );
}

/* Quick Actions — task-oriented grid linking to wizard */
const KATEGORI = [
  {
    emoji: "🎬",
    nama: "Content",
    desc: "TikTok, Social Post, Reels",
    warna: "from-rose-500 to-pink-600",
    tugas: [
      { nama: "TikTok Script", href: "/app/wizard/tiktok-script", tier: "pro" as const },
      { nama: "Social Media Post", href: "/app/wizard/social-post", tier: "pro" as const },
      { nama: "Hook Generator", href: "/app/wizard/social-post", tier: "pro" as const },
    ],
  },
  {
    emoji: "💬",
    nama: "Sales",
    desc: "WhatsApp, Follow-up, Closing",
    warna: "from-emerald-500 to-green-600",
    tugas: [
      { nama: "WhatsApp Reply", href: "/app/wizard/whatsapp-reply", tier: "pro" as const },
      { nama: "Objection Handler", href: "/app/wizard/objection-handler", tier: "pro" as const },
      { nama: "Closing Script", href: "/app/wizard/closing-script", tier: "max" as const },
    ],
  },
  {
    emoji: "📈",
    nama: "Marketing",
    desc: "Plan, Offer, Persona",
    warna: "from-blue-500 to-cyan-600",
    tugas: [
      { nama: "Offer Generator", href: "/app/wizard/offer-generator", tier: "pro" as const },
      { nama: "Customer Persona", href: "/app/wizard/customer-persona", tier: "pro" as const },
      { nama: "Kalendar Kandungan", href: "/app/content-calendar", tier: "max" as const },
      { nama: "Campaign Generator", href: "/app/wizard/campaign-generator", tier: "max" as const },
    ],
  },
  {
    emoji: "✍️",
    nama: "Copywriting",
    desc: "Product, Iklan, Headline",
    warna: "from-amber-500 to-orange-600",
    tugas: [
      { nama: "Product Description", href: "/app/wizard/product-desc", tier: "pro" as const },
      { nama: "Iklan FB/IG", href: "/app/wizard/ad-copy", tier: "pro" as const },
      { nama: "Headline", href: "/app/wizard/product-desc", tier: "pro" as const },
    ],
  },
];

export function QuickActions() {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          Apa yang anda mahu siapkan hari ini?
        </h2>
        <Link
          href="/app/wizard"
          className="text-xs font-medium text-violet-600 underline dark:text-violet-400"
        >
          Semua tugasan →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {KATEGORI.map((kat) => (
          <div
            key={kat.nama}
            className="rounded-2xl border-2 border-zinc-200 bg-white p-4 transition-colors dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{kat.emoji}</span>
              <div>
                <h3 className="font-bold">{kat.nama}</h3>
                <p className="text-xs text-neutral-500">{kat.desc}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {kat.tugas.map((t) => (
                <Link
                  key={t.nama}
                  href={t.href}
                  className={`inline-flex items-center rounded-full bg-gradient-to-r ${kat.warna} px-3 py-1.5 text-xs font-medium text-white transition-transform hover:scale-105 active:opacity-80`}
                >
                  {t.nama}
                  <TierBadge tier={t.tier} />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
