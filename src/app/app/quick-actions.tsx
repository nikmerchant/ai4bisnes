import Link from "next/link";
import { CtaSpinner } from "@/app/cta-spinner";

/* Quick Actions — task-oriented grid replacing the old "Library Basic" first impression */
const KATEGORI = [
  {
    emoji: "🎬",
    nama: "Content",
    desc: "TikTok, Social Post, Reels",
    warna: "from-rose-500 to-pink-600",
    tugas: [
      { nama: "TikTok Script", href: "/app/pro" },
      { nama: "Social Media Post", href: "/app/pro" },
      { nama: "Hook Generator", href: "/app/pro" },
    ],
  },
  {
    emoji: "💬",
    nama: "Sales",
    desc: "WhatsApp, Follow-up, Closing",
    warna: "from-emerald-500 to-green-600",
    tugas: [
      { nama: "WhatsApp Reply", href: "/app/pro" },
      { nama: "Follow-up Pro spek", href: "/app/pro" },
      { nama: "Closing Script", href: "/app/max" },
    ],
  },
  {
    emoji: "📈",
    nama: "Marketing",
    desc: "Plan, Campaign, Persona",
    warna: "from-blue-500 to-cyan-600",
    tugas: [
      { nama: "Pek Kempen", href: "/app/pek" },
      { nama: "Marketing Plan", href: "/app/pek" },
      { nama: "Customer Persona", href: "/app/pro" },
    ],
  },
  {
    emoji: "✍️",
    nama: "Copywriting",
    desc: "Product, Iklan, Headline",
    warna: "from-amber-500 to-orange-600",
    tugas: [
      { nama: "Product Description", href: "/app/pro" },
      { nama: "Iklan FB/IG", href: "/app/pro" },
      { nama: "Headline", href: "/app/pro" },
    ],
  },
];

export function QuickActions() {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-bold">
        Apa yang anda mahu siapkan hari ini?
      </h2>
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
                  className={`rounded-full bg-gradient-to-r ${kat.warna} px-3 py-1.5 text-xs font-medium text-white transition-transform hover:scale-105 active:opacity-80`}
                >
                  {t.nama}
                  <CtaSpinner />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
