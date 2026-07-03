import { createClient } from "@/lib/supabase/server";
import { simpanProfil } from "@/app/actions";

const inputCls =
  "rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

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
    .select("business_name, category_id, products, target_customer, location")
    .eq("id", userData.user!.id)
    .single();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold">Ceritakan tentang bisnes anda</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Maklumat ini digunakan untuk menala setiap prompt khas untuk bisnes
          anda.
        </p>
      </div>
      {ralat && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {ralat}
        </p>
      )}
      <form action={simpanProfil} className="flex flex-col gap-4">
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
        <button
          type="submit"
          className="mt-2 rounded-full bg-violet-600 py-2.5 font-bold text-white transition-colors hover:bg-violet-700"
        >
          Simpan &amp; Teruskan
        </button>
      </form>
    </main>
  );
}
