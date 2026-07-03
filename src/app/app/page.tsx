import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { keluar } from "@/app/actions";
import { Library, type PromptItem } from "./library";

type Profil = {
  business_name: string;
  products: string;
  target_customer: string;
  location: string;
  tier: string;
  onboarded: boolean;
  category_id: number | null;
  categories: { name_ms: string } | null;
};

function isiPrompt(body: string, p: Profil) {
  return body
    .replaceAll("{nama_bisnes}", p.business_name || "bisnes saya")
    .replaceAll("{kategori}", p.categories?.name_ms ?? "")
    .replaceAll("{produk}", p.products || "produk/servis kami")
    .replaceAll("{sasaran}", p.target_customer || "pelanggan kami")
    .replaceAll("{lokasi}", p.location || "Malaysia");
}

const PANGKAT: Record<string, number> = { basic: 0, pro: 1, max: 2 };

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // turunkan taraf secara automatik jika langganan tamat
  await supabase.rpc("semak_langganan");

  const { data: profil } = await supabase
    .from("profiles")
    .select(
      "business_name, products, target_customer, location, tier, onboarded, category_id, categories(name_ms)"
    )
    .eq("id", user!.id)
    .single<Profil>();

  if (!profil?.onboarded) redirect("/onboarding");

  // RLS di Supabase yang menapis prompt ikut tier pengguna;
  // tapisan kategori: prompt umum (null) + prompt khas kategori pengguna
  const base = supabase
    .from("prompts")
    .select("id, title_ms, body_ms, topic, tier, pack_id")
    .order("id");
  const teaserBase = supabase.rpc("prompts_teaser").order("id");
  const [{ data: prompts }, { data: favRows }, { data: teaser }, { data: pek }] =
    await Promise.all([
      profil.category_id
        ? base.or(`category_id.is.null,category_id.eq.${profil.category_id}`)
        : base.is("category_id", null),
      supabase.from("favorites").select("prompt_id").eq("user_id", user!.id),
      profil.category_id
        ? teaserBase.or(
            `category_id.is.null,category_id.eq.${profil.category_id}`
          )
        : teaserBase.is("category_id", null),
      supabase.rpc("pek_semasa").maybeSingle(),
    ]);

  // buang prompt pek bulan lepas; kekalkan pek bulan ini + prompt biasa
  const pekId = (pek as { id: number } | null)?.id;
  const relevan = (p: { pack_id: number | null }) =>
    p.pack_id === null || p.pack_id === pekId;

  const items: PromptItem[] = (prompts ?? []).filter(relevan).map((p) => ({
    ...p,
    body_ms: isiPrompt(p.body_ms, profil),
  }));
  const favIds = (favRows ?? []).map((r) => r.prompt_id);

  // prompt yang wujud dalam teaser tapi tidak dalam senarai boleh-akses = terkunci
  const bolehAkses = new Set((prompts ?? []).map((p) => p.id));
  type Teaser = {
    id: number;
    title_ms: string;
    topic: string | null;
    tier: string;
    pack_id: number | null;
  };
  const terkunci = ((teaser ?? []) as Teaser[]).filter(
    (t) => !bolehAkses.has(t.id) && relevan(t)
  );
  const kunciPro = terkunci.filter((t) => t.tier === "pro");
  const kunciMax = terkunci.filter((t) => t.tier === "max");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{profil.business_name}</h1>
          <p className="text-sm text-neutral-500">
            {profil.categories?.name_ms} ·{" "}
            <span className="font-medium uppercase">{profil.tier}</span> ·{" "}
            <Link href="/onboarding" className="underline">
              Kemaskini profil
            </Link>
            {" "}
            ·{" "}
            <Link href="/app/vault" className="underline">
              🗄 Vault
            </Link>
            {profil.tier !== "max" && (
              <>
                {" "}
                ·{" "}
                <Link href="/naik-taraf" className="font-medium underline">
                  Naik taraf ↑
                </Link>
              </>
            )}
          </p>
        </div>
        <form action={keluar}>
          <button className="text-sm text-neutral-500 underline">
            Log keluar
          </button>
        </form>
      </header>

      <Link
        href="/app/ajar-ai"
        className="mb-8 block rounded-xl bg-violet-600 p-4 text-white transition-colors hover:bg-violet-700"
      >
        <span className="font-semibold">🎓 Ajar AI Anda</span>
        <span className="mt-1 block text-sm opacity-80">
          Dapatkan Arahan Induk yang siap diisi maklumat bisnes anda — tampal
          sekali, dan Claude/ChatGPT terus faham bisnes anda dalam setiap chat.
        </span>
      </Link>

      <Library
        prompts={items}
        favIds={favIds}
        bolehVault={PANGKAT[profil.tier] >= 1}
      />

      {[
        { senarai: kunciPro, nama: "Pro", perlu: "pro" },
        { senarai: kunciMax, nama: "Max (Coach)", perlu: "max" },
      ]
        .filter(
          (k) =>
            k.senarai.length > 0 &&
            PANGKAT[profil.tier] < PANGKAT[k.perlu]
        )
        .map((k) => (
          <section
            key={k.nama}
            className="mb-8 rounded-2xl border border-dashed border-neutral-300 p-5 dark:border-neutral-700"
          >
            <h2 className="text-lg font-semibold">
              🔒 {k.senarai.length} prompt {k.nama} menanti anda
            </h2>
            <ul className="mt-3 grid gap-1 text-sm text-neutral-500 sm:grid-cols-2">
              {k.senarai.slice(0, 12).map((t) => (
                <li key={t.id}>🔒 {t.title_ms}</li>
              ))}
            </ul>
            {k.senarai.length > 12 && (
              <p className="mt-2 text-sm text-neutral-400">
                ... dan {k.senarai.length - 12} lagi
              </p>
            )}
            <Link
              href="/naik-taraf"
              className="mt-4 inline-block rounded-full bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700"
            >
              Buka dengan {k.nama} →
            </Link>
          </section>
        ))}
    </main>
  );
}
