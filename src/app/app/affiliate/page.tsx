import { createClient } from "@/lib/supabase/server";
import { CtaSpinner } from "@/app/cta-spinner";
import Link from "next/link";
import { SalinBar } from "../library";

export default async function Affiliate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profil }, { data: komisen }] = await Promise.all([
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("affiliate_commissions")
      .select("id, amount_rm, status, created_at")
      .eq("referrer_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  const rows = komisen ?? [];
  const jumlahEarned = rows
    .filter((r) => r.status === "earned")
    .reduce((s, r) => s + Number(r.amount_rm), 0);
  const jumlahPaid = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.amount_rm), 0);
  const pautan = `https://ai4bisnes.com/?ref=${profil?.referral_code ?? ""}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <p className="mb-2 text-sm">
        <Link
          href="/app"
          className="rounded px-0.5 text-neutral-500 underline active:opacity-70"
        >
          ← Kembali ke library
          <CtaSpinner />
        </Link>
      </p>
      <h1 className="text-2xl font-bold">🤝 Program Affiliate</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Kongsi pautan anda — dapat 20% komisen berulang setiap bulan orang
        yang anda rujuk terus melanggan Pro atau Max.
      </p>

      <div className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase text-neutral-500">
          Pautan rujukan anda
        </p>
        <p className="mt-1 break-all font-mono text-sm">{pautan}</p>
        <div className="mt-3">
          <SalinBar teks={pautan} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-violet-50 p-4 dark:bg-violet-950">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Komisen tertunggak
          </p>
          <p className="mt-1 text-2xl font-extrabold text-violet-700 dark:text-violet-300">
            RM{jumlahEarned.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Sudah dibayar
          </p>
          <p className="mt-1 text-2xl font-extrabold">
            RM{jumlahPaid.toFixed(2)}
          </p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Sejarah rujukan</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Belum ada rujukan lagi. Kongsi pautan anda di atas untuk mula.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800"
            >
              <span className="text-neutral-500">
                {new Date(r.created_at).toLocaleDateString("ms-MY")}
              </span>
              <span className="font-medium">RM{Number(r.amount_rm).toFixed(2)}</span>
              <span className="text-xs uppercase text-neutral-400">
                {r.status === "paid" ? "Dibayar" : "Tertunggak"}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
