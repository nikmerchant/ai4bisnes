import Link from "next/link";
import { redirect } from "next/navigation";
import { CtaSpinner } from "@/app/cta-spinner";
import { Library, type PromptItem } from "../library";
import { dapatkanProfil, isiPrompt, PANGKAT } from "../shared";

export default async function LibraryPro() {
  const { supabase, user, profil } = await dapatkanProfil();
  if (PANGKAT[profil.tier] < 1) redirect("/naik-taraf");

  const base = supabase
    .from("prompts")
    .select("id, title_ms, body_ms, topic, tier, pack_id")
    .eq("tier", "pro")
    .is("pack_id", null) // pek bulanan ada halaman sendiri
    .order("id");
  const [{ data: prompts }, { data: favRows }] = await Promise.all([
    profil.category_id
      ? base.or(`category_id.is.null,category_id.eq.${profil.category_id}`)
      : base.is("category_id", null),
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
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">
        ⚡ Library <span className="text-violet-600">Pro</span>
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Iklan, copywriting, emel, lead generation dan banyak lagi — semuanya
        ditala untuk {profil.business_name}.
      </p>

      <Link
        href="/app/pek"
        className="mt-6 mb-8 block rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 p-4 text-white transition-transform hover:scale-[1.01] active:opacity-90"
      >
        <span className="font-bold">
          🎁 Pek Kempen Bulan Ini
          <CtaSpinner />
        </span>
        <span className="ml-2 text-sm text-white/80">
          Kempen siap-guna bulan ini — buka →
        </span>
      </Link>

      <Library
        prompts={items}
        favIds={(favRows ?? []).map((r) => r.prompt_id)}
        bolehVault
      />
    </main>
  );
}
