import { createClient } from "@/lib/supabase/server";
import { simpanProfil } from "@/app/actions";
import { SubmitButton } from "@/app/submit-button";

const inputCls =
  "rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

const PLATFORMS = [
  "WhatsApp",
  "Facebook",
  "Instagram",
  "TikTok",
  "Website",
  "Shopee",
  "Lazada",
  "Lain-lain",
];

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ ralat?: string }>;
}) {
  const { ralat } = await searchParams;
  const supabase = await createClient();

  const [{ data: categories }, { data: userData }] = await Promise.all([
    supabase.from("categories").select("id, name_ms").order("id"),
    supabase.auth.getUser(),
  ]);
  const { data: profil } = await supabase
    .from("profiles")
    .select(
      "business_name, category_id, products, target_customer, location, usp, tone_of_voice, main_competitors, price_range, platforms, website"
    )
    .eq("id", userData.user!.id)
    .single();

  const selectedPlatforms = (profil?.platforms || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ceritakan tentang bisnes anda</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Maklumat ini digunakan untuk menala setiap prompt khas untuk bisnes
          anda. Semakin lengkap, semakin tepat output AI.
        </p>
      </div>
      {ralat && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {ralat}
        </p>
      )}
      <form action={simpanProfil} className="flex flex-col gap-5">
        {/* ── MAKLUMAT ASAS ── */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-sm font-bold text-violet-600">
            Maklumat Asas
          </legend>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Nama bisnes *
            <input
              name="business_name"
              required
              defaultValue={profil?.business_name ?? ""}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Kategori bisnes *
            <select
              name="category_id"
              required
              defaultValue={profil?.category_id ?? ""}
              className={inputCls}
            >
              <option value="" disabled>
                — Pilih kategori —
              </option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ms}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Produk / servis utama
            <textarea
              name="products"
              rows={2}
              defaultValue={profil?.products ?? ""}
              placeholder="cth: Nasi lemak bungkus, katering majlis"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Pelanggan sasaran
            <input
              name="target_customer"
              defaultValue={profil?.target_customer ?? ""}
              placeholder="cth: Pekerja pejabat sekitar Shah Alam"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Lokasi
            <input
              name="location"
              defaultValue={profil?.location ?? ""}
              placeholder="cth: Shah Alam, Selangor"
              className={inputCls}
            />
          </label>
        </fieldset>

        {/* ── MAKLUMAT PEMASARAN ── */}
        <fieldset className="flex flex-col gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <legend className="mb-1 text-sm font-bold text-violet-600">
            Maklumat Pemasaran{" "}
            <span className="font-normal text-neutral-400">
              (opsyenal — tapi sangat berguna)
            </span>
          </legend>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Apa yang menjadikan bisnes anda unik? (USP)
            <textarea
              name="usp"
              rows={2}
              defaultValue={profil?.usp ?? ""}
              placeholder="cth: Nasi lemak dengan sambal rumah, bahan organik tempatan"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Gaya suara brand (tone)
            <select
              name="tone_of_voice"
              defaultValue={profil?.tone_of_voice ?? ""}
              className={inputCls}
            >
              <option value="">— Pilih gaya —</option>
              <option value="mesra">Mesra &amp; santai</option>
              <option value="profesional">Profesional</option>
              <option value="bersemangat">Bersemangat &amp; bertenaga</option>
              <option value="komedi">Lucu &amp; santai</option>
              <option value="mendidik">Mendidik &amp; informatif</option>
              <option value="mewah">Mewah &amp; eksklusif</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Pesaing utama
            <input
              name="main_competitors"
              defaultValue={profil?.main_competitors ?? ""}
              placeholder="cth: Kedai A, Kedai B (pisahkan dengan koma)"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Julat harga
            <input
              name="price_range"
              defaultValue={profil?.price_range ?? ""}
              placeholder="cth: RM5–RM15"
              className={inputCls}
            />
          </label>
        </fieldset>

        {/* ── PLATFORM ── */}
        <fieldset className="flex flex-col gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <legend className="mb-1 text-sm font-bold text-violet-600">
            Platform Jualan
          </legend>
          <p className="text-xs text-neutral-500">
            Pilih platform yang anda guna untuk menjual/market bisnes anda.
          </p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <label
                key={p}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selectedPlatforms.includes(p)
                    ? "border-violet-600 bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                <input
                  type="checkbox"
                  name="platforms"
                  value={p}
                  defaultChecked={selectedPlatforms.includes(p)}
                  className="accent-violet-600"
                />
                {p}
              </label>
            ))}
          </div>
          <input type="hidden" name="platforms_string" />
        </fieldset>

        {/* ── ONLINE ── */}
        <fieldset className="flex flex-col gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <legend className="mb-1 text-sm font-bold text-violet-600">
            Online Presence{" "}
            <span className="font-normal text-neutral-400">(opsyenal)</span>
          </legend>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Website (jika ada)
            <input
              name="website"
              type="url"
              defaultValue={profil?.website ?? ""}
              placeholder="https://bisnesanda.com"
              className={inputCls}
            />
          </label>
        </fieldset>

        <SubmitButton className="mt-2 rounded-full bg-violet-600 py-2.5 font-bold text-white transition-colors hover:bg-violet-700">
          Simpan &amp; Teruskan
        </SubmitButton>
      </form>
    </main>
  );
}
