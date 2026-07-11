import { BlogNav, BlogFooter } from "../blog/blog-shell";

export const metadata = {
  title: "Terma Perkhidmatan",
  description:
    "Terma Perkhidmatan AI4Bisnes — syarat penggunaan platform prompt AI untuk SME Malaysia.",
  alternates: { canonical: "/terma" },
};

const h2 = "mt-10 text-xl font-extrabold tracking-tight";
const p = "mt-3 text-sm leading-relaxed text-zinc-600";
const li = "text-sm leading-relaxed text-zinc-600";

export default function Terma() {
  return (
    <div className="bg-white text-zinc-900">
      <BlogNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Terma Perkhidmatan
        </h1>
        <p className="mt-2 text-xs text-zinc-400">
          Kemas kini terakhir: 11 Julai 2026
        </p>

        <p className={p}>
          Selamat datang ke AI4Bisnes (ai4bisnes.com), platform koleksi prompt
          AI dalam Bahasa Melayu untuk perniagaan kecil dan sederhana di
          Malaysia, dikendalikan oleh <strong>NiagaIQ Technologies</strong>{" "}
          (No. Pendaftaran SSM: 202603174768 (JM1046442-D)) ("kami").
          Dengan mendaftar atau menggunakan perkhidmatan ini, anda bersetuju
          dengan terma-terma di bawah.
        </p>

        <h2 className={h2}>1. Perkhidmatan</h2>
        <p className={p}>
          AI4Bisnes menyediakan koleksi prompt AI yang ditala mengikut
          maklumat perniagaan anda, untuk digunakan bersama perkhidmatan AI
          pihak ketiga seperti ChatGPT dan Claude. Kami bukan penyedia
          perkhidmatan AI tersebut — output yang dihasilkan oleh ChatGPT,
          Claude atau mana-mana AI adalah tertakluk kepada terma penyedia
          masing-masing.
        </p>

        <h2 className={h2}>2. Akaun & Kelayakan</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            Anda mesti berumur 18 tahun ke atas untuk mendaftar.
          </li>
          <li className={li}>
            Anda bertanggungjawab menjaga kerahsiaan kata laluan anda dan
            semua aktiviti di bawah akaun anda.
          </li>
          <li className={li}>
            Satu akaun untuk satu perniagaan/pengguna. Perkongsian akaun
            secara pukal tidak dibenarkan.
          </li>
        </ul>

        <h2 className={h2}>3. Langganan & Bayaran</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            Pelan Basic adalah percuma. Pelan Pro dan Max adalah langganan
            berbayar (bulanan atau tahunan) yang diproses melalui toyyibPay
            (FPX & kad).
          </li>
          <li className={li}>
            Harga "founding member" dikunci selagi langganan anda kekal
            aktif. Jika langganan tamat dan tidak diperbaharui, kadar semasa
            akan terpakai untuk langganan baharu.
          </li>
          <li className={li}>
            Langganan tidak diperbaharui secara automatik — anda membuat
            bayaran baharu untuk setiap tempoh.
          </li>
          <li className={li}>
            <strong>Jaminan 14 hari:</strong> jika anda tidak berpuas hati
            dengan langganan berbayar pertama anda, hubungi kami dalam tempoh
            14 hari dari tarikh bayaran untuk bayaran balik penuh.
          </li>
        </ul>

        <h2 className={h2}>4. Program Affiliate</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            Setiap pengguna berdaftar menerima pautan rujukan dan layak
            menerima komisen 20% daripada setiap bayaran langganan oleh
            pengguna yang mereka rujuk, selagi langganan tersebut aktif.
          </li>
          <li className={li}>
            Bayaran komisen dibuat secara manual (DuitNow/pindahan bank)
            secara berkala. Kami berhak menahan atau membatalkan komisen
            yang diperoleh melalui penipuan, rujukan diri sendiri, atau
            penyalahgunaan sistem.
          </li>
        </ul>

        <h2 className={h2}>5. Penggunaan yang Dilarang</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li className={li}>
            Menyalin, menjual semula, atau mengedarkan kandungan prompt kami
            secara pukal kepada pihak ketiga.
          </li>
          <li className={li}>
            Menggunakan perkhidmatan untuk aktiviti yang menyalahi
            undang-undang Malaysia.
          </li>
          <li className={li}>
            Cubaan menggodam, mengganggu, atau memanipulasi sistem
            (termasuk sistem affiliate dan tier langganan).
          </li>
        </ul>

        <h2 className={h2}>6. Harta Intelek</h2>
        <p className={p}>
          Semua kandungan prompt, jenama, dan bahan dalam platform ini adalah
          hak milik NiagaIQ Technologies. Langganan memberi anda lesen
          penggunaan peribadi untuk perniagaan anda sendiri — bukan hak
          milikan atau pengedaran semula. Output AI yang anda hasilkan
          menggunakan prompt kami adalah milik anda.
        </p>

        <h2 className={h2}>7. Penafian</h2>
        <p className={p}>
          Prompt kami adalah alat bantu — hasil perniagaan anda bergantung
          kepada banyak faktor di luar kawalan kami. Kami tidak menjamin
          sebarang hasil jualan, pendapatan, atau prestasi tertentu.
          Perkhidmatan disediakan "seadanya" (as is). Sentiasa semak output
          AI sebelum digunakan, terutamanya bagi kandungan berkaitan
          undang-undang, kewangan, atau tuntutan produk.
        </p>

        <h2 className={h2}>8. Had Liabiliti</h2>
        <p className={p}>
          Setakat yang dibenarkan undang-undang, liabiliti kami kepada anda
          terhad kepada jumlah yang anda bayar kepada kami dalam tempoh 12
          bulan sebelum tuntutan. Kami tidak bertanggungjawab ke atas
          kerugian tidak langsung, kehilangan keuntungan, atau kerosakan
          akibat penggunaan output AI pihak ketiga.
        </p>

        <h2 className={h2}>9. Penamatan</h2>
        <p className={p}>
          Anda boleh berhenti menggunakan perkhidmatan pada bila-bila masa.
          Kami berhak menggantung atau menamatkan akaun yang melanggar terma
          ini. Selepas langganan berbayar tamat, simpanan Vault anda kekal
          boleh dibaca — kami tidak menyandera data anda.
        </p>

        <h2 className={h2}>10. Perubahan Terma</h2>
        <p className={p}>
          Kami mungkin mengemas kini terma ini dari semasa ke semasa.
          Perubahan penting akan dimaklumkan melalui emel atau notis dalam
          platform. Penggunaan berterusan selepas perubahan bermakna anda
          menerima terma yang dikemas kini.
        </p>

        <h2 className={h2}>11. Undang-undang Terpakai</h2>
        <p className={p}>
          Terma ini ditadbir oleh undang-undang Malaysia. Sebarang pertikaian
          tertakluk kepada bidang kuasa mahkamah Malaysia.
        </p>

        <h2 className={h2}>12. Hubungi Kami</h2>
        <p className={p}>
          Sebarang pertanyaan mengenai terma ini, emel kami di{" "}
          <a
            href="mailto:admin@ai4bisnes.com"
            className="text-violet-600 underline"
          >
            admin@ai4bisnes.com
          </a>{" "}
          atau melalui halaman{" "}
          <a href="/hubungi" className="text-violet-600 underline">
            Hubungi Kami
          </a>
          .
        </p>
      </main>
      <BlogFooter />
    </div>
  );
}
