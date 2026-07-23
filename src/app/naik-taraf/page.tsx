import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { mulaBayar } from "@/app/actions";
import { CtaSpinner } from "@/app/cta-spinner";
import { SubmitButton } from "@/app/submit-button";
import { HARGA, NAMA_TIER } from "@/lib/harga";

const CIRI: Record<string, string[]> = {
  basic: [
    "Library prompt asas ditala bisnes anda",
    "Prompt khas kategori bisnes anda",
    "Modul Ajar AI Anda (Arahan Induk)",
    "Carian & kegemaran",
  ],
  pro: [
    "Semua dalam Basic",
    "Library Pro: iklan, media sosial, newsletter, copywriting, SEO",
    "Lead generation & nurturing, SMS/WhatsApp, ejen & affiliate",
    "Pek Kempen Bulanan ikut kalendar Malaysia",
  ],
  max: [
    "Semua dalam Pro",
    "Coach Max: program coaching pemasaran 12 sesi + diagnostik",
    "Bina Grand Slam Offer, skrip closing & money model penuh",
    "Audit semula setiap suku tahun",
  ],
};

function KadTier({
  tier,
  semasa,
}: {
  tier: "basic" | "pro" | "max";
  semasa: string;
}) {
  const aktif = semasa === tier;
  const boleliBeli = tier !== "basic" && !aktif && semasa !== "max";
  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 ${
        tier === "max"
          ? "border-2 border-violet-600"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <h2 className="text-lg font-bold">{NAMA_TIER[tier]}</h2>
      <p className="mt-1 text-2xl font-bold">
        {tier === "basic" ? (
          "Percuma"
        ) : (
          <>
            RM{HARGA[tier].bulanan}
            <span className="text-sm font-normal text-neutral-500">
              /bulan
            </span>
          </>
        )}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
        {CIRI[tier].map((c) => (
          <li key={c}>✓ {c}</li>
        ))}
      </ul>
      {aktif && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="rounded-lg bg-neutral-100 py-2 text-center text-sm font-medium dark:bg-neutral-900">
            Pelan semasa anda
          </p>
          {tier !== "basic" && (
            <a
              href="/api/stripe/portal"
              className="block w-full rounded-full border border-neutral-300 py-2.5 text-center text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Urus Langganan (Portal Stripe)
            </a>
          )}
        </div>
      )}
      {boleliBeli && (
        <div className="mt-4 flex flex-col gap-2">
          <form action={mulaBayar}>
            <input type="hidden" name="tier" value={tier} />
            <input type="hidden" name="period" value="bulanan" />
            <SubmitButton className="w-full rounded-full bg-violet-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700">
              Langgan Bulanan — RM{HARGA[tier].bulanan}
            </SubmitButton>
          </form>
          <form action={mulaBayar}>
            <input type="hidden" name="tier" value={tier} />
            <input type="hidden" name="period" value="tahunan" />
            <SubmitButton className="w-full rounded-full bg-zinc-800 py-2.5 text-sm font-bold text-white ring-1 ring-white/10 transition-colors hover:bg-zinc-700">
              Tahunan — RM{HARGA[tier].tahunan}{" "}
              <span className="font-normal opacity-70">(jimat 2 bulan)</span>
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function NaikTaraf({
  searchParams,
}: {
  searchParams: Promise<{ ralat?: string; status_id?: string }>;
}) {
  const { ralat, status_id } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user!.id)
    .single();
  const semasa = profil?.tier ?? "basic";

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <p className="mb-2 text-sm">
        <Link
          href="/app"
          className="rounded px-0.5 text-neutral-500 underline active:opacity-70"
        >
          ← Kembali ke library
          <CtaSpinner />
        </Link>
      </p>
      <h1 className="text-2xl font-bold">Naik Taraf</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Harga founding member — kadar anda{" "}
        <strong>dikunci selama-lamanya</strong> selagi langganan aktif, walaupun
        harga baharu naik nanti.
      </p>

      {status_id === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Pembayaran diterima! Akaun anda dinaik taraf secara automatik dalam
          beberapa saat — muat semula halaman ini.
        </p>
      )}
      {status_id && status_id !== "1" && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Pembayaran tidak selesai. Tiada caj dikenakan — cuba lagi bila sedia.
        </p>
      )}
      {ralat && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {ralat}
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <KadTier tier="basic" semasa={semasa} />
        <KadTier tier="pro" semasa={semasa} />
        <KadTier tier="max" semasa={semasa} />
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        Pembayaran selamat melalui Stripe (kad kredit & FPX). Langganan
        boleh dibatalkan bila-bila masa — akses kekal sehingga tamat tempoh yang
        dibayar. Caj akan dikenakan secara automatik setiap bulan/tahun.
      </p>
    </main>
  );
}
