import Link from "next/link";
import { redirect } from "next/navigation";
import { Library, type PromptItem } from "../library";
import { dapatkanProfil, isiPrompt, PANGKAT } from "../shared";

export default async function LibraryMax() {
  const { supabase, user, profil } = await dapatkanProfil();
  if (PANGKAT[profil.tier] < 2) redirect("/naik-taraf");

  const [{ data: prompts }, { data: favRows }] = await Promise.all([
    supabase
      .from("prompts")
      .select("id, title_ms, body_ms, topic, tier, pack_id")
      .eq("tier", "max")
      .order("id"),
    supabase.from("favorites").select("prompt_id").eq("user_id", user.id),
  ]);

  const items: PromptItem[] = (prompts ?? []).map((p) => ({
    ...p,
    body_ms: isiPrompt(p.body_ms, profil),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <p className="mb-2 text-sm">
        <Link href="/app" className="text-neutral-500 underline">
          ← Kembali ke dashboard
        </Link>
      </p>
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">
        🏆 Coach <span className="text-violet-600">Max</span>
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Program coaching pemasaran 12 sesi + diagnostik, berasaskan rangka
        $100M — setiap sesi menukar Claude/ChatGPT menjadi coach peribadi yang
        kenal {profil.business_name}.
      </p>

      <div className="mt-6 mb-8 rounded-xl border-2 border-violet-600 p-4 text-sm">
        <p className="font-bold">Cara guna program ini:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-600 dark:text-neutral-300">
          <li>
            Mulakan dengan <strong>Sesi Diagnostik</strong> — coach akan susun
            turutan sesi ikut keadaan bisnes anda
          </li>
          <li>Satu sesi seminggu — jangan tergesa, siapkan kerja rumah</li>
          <li>
            Selepas Sesi 12, kembali ke Diagnostik setiap suku tahun untuk
            audit semula
          </li>
        </ol>
      </div>

      <Library
        prompts={items}
        favIds={(favRows ?? []).map((r) => r.prompt_id)}
        bolehVault
      />
    </main>
  );
}
