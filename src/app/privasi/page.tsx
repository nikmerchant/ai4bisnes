import { BlogNav, BlogFooter } from "../blog/blog-shell";

export const metadata = {
  title: "Dasar Privasi",
  description:
    "Dasar Privasi AI4Bisnes — bagaimana kami mengumpul, menggunakan dan melindungi data anda selaras PDPA 2010.",
  alternates: { canonical: "/privasi" },
};

const h2 = "mt-10 text-xl font-extrabold tracking-tight";
const p = "mt-3 text-sm leading-relaxed text-zinc-600";
const li = "text-sm leading-relaxed text-zinc-600";

export default function Privasi() {
  return (
    <div className="bg-white text-zinc-900">
      <BlogNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Dasar Privasi
        </h1>
        <p className="mt-2 text-xs text-zinc-400">
          Kemas kini terakhir: 11 Julai 2026
        </p>

        <p className={p}>
          Dasar Privasi ini menerangkan bagaimana AI4Bisnes (ai4bisnes.com),
          dikendalikan oleh <strong>NiagaIQ Technologies</strong> (No.
          Pendaftaran SSM: 202603174768 (JM1046442-D)), mengumpul,
          menggunakan, dan melindungi data peribadi anda, selaras dengan
          Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia.
        </p>

        <h2 className={h2}>1. Data yang Kami Kumpul</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            <strong>Maklumat akaun:</strong> alamat emel dan kata laluan
            (disimpan secara hash — kami tidak boleh melihat kata laluan
            anda).
          </li>
          <li className={li}>
            <strong>Profil perniagaan:</strong> nama bisnes, kategori,
            produk/servis, pelanggan sasaran, dan lokasi — yang anda isi
            sendiri semasa onboarding, digunakan untuk menala prompt anda.
          </li>
          <li className={li}>
            <strong>Maklumat langganan:</strong> rekod pelan, tempoh, jumlah
            bayaran dan status. Butiran kad/perbankan anda diproses
            sepenuhnya oleh toyyibPay — kami tidak menyimpan nombor kad atau
            butiran bank anda.
          </li>
          <li className={li}>
            <strong>Kandungan Vault:</strong> prompt yang anda lengkapkan dan
            simpan sendiri dalam platform.
          </li>
          <li className={li}>
            <strong>Data rujukan (affiliate):</strong> kod rujukan yang anda
            klik disimpan dalam cookie selama 30 hari, dan siapa yang merujuk
            anda direkodkan semasa pendaftaran.
          </li>
        </ul>

        <h2 className={h2}>2. Bagaimana Kami Guna Data Anda</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            Menala kandungan prompt mengikut profil perniagaan anda (tujuan
            utama platform).
          </li>
          <li className={li}>
            Memproses langganan, pengesahan emel, dan reset kata laluan.
          </li>
          <li className={li}>
            Mengira komisen affiliate bagi pengguna yang merujuk anda.
          </li>
          <li className={li}>
            Menghantar emel transaksional (pengesahan akaun, resit, notis
            penting perkhidmatan). Kami tidak menghantar spam.
          </li>
        </ul>

        <h2 className={h2}>3. Perkongsian Data</h2>
        <p className={p}>
          Kami <strong>tidak menjual</strong> data peribadi anda. Data hanya
          dikongsi dengan pembekal perkhidmatan yang diperlukan untuk
          operasi platform:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            <strong>Supabase</strong> — pangkalan data dan pengesahan akaun
            (pelayan rantau Asia Tenggara).
          </li>
          <li className={li}>
            <strong>Vercel</strong> — pengehosan laman web.
          </li>
          <li className={li}>
            <strong>toyyibPay</strong> — pemprosesan bayaran (FPX & kad).
          </li>
          <li className={li}>
            <strong>Resend</strong> — penghantaran emel transaksional.
          </li>
        </ul>
        <p className={p}>
          Maklumat perniagaan yang anda masukkan ke dalam prompt dan
          kemudian tampal ke ChatGPT/Claude adalah tertakluk kepada dasar
          privasi penyedia AI tersebut — bukan kami yang menghantar data
          anda kepada mereka.
        </p>

        <h2 className={h2}>4. Cookies</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            <strong>Cookie sesi log masuk</strong> (Supabase) — diperlukan
            untuk kekal log masuk.
          </li>
          <li className={li}>
            <strong>Cookie rujukan affiliate</strong> (ai4b_ref) — menyimpan
            kod rujukan selama 30 hari selepas anda klik pautan affiliate,
            supaya perujuk anda menerima kredit jika anda mendaftar.
          </li>
        </ul>
        <p className={p}>
          Kami tidak menggunakan cookie pengiklanan atau penjejakan pihak
          ketiga.
        </p>

        <h2 className={h2}>5. Penyimpanan & Keselamatan</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            Data disimpan di pelayan Supabase (rantau Asia Tenggara) dengan
            kawalan akses peringkat baris (row-level security) — setiap
            pengguna hanya boleh mengakses data mereka sendiri.
          </li>
          <li className={li}>
            Semua sambungan disulitkan melalui HTTPS.
          </li>
          <li className={li}>
            Kata laluan disimpan secara hash dan tidak boleh dilihat oleh
            sesiapa, termasuk kami.
          </li>
        </ul>

        <h2 className={h2}>6. Hak Anda (PDPA)</h2>
        <p className={p}>
          Di bawah PDPA 2010, anda berhak untuk:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            <strong>Akses</strong> — meminta salinan data peribadi anda yang
            kami simpan.
          </li>
          <li className={li}>
            <strong>Pembetulan</strong> — mengemas kini profil perniagaan
            anda pada bila-bila masa melalui halaman kemaskini profil.
          </li>
          <li className={li}>
            <strong>Pemadaman</strong> — meminta akaun dan data anda dipadam
            sepenuhnya dengan menghubungi kami.
          </li>
          <li className={li}>
            <strong>Menarik balik persetujuan</strong> — berhenti menggunakan
            perkhidmatan dan meminta pemadaman data.
          </li>
        </ul>
        <p className={p}>
          Untuk melaksanakan mana-mana hak ini, emel kami di{" "}
          <a
            href="mailto:admin@ai4bisnes.com"
            className="text-violet-600 underline"
          >
            admin@ai4bisnes.com
          </a>
          . Kami akan membalas dalam tempoh 21 hari.
        </p>

        <h2 className={h2}>7. Pengekalan Data</h2>
        <p className={p}>
          Data akaun disimpan selagi akaun anda aktif. Selepas permintaan
          pemadaman, data peribadi akan dipadam dalam tempoh 30 hari, kecuali
          rekod yang wajib disimpan atas sebab undang-undang (cth. rekod
          transaksi untuk tujuan cukai).
        </p>

        <h2 className={h2}>8. Kanak-kanak</h2>
        <p className={p}>
          Perkhidmatan ini tidak ditujukan kepada individu bawah 18 tahun dan
          kami tidak mengumpul data mereka dengan sengaja.
        </p>

        <h2 className={h2}>9. Perubahan Dasar</h2>
        <p className={p}>
          Kami mungkin mengemas kini dasar ini dari semasa ke semasa.
          Perubahan penting akan dimaklumkan melalui emel atau notis dalam
          platform. Tarikh "kemas kini terakhir" di atas menunjukkan versi
          semasa.
        </p>

        <h2 className={h2}>10. Hubungi Kami</h2>
        <p className={p}>
          NiagaIQ Technologies
          <br />
          No. Pendaftaran SSM: 202603174768 (JM1046442-D)
          <br />
          Emel:{" "}
          <a
            href="mailto:admin@ai4bisnes.com"
            className="text-violet-600 underline"
          >
            admin@ai4bisnes.com
          </a>{" "}
          · Borang:{" "}
          <a href="/hubungi" className="text-violet-600 underline">
            Hubungi Kami
          </a>
        </p>
      </main>
      <BlogFooter />
    </div>
  );
}
