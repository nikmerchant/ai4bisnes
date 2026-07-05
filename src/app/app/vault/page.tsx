import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { padamVault } from "@/app/actions";
import { CtaSpinner } from "@/app/cta-spinner";
import { SubmitButton } from "@/app/submit-button";
import { SalinBar } from "../library";

export default async function Vault() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: items }, { data: profil }] = await Promise.all([
    supabase
      .from("vault_items")
      .select("id, title, content, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("tier").eq("id", user!.id).single(),
  ]);

  const bolehSimpan = profil?.tier === "pro" || profil?.tier === "max";

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
      <h1 className="text-2xl font-bold">🗄 Vault Bisnes Saya</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Prompt yang anda lengkapkan dan simpan — otak pemasaran bisnes anda,
        kekal di sini setiap kali anda perlukannya semula.
      </p>

      {!bolehSimpan && (
        <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          Langganan anda tidak aktif — simpanan lama masih boleh dibaca dan
          disalin, tetapi untuk menyimpan item baharu,{" "}
          <Link
            href="/naik-taraf"
            className="rounded px-0.5 font-medium underline active:opacity-70"
          >
            aktifkan semula Pro
            <CtaSpinner />
          </Link>
          .
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {(items ?? []).length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            Vault anda kosong. Buka mana-mana prompt di library, lengkapkan
            tempat kosong, dan tekan <strong>🗄 Simpan ke Vault</strong>.
          </p>
        )}
        {(items ?? []).map((v) => (
          <details
            key={v.id}
            className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <summary className="cursor-pointer font-medium">
              {v.title}{" "}
              <span className="text-xs font-normal text-neutral-400">
                · {new Date(v.created_at).toLocaleDateString("ms-MY")}
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">
                {v.content}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <SalinBar teks={v.content} />
                <form action={padamVault.bind(null, v.id)}>
                  <SubmitButton className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950">
                    Padam
                  </SubmitButton>
                </form>
              </div>
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
