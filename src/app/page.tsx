import Link from "next/link";
import { HARGA } from "@/lib/harga";
import { Reveal } from "./reveal";

const btnUtama =
  "rounded-full bg-violet-600 px-8 py-3.5 font-bold text-white transition-colors hover:bg-violet-700";
const badge =
  "rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white";

export default function Home() {
  return (
    <div className="bg-white text-zinc-900">
      {/* BAR PENGUMUMAN */}
      <Link
        href="/daftar"
        className="block bg-violet-600 py-2.5 text-center text-sm font-bold text-white hover:bg-violet-700"
      >
        <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-violet-700">
          BAHARU
        </span>
        Pek Kempen Merdeka kini tersedia — bersedia 8 minggu awal dari pesaing
        anda ⟶
      </Link>

      {/* HERO GELAP + AURORA + NAV KACA */}
      <header className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="aurora-a" aria-hidden />
        <div className="aurora-b" aria-hidden />

        {/* NAV kaca terapung */}
        <nav className="relative z-20 px-6 pt-6">
          <div className="liquid-glass mx-auto flex w-full max-w-5xl items-center justify-between rounded-full px-6 py-3">
            <span className="text-lg font-extrabold tracking-tight">
              AI4<span className="text-violet-400">BISNES</span>
            </span>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/masuk"
                className="font-medium text-white/80 transition-colors hover:text-white"
              >
                Log Masuk
              </Link>
              <Link
                href="/daftar"
                className="rounded-full bg-violet-600 px-5 py-2 font-bold transition-colors hover:bg-violet-500"
              >
                Daftar Percuma
              </Link>
            </div>
          </div>
        </nav>

        {/* KANDUNGAN HERO */}
        <div className="relative z-10 mx-auto flex min-h-[82vh] w-full max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">
          <p className="fade-up fade-up-1 text-xs font-bold uppercase tracking-[0.25em] text-violet-300">
            Untuk SME & usahawan Malaysia
          </p>
          <h1 className="fade-up fade-up-2 mx-auto mt-6 max-w-4xl text-4xl font-extrabold uppercase leading-tight tracking-tight sm:text-6xl">
            ChatGPT tak faham bisnes anda?{" "}
            <span
              className="normal-case italic text-violet-400"
              style={{ fontFamily: "var(--font-serif-aksen), serif" }}
            >
              Kami boleh perbetulkan.
            </span>
          </h1>
          <p className="fade-up fade-up-3 mx-auto mt-8 max-w-2xl text-lg text-zinc-400">
            177+ prompt Bahasa Melayu yang{" "}
            <strong className="text-white">
              siap diisi maklumat bisnes anda
            </strong>{" "}
            — nama, produk, pelanggan sasaran, lokasi. Salin, tampal, dan AI
            terus bekerja seperti staf yang dah lama kenal bisnes anda sejak bertahun-tahun lamanya.
          </p>
          <div className="fade-up fade-up-4 mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/daftar" className={btnUtama}>
              MULA PERCUMA — 2 MINIT
            </Link>
            <a
              href="#harga"
              className="liquid-glass rounded-full px-8 py-3.5 font-bold text-white/90 transition-colors hover:text-white"
            >
              Lihat Harga
            </a>
          </div>
          <p className="fade-up fade-up-4 mt-6 text-xs font-medium text-zinc-500">
            Tiada kad kredit diperlukan · Bahasa Melayu sepenuhnya
          </p>
        </div>
      </header>

      {/* MASALAH */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
            Kenapa jawapan AI anda selalu{" "}
            <span className="text-violet-600">&quot;lari&quot;?</span>
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              t: "Prompt kosong, jawapan kosong",
              d: "Taip “buatkan ayat iklan” — dapat ayat generik yang bunyi macam syarikat mana-mana, bukan bisnes anda.",
            },
            {
              t: "Semua template dalam English",
              d: "Prompt viral di internet ditulis untuk pasaran Amerika. Pelanggan anda di Malaysia — bahasa, harga RM, dan musim pun berbeza.",
            },
            {
              t: "Ulang konteks setiap kali",
              d: "Setiap chat baharu, kena terangkan semula bisnes anda dari kosong. Penat, dan selalu tertinggal butiran penting.",
            },
          ].map((m, i) => (
            <Reveal key={m.t}>
              <div className="h-full rounded-2xl bg-zinc-100 p-6">
                <span className="text-3xl font-extrabold text-violet-600">
                  {i + 1}
                </span>
                <h3 className="mt-2 text-lg font-bold">{m.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {m.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CARA BERFUNGSI */}
      <section className="bg-zinc-950 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <Reveal>
            <h2 className="text-center text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
              3 langkah, <span className="text-violet-400">terus jalan</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                t: "Ceritakan bisnes anda sekali",
                d: "Nama bisnes, kategori, produk, pelanggan sasaran, lokasi — 2 minit semasa daftar.",
              },
              {
                t: "Setiap prompt auto-tala",
                d: "Semua 177+ prompt terus terisi maklumat bisnes anda. Ada tempat kosong? Isi dalam borang, siap.",
              },
              {
                t: "Salin & buka ChatGPT/Claude",
                d: "Satu klik — prompt tersalin dan AI kegemaran anda terbuka. Jawapan yang tepat, kali pertama.",
              },
            ].map((s, i) => (
              <Reveal key={s.t}>
                <div className="h-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-lg font-extrabold">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {s.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CIRI */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
            Lebih dari sekadar{" "}
            <span className="text-violet-600">koleksi prompt</span>
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {[
            {
              t: "🎓 Ajar AI Anda",
              d: "Arahan Induk siap-isi profil bisnes anda — pasang sekali di ChatGPT atau Claude, dan setiap chat selepas itu AI terus kenal bisnes anda.",
              b: "Percuma",
            },
            {
              t: "🗂 Prompt khas kategori anda",
              d: "F&B dapat prompt halal JAKIM & GrabFood. Kedai online dapat skrip live selling TikTok. Kontraktor dapat template sebut harga. 10 kategori, semua konteks Malaysia.",
              b: "Percuma",
            },
            {
              t: "🎁 Pek Kempen Bulanan",
              d: "Setiap bulan, pek kempen siap-guna ikut kalendar Malaysia — Raya, Merdeka, 11.11, cuti sekolah. Strategi + post + iklan + emel.",
              b: "Pro",
            },
            {
              t: "🗄 Vault Bisnes Saya",
              d: "Prompt yang anda lengkapkan tersimpan kekal — skrip jualan, iklan, strategi. Otak pemasaran bisnes anda, semakin lama semakin berharga.",
              b: "Pro",
            },
            {
              t: "🏆 Coach Max",
              d: "Program coaching pemasaran 12 sesi berasaskan rangka $100M — money model, offer, skrip closing. AI jadi coach peribadi yang tak mengampu.",
              b: "Max",
            },
            {
              t: "⭐ Carian & kegemaran",
              d: "Cari ikut topik atau kata kunci, simpan prompt yang anda guna berulang kali. Pantas macam library peribadi.",
              b: "Percuma",
            },
          ].map((c) => (
            <Reveal key={c.t}>
              <div className="h-full rounded-2xl border-2 border-zinc-200 p-6 transition-colors hover:border-violet-600">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">{c.t}</h3>
                  <span className={badge}>{c.b}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {c.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HARGA */}
      <section id="harga" className="bg-zinc-100">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <Reveal>
            <h2 className="text-center text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
              Harga <span className="text-violet-600">founding member</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-sm text-zinc-600">
              Kadar anda{" "}
              <strong className="text-zinc-900">dikunci selama-lamanya</strong>{" "}
              selagi langganan aktif — walaupun harga baharu naik nanti.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <Reveal>
              <div className="h-full rounded-2xl bg-white p-7 shadow-sm">
                <h3 className="text-lg font-extrabold uppercase">Basic</h3>
                <p className="mt-1 text-4xl font-extrabold">Percuma</p>
                <ul className="mt-5 space-y-2.5 text-sm text-zinc-600">
                  <li>✓ 90+ prompt asas khusus untuk bisnes anda</li>
                  <li>✓ Prompt khas kategori anda</li>
                  <li>✓ Modul Ajar AI Anda</li>
                  <li>✓ Carian & kegemaran</li>
                </ul>
              </div>
            </Reveal>
            <Reveal>
              <div className="h-full rounded-2xl bg-white p-7 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold uppercase">Pro</h3>
                  <span className={badge}>Popular</span>
                </div>
                <p className="mt-1 text-4xl font-extrabold">
                  RM{HARGA.pro.bulanan}
                  <span className="text-base font-medium text-zinc-500">
                    /bulan
                  </span>
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-zinc-600">
                  <li>✓ Semua dalam Basic</li>
                  <li>✓ 66+ prompt iklan, copywriting, SEO, lead</li>
                  <li>✓ Pek Kempen Bulanan</li>
                  <li>✓ Vault Bisnes Saya</li>
                </ul>
              </div>
            </Reveal>
            <Reveal>
              <div className="h-full rounded-2xl bg-zinc-950 p-7 text-white shadow-lg ring-2 ring-violet-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold uppercase">Max</h3>
                  <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                    Coach AI
                  </span>
                </div>
                <p className="mt-1 text-4xl font-extrabold">
                  RM{HARGA.max.bulanan}
                  <span className="text-base font-medium text-zinc-400">
                    /bulan
                  </span>
                </p>
                <p className="mt-2 text-xs font-bold text-violet-400">
                  +RM{HARGA.max.bulanan - HARGA.pro.bulanan} sahaja dari Pro —
                  dapat coach pemasaran penuh
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-zinc-300">
                  <li>✓ Semua dalam Pro</li>
                  <li>✓ Coach Max — 13 sesi coaching pemasaran</li>
                  <li>✓ Money model & Grand Slam Offer anda</li>
                  <li>✓ Audit bisnes setiap suku tahun</li>
                </ul>
              </div>
            </Reveal>
          </div>
          <Reveal>
            <div className="mt-10 text-center">
              <Link href="/daftar" className={btnUtama}>
                MULA PERCUMA DULU
              </Link>
              <p className="mt-4 text-xs font-medium text-zinc-500">
                Naik taraf bila-bila masa dari dalam app · Bayaran FPX & kad ·
                Batal bila-bila masa
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
            Soalan <span className="text-violet-600">lazim</span>
          </h2>
        </Reveal>
        <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3">
          {[
            {
              s: "Perlu ke saya ada langganan ChatGPT atau Claude berbayar?",
              j: "Tidak. Prompt kami berfungsi dengan versi percuma ChatGPT dan Claude. Versi berbayar memberi jawapan lebih baik, tapi bukan syarat.",
            },
            {
              s: "Saya tak pandai IT — susah ke nak guna?",
              j: "Kalau anda boleh salin dan tampal, anda boleh guna AI4Bisnes. Setiap prompt ada butang Salin & Buka — satu klik, terus jalan.",
            },
            {
              s: "Apa beza dengan senarai prompt percuma di internet?",
              j: "Prompt percuma ditulis generik dan dalam English. Prompt kami dalam Bahasa Melayu, konteks Malaysia (RM, LHDN, JAKIM, Shopee, musim perayaan) dan siap diisi maklumat bisnes anda secara automatik.",
            },
            {
              s: "Boleh batal langganan bila-bila masa?",
              j: "Ya. Akses kekal sehingga tamat tempoh yang dibayar, dan simpanan Vault anda masih boleh dibaca selepas itu — kami tak sandera data anda.",
            },
            {
              s: "Maklumat bisnes saya selamat?",
              j: "Maklumat profil anda disimpan selamat dan hanya digunakan untuk menala prompt anda. Kami tidak berkongsi data anda dengan pihak ketiga.",
            },
          ].map((f) => (
            <Reveal key={f.s}>
              <details className="rounded-xl border-b-2 border-dashed border-zinc-300 p-4">
                <summary className="cursor-pointer font-bold">{f.s}</summary>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {f.j}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA AKHIR */}
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="aurora-a" aria-hidden />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 text-center">
          <Reveal>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
              Bisnes anda unik.
              <br />
              <span
                className="normal-case italic text-violet-400"
                style={{ fontFamily: "var(--font-serif-aksen), serif" }}
              >
                Prompt anda pun patut begitu.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-zinc-400">
              Daftar percuma, isi profil bisnes dalam 2 minit, dan rasa sendiri
              bezanya jawapan AI yang benar-benar kenal bisnes anda.
            </p>
            <Link
              href="/daftar"
              className={`${btnUtama} mt-8 inline-block`}
            >
              DAFTAR PERCUMA SEKARANG
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-8 text-center text-xs text-zinc-400">
        <p className="font-bold text-white">
          AI4<span className="text-violet-400">BISNES</span>
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} AI4Bisnes · ai4bisnes.com · Dibina untuk
          usahawan Malaysia 🇲🇾
        </p>
        <p className="mt-1">
          <Link href="/masuk" className="underline hover:text-white">
            Log Masuk
          </Link>{" "}
          ·{" "}
          <Link href="/daftar" className="underline hover:text-white">
            Daftar
          </Link>
        </p>
      </footer>
    </div>
  );
}
