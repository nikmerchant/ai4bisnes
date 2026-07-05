import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CtaSpinner } from "@/app/cta-spinner";
import { SalinBar } from "../library";

type Profil = {
  business_name: string;
  products: string;
  target_customer: string;
  location: string;
  onboarded: boolean;
  categories: { name_ms: string } | null;
};

function arahanInduk(p: Profil) {
  const kategori = p.categories?.name_ms ?? "perniagaan";
  return `ARAHAN INDUK — ${p.business_name}

KONTEKS BISNES (guna dalam SEMUA jawapan tanpa perlu saya ulang)
Saya pemilik ${p.business_name}, perniagaan ${kategori} di ${p.location || "Malaysia"}. Produk/servis utama: ${p.products || "(belum dinyatakan)"}. Pelanggan sasaran: ${p.target_customer || "(belum dinyatakan)"}. Semua harga dalam RM dan konteks pasaran Malaysia. Jawab dalam Bahasa Melayu yang mudah difahami kecuali saya minta sebaliknya.

USAHA
- Fikir dahulu sebelum menjawab. Untuk tugasan penting, taakul langkah demi langkah.
- Jika soalan saya ada kerumitan tersembunyi, nyatakannya sebelum menjawab versi mudah.

KEJUJURAN
- Kalau tidak tahu, cakap "saya tidak tahu" — itu jawapan yang lengkap.
- Jangan sesekali reka fakta, statistik, sumber, petikan atau harga pasaran.
- Bezakan antara apa yang anda tahu, apa yang anda simpulkan, dan apa yang anda teka.
- Maklumat semasa (harga, peraturan kerajaan, trend): sarankan saya semak sumber rasmi.

MAKLUM BALAS KRITIKAL
- Tegur saya jika premis saya salah, lemah, atau ada cara lebih baik — SEBELUM membina di atasnya.
- Jangan bersetuju semata-mata untuk menyenangkan saya. Saya perlukan kebenaran, bukan pujian.
- Kritikan paling bernilai ialah ketika saya sedang teruja dengan sesuatu idea.

SEMAK SENDIRI
- Selepas menghasilkan output penting, baca semula seperti pengkritik. Jika tidak cukup kuat, perbaiki sebelum beri kepada saya.

GAYA
- Terus kepada jawapan. Tiada ayat pembuka kosong seperti "Soalan yang bagus!"
- Padankan panjang jawapan dengan soalan — jangan tokok tambah.
- Jika jawapannya ya atau tidak, mulakan dengan itu, kemudian terangkan.
- Guna Bahasa Melayu perniagaan yang natural, bukan terjemahan kaku.`;
}

export default async function AjarAI() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = await supabase
    .from("profiles")
    .select(
      "business_name, products, target_customer, location, onboarded, categories(name_ms)"
    )
    .eq("id", user!.id)
    .single<Profil>();

  if (!profil?.onboarded) redirect("/onboarding");

  const teks = arahanInduk(profil);

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
      <h1 className="text-2xl font-bold">🎓 Ajar AI Anda</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Ini <strong>Arahan Induk</strong> anda — sudah diisi dengan maklumat{" "}
        {profil.business_name}. Pasang SEKALI sahaja, dan setiap chat selepas
        itu AI terus faham bisnes anda, jawab dengan lebih jujur, kritikal dan
        tepat.
      </p>

      <div className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap text-xs text-neutral-600 dark:text-neutral-300">
          {teks}
        </pre>
        <div className="mt-3">
          <SalinBar teks={teks} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section className="text-sm">
          <h2 className="mb-2 font-semibold">Cara pasang di Claude</h2>
          <ol className="list-decimal space-y-1 pl-5 text-neutral-600 dark:text-neutral-300">
            <li>Salin Arahan Induk di atas</li>
            <li>
              Buka claude.ai → <strong>Projects</strong> → cipta projek untuk
              bisnes anda
            </li>
            <li>
              Klik <strong>Custom Instructions</strong> (arahan projek) →
              tampal → simpan
            </li>
            <li>Mulakan semua chat bisnes dalam projek itu</li>
          </ol>
        </section>
        <section className="text-sm">
          <h2 className="mb-2 font-semibold">Cara pasang di ChatGPT</h2>
          <ol className="list-decimal space-y-1 pl-5 text-neutral-600 dark:text-neutral-300">
            <li>Salin Arahan Induk di atas</li>
            <li>
              Buka chatgpt.com → profil → <strong>Customize ChatGPT</strong>
            </li>
            <li>
              Tampal dalam ruangan{" "}
              <em>&quot;How would you like ChatGPT to respond?&quot;</em> →
              simpan
            </li>
            <li>Ia aktif untuk semua chat baharu selepas itu</li>
          </ol>
        </section>
      </div>

      <p className="mt-8 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900">
        💡 Kemaskini profil bisnes anda di halaman{" "}
        <Link
          href="/onboarding"
          className="rounded px-0.5 underline active:opacity-70"
        >
          onboarding
          <CtaSpinner />
        </Link>{" "}
        bila maklumat berubah, kemudian kembali ke sini untuk salin versi
        terbaru.
      </p>
    </main>
  );
}
