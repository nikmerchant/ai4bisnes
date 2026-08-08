import { dapatkanProfil } from "./shared";
import type { Profil } from "./shared";

/* Profile Completion Score — gamifikasi ringan */
const FIELDS: { key: keyof Profil; label: string; points: number }[] = [
  { key: "business_name", label: "Nama Bisnes", points: 10 },
  { key: "category_id", label: "Kategori", points: 10 },
  { key: "products", label: "Produk/Servis", points: 10 },
  { key: "target_customer", label: "Pelanggan Sasaran", points: 10 },
  { key: "location", label: "Lokasi", points: 5 },
  { key: "usp", label: "USP", points: 15 },
  { key: "tone_of_voice", label: "Gaya Suara", points: 10 },
  { key: "main_competitors", label: "Pesaing", points: 10 },
  { key: "price_range", label: "Julat Harga", points: 5 },
  { key: "platforms", label: "Platform Jualan", points: 10 },
  { key: "website", label: "Website", points: 5 },
];

export function calcProfileScore(p: Profil): {
  pct: number;
  missing: string[];
} {
  let score = 0;
  const missing: string[] = [];

  for (const f of FIELDS) {
    const val = p[f.key];
    if (val && String(val).trim() && Number(val) !== 0) {
      score += f.points;
    } else {
      missing.push(f.label);
    }
  }

  return { pct: Math.min(100, score), missing };
}

export async function ProfileScore() {
  const { profil } = await dapatkanProfil();
  const { pct, missing } = calcProfileScore(profil);

  return (
    <div className="mb-6 rounded-2xl border-2 border-violet-200 bg-white p-4 dark:border-violet-900 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">
          🎯 Profil Bisnes: {pct}% lengkap
        </span>
        {pct < 100 && (
          <a
            href="/onboarding"
            className="text-xs font-medium text-violet-600 underline dark:text-violet-400"
          >
            Lengkapkan →
          </a>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${
            pct === 100
              ? "bg-gradient-to-r from-emerald-500 to-green-500"
              : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Missing fields */}
      {missing.length > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          Tinggal {missing.length} lagi: {missing.join(", ")}
        </p>
      )}
      {pct === 100 && (
        <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          ✅ Profil lengkap! AI akan faham bisnes anda lebih baik.
        </p>
      )}
    </div>
  );
}
