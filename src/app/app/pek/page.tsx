import Link from "next/link";
import { redirect } from "next/navigation";
import { CtaSpinner } from "@/app/cta-spinner";
import { Library, type PromptItem } from "../library";
import { dapatkanProfil, isiPrompt, PANGKAT } from "../shared";

export default async function PekBulanIni() {
  const { supabase, user, profil } = await dapatkanProfil();
  if (PANGKAT[profil.tier] < 1) redirect("/naik-taraf");

  const bulanIni = new Date().toISOString().slice(0, 7);
  const { data: pek } = await supabase
    .from("campaign_packs")
    .select("id, title_ms, intro_ms")
    .eq("bulan", bulanIni)
    .maybeSingle();

  const [{ data: prompts }, { data: favRows }] = await Promise.all([
    pek
      ? supabase
          .from("prompts")
          .select("id, title_ms, body_ms, topic, tier, pack_id")
          .eq("pack_id", pek.id)
          .order("id")
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("favorites").select("prompt_id").eq("user_id", user.id),
  ]);

  const items: PromptItem[] = (prompts ?? []).map((p) => ({
    ...p,
    body_ms: isiPrompt(p.body_ms, profil),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <p className="mb-2 text-sm">
        <Link
          href="/app"
          className="rounded px-0.5 text-neutral-500 underline active:opacity-70"
        >
          ← Kembali ke dashboard
          <CtaSpinner />
        </Link>
      </p>

      {pek ? (
        <>
          <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold uppercase text-white">
            🎁 Pek Bulan Ini
          </span>
          <h1 className="mt-3 text-2xl font-extrabold uppercase tracking-tight">
            {pek.title_ms}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">{pek.intro_ms}</p>
          <p className="mt-1 text-xs text-neutral-400">
            Pek baharu setiap 1 haribulan — gunakan sebelum ia bertukar!
          </p>
          <div className="mt-8">
            <Library
              prompts={items}
              favIds={(favRows ?? []).map((r) => r.prompt_id)}
              bolehVault
            />
          </div>
        </>
      ) : (
        <p className="mt-10 rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Pek bulan ini sedang disediakan — kembali sebentar lagi.
        </p>
      )}
    </main>
  );
}
