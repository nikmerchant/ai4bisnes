"use client";

import { useMemo, useState, useTransition } from "react";
import { simpanVault, toggleKegemaran } from "@/app/actions";

export type PromptItem = {
  id: number;
  title_ms: string;
  body_ms: string; // pembolehubah profil sudah diisi di server; [kurungan] kekal
  topic: string | null;
  tier: string;
};

const LABEL: Record<string, string> = {
  "pek-bulanan": "🎁 Pek Kempen Bulan Ini",
  umum: "Mula Di Sini",
  strategi: "Strategi Bisnes",
  "sumber-manusia": "Sumber Manusia",
  operasi: "Operasi",
  kewangan: "Kewangan",
  pemasaran: "Pemasaran",
  jualan: "Jualan",
  pelanggan: "Pelanggan",
  kepimpinan: "Kepimpinan",
  "undang-undang": "Undang-undang & Kontrak",
  "khas-kategori": "Khas Untuk Kategori Anda",
  ads: "Iklan (Pro)",
  social_media: "Media Sosial (Pro)",
  newsletter: "Newsletter & Emel (Pro)",
  copywriting: "Copywriting (Pro)",
  seo: "SEO (Pro)",
  lead_generation: "Lead Generation (Pro)",
  lead_nurturing: "Lead Nurturing (Pro)",
  sms: "SMS & WhatsApp (Pro)",
  ejen_affiliate: "Ejen & Affiliate (Pro)",
  coach: "Coach Max — Program Coaching (Max)",
};

const inputCls =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function salinTeks(teks: string) {
  return navigator.clipboard.writeText(teks);
}

async function salinDanBuka(teks: string, base: string) {
  await salinTeks(teks);
  // URL panjang boleh gagal — prompt panjang dibuka kosong (teks dah dalam clipboard)
  const url =
    teks.length <= 4000 ? `${base}?q=${encodeURIComponent(teks)}` : base;
  window.open(url, "_blank");
}

export function SalinBar({ teks }: { teks: string }) {
  const [copied, setCopied] = useState(false);
  const btn =
    "rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={async () => {
          await salinTeks(teks);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={btn}
      >
        {copied ? "Disalin ✓" : "Salin"}
      </button>
      <button
        type="button"
        onClick={() => salinDanBuka(teks, "https://chatgpt.com/")}
        className={btn}
      >
        Salin & Buka ChatGPT ↗
      </button>
      <button
        type="button"
        onClick={() => salinDanBuka(teks, "https://claude.ai/new")}
        className={btn}
      >
        Salin & Buka Claude ↗
      </button>
    </div>
  );
}

function ButangVault({
  p,
  teks,
  boleh,
}: {
  p: PromptItem;
  teks: string;
  boleh: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "done" | "fail">("idle");
  const btn =
    "rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";
  if (!boleh)
    return (
      <a href="/naik-taraf" className={btn}>
        🔒 Simpan ke Vault (Pro)
      </a>
    );
  return (
    <button
      type="button"
      onClick={async () => {
        const r = await simpanVault({
          title: p.title_ms,
          content: teks,
          promptId: p.id,
        });
        setStatus(r.ok ? "done" : "fail");
        setTimeout(() => setStatus("idle"), 2500);
      }}
      className={btn}
    >
      {status === "done"
        ? "Disimpan ke Vault ✓"
        : status === "fail"
          ? "Gagal simpan"
          : "🗄 Simpan ke Vault"}
    </button>
  );
}

function PromptCard({
  p,
  fav,
  onFav,
  bolehVault,
}: {
  p: PromptItem;
  fav: boolean;
  onFav: (id: number) => void;
  bolehVault: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  const blanks = useMemo(
    () => [
      ...new Set(
        [...p.body_ms.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1])
      ),
    ],
    [p.body_ms]
  );

  const teks = useMemo(
    () =>
      blanks.reduce(
        (t, b) => (values[b]?.trim() ? t.replaceAll(`[${b}]`, values[b]) : t),
        p.body_ms
      ),
    [p.body_ms, blanks, values]
  );

  const belumIsi = blanks.filter((b) => !values[b]?.trim()).length;

  return (
    <details className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <summary className="flex cursor-pointer items-center justify-between gap-2 font-medium">
        <span>{p.title_ms}</span>
        <button
          type="button"
          aria-label={fav ? "Buang dari kegemaran" : "Tambah ke kegemaran"}
          onClick={(e) => {
            e.preventDefault();
            onFav(p.id);
          }}
          className="text-lg leading-none"
        >
          {fav ? "★" : "☆"}
        </button>
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {blanks.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
            <p className="text-xs font-medium text-neutral-500">
              Lengkapkan prompt anda ({belumIsi} lagi):
            </p>
            {blanks.map((b) => (
              <label key={b} className="flex flex-col gap-1 text-xs">
                {b}
                <input
                  value={values[b] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [b]: e.target.value }))
                  }
                  className={inputCls}
                />
              </label>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">
          {teks}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SalinBar teks={teks} />
          <ButangVault p={p} teks={teks} boleh={bolehVault} />
        </div>
      </div>
    </details>
  );
}

export function Library({
  prompts,
  favIds,
  bolehVault,
}: {
  prompts: PromptItem[];
  favIds: number[];
  bolehVault: boolean;
}) {
  const [q, setQ] = useState("");
  const [favs, setFavs] = useState<Set<number>>(new Set(favIds));
  const [, startTransition] = useTransition();

  const onFav = (id: number) => {
    setFavs((s) => {
      const t = new Set(s);
      if (t.has(id)) t.delete(id);
      else t.add(id);
      return t;
    });
    startTransition(() => toggleKegemaran(id));
  };

  const ditapis = useMemo(() => {
    const cari = q.trim().toLowerCase();
    if (!cari) return prompts;
    return prompts.filter(
      (p) =>
        p.title_ms.toLowerCase().includes(cari) ||
        p.body_ms.toLowerCase().includes(cari) ||
        (LABEL[p.topic ?? "umum"] ?? "").toLowerCase().includes(cari)
    );
  }, [prompts, q]);

  const kumpulan = useMemo(() => {
    const m = new Map<string, PromptItem[]>();
    for (const p of ditapis) {
      const k = p.topic ?? "umum";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return m;
  }, [ditapis]);

  const kegemaran = ditapis.filter((p) => favs.has(p.id));

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Cari ${prompts.length} prompt...`}
        className={`mb-6 w-full ${inputCls}`}
      />

      {kegemaran.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">
            ★ Kegemaran{" "}
            <span className="text-sm font-normal text-neutral-400">
              ({kegemaran.length})
            </span>
          </h2>
          <div className="flex flex-col gap-3">
            {kegemaran.map((p) => (
              <PromptCard
                key={`f-${p.id}`}
                p={p}
                fav
                onFav={onFav}
                bolehVault={bolehVault}
              />
            ))}
          </div>
        </section>
      )}

      {ditapis.length === 0 && (
        <p className="text-sm text-neutral-500">
          Tiada prompt sepadan dengan carian anda.
        </p>
      )}

      {[...kumpulan.entries()].map(([topik, senarai]) => (
        <section key={topik} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">
            {LABEL[topik] ?? topik}{" "}
            <span className="text-sm font-normal text-neutral-400">
              ({senarai.length})
            </span>
          </h2>
          <div className="flex flex-col gap-3">
            {senarai.map((p) => (
              <PromptCard
                key={p.id}
                p={p}
                fav={favs.has(p.id)}
                onFav={onFav}
                bolehVault={bolehVault}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
