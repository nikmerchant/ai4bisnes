import { BlogNav, BlogFooter } from "../blog/blog-shell";

export const metadata = {
  title: "Tentang Kami",
  description:
    "Kenali AI4Bisnes — platform prompt AI Bahasa Melayu pertama untuk usahawan dan SME Malaysia. Misi kami: jadikan AI mudah, mampu milik, dan praktikal untuk bisnes anda.",
  alternates: { canonical: "/tentang" },
};

const h2 = "mt-10 text-xl font-extrabold tracking-tight";
const p = "mt-3 text-sm leading-relaxed text-zinc-600";
const li = "text-sm leading-relaxed text-zinc-600";

export default function Tentang() {
  return (
    <div className="bg-white text-zinc-900">
      <BlogNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Tentang AI4Bisnes
        </h1>
        <p className="mt-2 text-xs text-zinc-400">
          Membawa AI kepada setiap usahawan Malaysia 🇲🇾
        </p>

        {/* ── Misi ──────────────────────────────────────── */}
        <h2 className={h2}>Misi Kami</h2>
        <p className={p}>
          <strong>AI4Bisnes</strong> adalah platform prompt AI Bahasa Melayu
          pertama di Malaysia yang dibina khusus untuk usahawan dan
          perusahaan kecil & sederhana (PKS/SME). Misi kami mudah: jadikan
          Artificial Intelligence (AI) mudah difahami, murah, dan praktikal
          untuk setiap pemilik bisnes di Malaysia — tanpa perlu tahu coding.
        </p>
        <p className={p}>
          Kami percaya AI bukan untuk syarikat besar sahaja. Setiap kedai
          kopi, butik, pembekal katering, kedai runcit, dan peniaga kecil
          berhak mendapat manfaat AI — dan AI4Bisnes ada di sini untuk
          menjadikannya realiti.
        </p>

        {/* ── Masalah ───────────────────────────────────── */}
        <h2 className={h2}>Masalah Yang Kami Selesaikan</h2>
        <p className={p}>
          Ramai usahawan tahu AI penting, tapi tak tahu nak mula. ChatGPT
          dan Claude hebat — tetapi hasilnya generic jika prompt tidak ditulis
          dengan betul. Kebanyakan panduan AI pula dalam Bahasa Inggeris dan
          tidak relevan dengan konteks bisnes Malaysia.
        </p>
        <p className={p}>
          AI4Bisnes merapatkan jurang ini. Kami menyediakan 177+ prompt AI
          <strong> dalam Bahasa Melayu</strong>, yang telah
          <strong> siap diisi </strong>
          dengan maklumat bisnes anda. Pilih prompt, salin, tampal ke mana-mana
          AI tool kegemaran anda — dan dapatkan hasil yang tepat, relevan, dan
          praktikal untuk perniagaan anda.
        </p>

        {/* ── Apa ───────────────────────────────────────── */}
        <h2 className={h2}>Apa Yang Kami Tawarkan</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            <strong>177+ Prompt AI Siap Pakai</strong> — pemasaran, jualan,
            content marketing, operasi, e-mel, analisis data, khidmat
            pelanggan dan banyak lagi.
          </li>
          <li className={li}>
            <strong>Prompt Diperibadikan</strong> — isikan profil perniagaan
            anda dan setiap prompt akan mengandungi maklumat spesifik bisnes
            anda. Bukan generic — tetapi tepat untuk anda.
          </li>
          <li className={li}>
            <strong>Vault Prompt Anda Sendiri</strong> — simpan, edit, dan
            uruskan koleksi prompt kegemaran anda.
          </li>
          <li className={li}>
            <strong>Ajar-AI</strong> — ajar AI tentang bisnes spesifik anda
            supaya setiap interaksi lebih tepat dan relevan.
          </li>
          <li className={li}>
            <strong>Affiliate Program</strong> — kongsikan AI4Bisnes dengan
            rakan usahawan anda dan dapatkan komisen.
          </li>
        </ul>

        {/* ── Siapa ─────────────────────────────────────── */}
        <h2 className={h2}>Siapa Di Sebalik AI4Bisnes?</h2>
        <p className={p}>
          AI4Bisnes dibangunkan oleh <strong>NiagaIQ Technologies Sdn Bhd</strong>
          (No. Pendaftaran SSM: 202603174768 / JM1046442-D) — sebuah syarikat
          teknologi yang berfokus pada Pendidikan AI untuk Perniagaan di
          Malaysia. Kami adalah gabungan pengamal AI dan usahawan yang faham
          cabaran sebenar menjalankan bisnes di Malaysia.
        </p>
        <p className={p}>
          Pengasas kami, <strong>Nik Mohd Zufadhli</strong>, telah bertahun-tahun
          membantu PKS Malaysia mendigitalkan operasi mereka melalui platform
          seperti <strong>CaknaAI</strong> (caknaai.com). AI4Bisnes adalah
          langkah seterusnya — menyediakan alat AI praktikal yang semua
          usahawan boleh guna <em>hari ini</em>.
        </p>

        {/* ── Kenapa ────────────────────────────────────── */}
        <h2 className={h2}>Kenapa AI4Bisnes?</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            🏆 <strong>Reka Bentuk untuk Malaysia:</strong> prompt, tutorial,
            dan panduan semuanya dalam Bahasa Melayu dan konteks pasaran
            Malaysia.
          </li>
          <li className={li}>
            🌍 <strong>AI-Neutral:</strong> anda bebas guna ChatGPT, Claude,
            Gemini, DeepSeek — mana-mana AI yang anda suka.
          </li>
          <li className={li}>
            🚀 <strong>Cepat & Praktikal:</strong> mula guna AI dalam 5 minit,
            tak perlu kursus mahal atau technical background.
          </li>
          <li className={li}>
            🇲🇾 <strong>Dibina di Malaysia:</strong> pasukan, pelayan, dan
            fokus kami — semua di sini. Kami faham pasaran, peraturan, dan
            budaya bisnes Malaysia.
          </li>
        </ul>

        {/* ── Visi ──────────────────────────────────────── */}
        <h2 className={h2}>Visi Kami</h2>
        <p className={p}>
          Menjelang 2030, setiap PKS di Malaysia menggunakan AI sebagai alat
          harian — seperti mereka guna telefon pintar hari ini. AI4Bisnes
          akan menjadi jambatan yang membawa mereka ke sana.
        </p>

        {/* ── Hubungi ───────────────────────────────────── */}
        <h2 className={h2}>Hubungi Kami</h2>
        <p className={p}>
          NiagaIQ Technologies Sdn Bhd
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
