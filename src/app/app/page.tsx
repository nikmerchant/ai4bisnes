import Link from "next/link";
import { keluar } from "@/app/actions";
import { CtaSpinner } from "@/app/cta-spinner";
import { SubmitButton } from "@/app/submit-button";
import { Library, type PromptItem } from "./library";
import { dapatkanProfil, isiPrompt, PANGKAT } from "./shared";

function KadAkses({
  emoji,
  nama,
  desc,
  isi,
  kiraan,
  ada,
  href,
  gelap,
}: {
  emoji: string;
  nama: string;
  desc: string;
  isi: string[];
  kiraan: string;
  ada: boolean;
  href: string;
  gelap?: boolean;
}) {
  const asas = gelap
    ? "bg-zinc-950 text-white ring-2 ring-violet-600"
    : "bg-gradient-to-br from-violet-600 to-violet-800 text-white";

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl p-6 ${asas}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold uppercase tracking-tight">
          {emoji} {nama}
        </h2>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
          {kiraan}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/80">{desc}</p>
      <ul
        className={`mt-4 flex-1 space-y-1.5 text-sm text-white/90 ${
          ada ? "" : "select-none blur-[2px]"
        }`}
        aria-hidden={!ada}
      >
        {isi.map((x) => (
          <li key={x}>✓ {x}</li>
        ))}
      </ul>
      {ada ? (
        <Link
          href={href}
          className="mt-5 inline-block rounded-full bg-white px-6 py-2.5 text-center text-sm font-bold text-violet-700 transition-transform hover:scale-[1.02] active:opacity-80"
        >
          Masuk →<CtaSpinner />
        </Link>
      ) : (
        <div className="mt-5 flex flex-col gap-1.5">
          <Link
            href="/naik-taraf"
            className="inline-block rounded-full bg-white px-6 py-2.5 text-center text-sm font-bold text-violet-700 transition-transform hover:scale-[1.02] active:opacity-80"
          >
            🔒 Naik Taraf untuk Buka
            <CtaSpinner />
          </Link>
          <p className="text-center text-xs text-white/60">
            dari RM49/bulan · batal bila-bila masa
          </p>
        </div>
      )}
    </div>
  );
}

export default async function Dashboard() {
  const { supabase, user, profil } = await dapatkanProfil();
  const pangkat = PANGKAT[profil.tier];

  const base = supabase
    .from("prompts")
    .select("id, title_ms, body_ms, topic, tier, pack_id")
    .eq("tier", "basic")
    .order("id");
  const teaserBase = supabase.rpc("prompts_teaser").order("id");
  const [{ data: prompts }, { data: favRows }, { data: teaser }, { data: pek }] =
    await Promise.all([
      profil.category_id
        ? base.or(`category_id.is.null,category_id.eq.${profil.category_id}`)
        : base.is("category_id", null),
      supabase.from("favorites").select("prompt_id").eq("user_id", user.id),
      profil.category_id
        ? teaserBase.or(
            `category_id.is.null,category_id.eq.${profil.category_id}`
          )
        : teaserBase.is("category_id", null),
      supabase.rpc("pek_semasa_awam").maybeSingle<{ title_ms: string }>(),
    ]);

  const items: PromptItem[] = (prompts ?? []).map((p) => ({
    ...p,
    body_ms: isiPrompt(p.body_ms, profil),
  }));
  const favIds = (favRows ?? []).map((r) => r.prompt_id);

  type Teaser = { id: number; tier: string; pack_id: number | null };
  const t = (teaser ?? []) as Teaser[];
  const kiraPro = t.filter((x) => x.tier === "pro" && x.pack_id === null).length;
  const kiraMax = t.filter((x) => x.tier === "max").length;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{profil.business_name}</h1>
          <p className="text-sm text-neutral-500">
            {profil.categories?.name_ms} ·{" "}
            <span className="font-medium uppercase">{profil.tier}</span> ·{" "}
            <Link
              href="/onboarding"
              className="rounded px-0.5 underline active:opacity-70"
            >
              Kemaskini profil
              <CtaSpinner />
            </Link>{" "}
            ·{" "}
            <Link
              href="/app/vault"
              className="rounded px-0.5 underline active:opacity-70"
            >
              🗄 Vault
              <CtaSpinner />
            </Link>{" "}
            ·{" "}
            <Link
              href="/app/affiliate"
              className="rounded px-0.5 underline active:opacity-70"
            >
              🤝 Affiliate
              <CtaSpinner />
            </Link>
            {profil.tier !== "max" && (
              <>
                {" "}
                ·{" "}
                <Link
                  href="/naik-taraf"
                  className="rounded px-0.5 font-medium underline active:opacity-70"
                >
                  Naik taraf ↑
                  <CtaSpinner />
                </Link>
              </>
            )}
          </p>
        </div>
        <form action={keluar}>
          <SubmitButton className="text-sm text-neutral-500 underline">
            Log keluar
          </SubmitButton>
        </form>
      </header>

      {/* VIDEO PANDUAN */}
      <details className="mb-6 rounded-2xl border-2 border-violet-600 p-4">
        <summary className="cursor-pointer font-semibold">
          🎬 Baru di sini? Tonton panduan langkah demi langkah (3 minit)
        </summary>
        <video
          controls
          preload="metadata"
          className="mt-4 w-full rounded-xl"
        >
          <source src="/video/tutorial.mp4" type="video/mp4" />
        </video>
      </details>

      {/* BANNER PEK KEMPEN BULAN INI */}
      <Link
        href={pangkat >= 1 ? "/app/pek" : "/naik-taraf"}
        className="mb-6 block overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-600 p-5 text-white transition-transform hover:scale-[1.01] active:opacity-90"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold uppercase text-violet-700">
              🎁 Bulan Ini
            </span>
            <p className="mt-2 text-lg font-extrabold">
              {pek?.title_ms ?? "Pek Kempen Bulanan"}
            </p>
            <p className="text-sm text-white/80">
              {pangkat >= 1
                ? "Kempen siap-guna bulan ini menanti anda — strategi, post, iklan, emel & WhatsApp."
                : "Kempen siap-guna setiap bulan ikut kalendar Malaysia — eksklusif ahli Pro."}
            </p>
          </div>
          <span className="flex shrink-0 items-center rounded-full bg-white px-5 py-2 text-sm font-bold text-violet-700">
            {pangkat >= 1 ? "Buka Pek →" : "🔒 Pro"}
            <CtaSpinner />
          </span>
        </div>
      </Link>

      {/* KAD AKSES PRO & MAX */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <KadAkses
          emoji="⚡"
          nama="Pro"
          desc="Library pemasaran penuh untuk bisnes yang nak berkembang."
          isi={[
            "Iklan FB/IG/TikTok & copywriting",
            "Newsletter, emel & SMS/WhatsApp",
            "Lead generation & nurturing",
            "SEO & ejen/affiliate",
          ]}
          kiraan={`${kiraPro || 58}+ prompt`}
          ada={pangkat >= 1}
          href="/app/pro"
        />
        <KadAkses
          emoji="🏆"
          nama="Max"
          desc="Coach Max — coach pemasaran peribadi berasaskan rangka $100M."
          isi={[
            "Sesi diagnostik bisnes anda",
            "12 sesi coaching berstruktur",
            "Grand Slam Offer & skrip closing",
            "Audit semula setiap suku tahun",
          ]}
          kiraan={`${kiraMax || 13} sesi`}
          ada={pangkat >= 2}
          href="/app/max"
          gelap
        />
      </div>

      <Link
        href="/app/ajar-ai"
        className="mb-8 block rounded-xl border-2 border-violet-600 p-4 transition-colors hover:bg-violet-50 active:opacity-80 dark:hover:bg-violet-950"
      >
        <span className="font-semibold">
          🎓 Ajar AI Anda
          <CtaSpinner />
        </span>
        <span className="mt-1 block text-sm text-neutral-500">
          Arahan Induk siap diisi maklumat bisnes anda — tampal sekali, dan
          Claude/ChatGPT terus faham bisnes anda dalam setiap chat.
        </span>
      </Link>

      <h2 className="mb-4 text-lg font-bold">Library Basic Anda</h2>
      <Library
        prompts={items}
        favIds={favIds}
        bolehVault={pangkat >= 1}
      />
    </main>
  );
}
