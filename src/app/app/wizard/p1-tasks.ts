import type { TaskDef } from "./tasks";

export const P1_TASKS: TaskDef[] = [
  {
    slug: "offer-generator",
    title: "Offer Generator",
    emoji: "🎁",
    category: "marketing",
    tier: "pro",
    desc: "Bina tawaran yang lebih bernilai tanpa bergantung pada diskaun.",
    fields: [
      { name: "produk", label: "Produk / Servis", type: "text", placeholder: "Auto-isi dari profil anda", required: true },
      { name: "matlamat", label: "Matlamat tawaran", type: "select", options: ["Dapatkan pelanggan baru", "Naikkan nilai pesanan", "Habiskan stok", "Aktifkan pelanggan lama", "Lancarkan produk baru"], required: true },
      { name: "kekangan", label: "Kekangan / perkara yang perlu dielakkan", type: "text", placeholder: "cth: Margin rendah, tidak mahu beri diskaun besar" },
    ],
    promptTemplate: `Anda adalah pakar strategi tawaran untuk PKS Malaysia.

Tugas: Bina tawaran yang sukar ditolak tetapi masih menjaga margin bisnes.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk/Servis: {produk_input}
- Pelanggan sasaran: {sasaran}
- USP: {usp}
- Julat harga: {harga}

KEPERLUAN:
- Matlamat: {matlamat_input}
- Kekangan: {kekangan_input}
- Bahasa: Bahasa Melayu yang mudah difahami

HASILKAN:
1. 3 konsep tawaran yang benar-benar berbeza
2. Untuk setiap tawaran: nama, komponen, nilai kepada pelanggan dan anggaran risiko margin
3. Cadangan bonus yang murah untuk bisnes tetapi bernilai kepada pelanggan
4. Unsur urgency yang jujur, bukan scarcity palsu
5. CTA WhatsApp yang boleh terus digunakan

Akhir sekali, pilih satu tawaran terbaik dan jelaskan kenapa ia paling sesuai.`,
  },
  {
    slug: "objection-handler",
    title: "Objection Handler",
    emoji: "🛡️",
    category: "sales",
    tier: "pro",
    desc: "Jawab bantahan pelanggan dengan empati tanpa menjadi terlalu mendesak.",
    fields: [
      { name: "bantahan", label: "Apa yang pelanggan bantah?", type: "textarea", placeholder: "cth: Mahal sangat, saya nak fikir dulu", required: true },
      { name: "channel", label: "Saluran jawapan", type: "select", options: ["WhatsApp", "Telefon", "Bersemuka", "DM media sosial"], required: true },
      { name: "bukti", label: "Bukti / jaminan yang anda ada", type: "text", placeholder: "cth: Testimoni, waranti 30 hari, demo percuma" },
    ],
    promptTemplate: `Anda adalah jurulatih jualan untuk PKS Malaysia.

Tugas: Bantu saya menangani bantahan pelanggan secara empati, jujur dan tidak agresif.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk/Servis: {produk}
- Pelanggan sasaran: {sasaran}
- USP: {usp}
- Julat harga: {harga}

SITUASI:
- Bantahan pelanggan: "{bantahan_input}"
- Saluran: {channel_input}
- Bukti / jaminan tersedia: {bukti_input}

HASILKAN:
1. Maksud sebenar yang mungkin tersembunyi di sebalik bantahan itu
2. Satu soalan diagnosis ringkas sebelum menjawab
3. 3 versi jawapan: mesra, value-based dan terus-terang
4. Satu soalan langkah seterusnya yang tidak memaksa
5. Perkara yang tidak patut disebut

Gunakan Bahasa Melayu natural mengikut saluran yang dipilih. Jangan mereka-reka testimoni, jaminan atau fakta.`,
  },
  {
    slug: "customer-persona",
    title: "Customer Persona",
    emoji: "🎯",
    category: "marketing",
    tier: "pro",
    desc: "Fahami pelanggan ideal dan tukarkan insight kepada tindakan pemasaran.",
    fields: [
      { name: "produk", label: "Produk / Servis", type: "text", placeholder: "Auto-isi dari profil anda", required: true },
      { name: "segmen", label: "Segmen yang mahu difokuskan", type: "text", placeholder: "cth: Ibu bekerja umur 28-40 di bandar", required: true },
      { name: "matlamat", label: "Kegunaan persona", type: "select", options: ["Content", "Iklan", "WhatsApp sales", "Produk baru", "Kempen promosi"], required: true },
    ],
    promptTemplate: `Anda adalah penyelidik pelanggan untuk PKS Malaysia.

Tugas: Bina customer persona yang praktikal dan boleh terus digunakan untuk pemasaran.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk/Servis: {produk_input}
- Sasaran semasa: {sasaran}
- Lokasi: {lokasi}
- Platform: {platform}
- Julat harga: {harga}

FOKUS:
- Segmen: {segmen_input}
- Kegunaan persona: {matlamat_input}

HASILKAN:
1. Ringkasan persona (nama samaran, peringkat hidup, pekerjaan dan konteks)
2. 5 masalah utama
3. 5 hasil yang mereka mahukan
4. Halangan membeli dan pencetus keputusan
5. Bahasa/frasa yang mereka biasa gunakan
6. Platform dan format kandungan yang paling sesuai
7. 5 idea mesej pemasaran
8. 3 perkara yang masih andaian dan perlu disahkan melalui temu bual pelanggan

Bezakan dengan jelas antara inferens munasabah dan fakta yang belum diketahui. Jangan cipta statistik.`,
  },
];
