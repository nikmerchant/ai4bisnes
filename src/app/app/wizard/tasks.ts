import type { Profil } from "../shared";
import { isiPrompt } from "../shared";

/* ─────────────────────────────────────────────────────────────
   TASK REGISTRY — setiap task wizard dikonfigurasi di sini
   Smart Bridge: generate PROMPT (bukan output AI) untuk user
   copy ke ChatGPT/Claude
   ───────────────────────────────────────────────────────────── */

export type TaskField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "number";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: string;
};

export type TaskDef = {
  slug: string;
  title: string;
  emoji: string;
  category: "content" | "sales" | "marketing" | "copywriting";
  tier: "basic" | "pro" | "max";
  desc: string;
  fields: TaskField[];
  // Template prompt — {field} akan diisi, {profile.xxx} dari business profile
  promptTemplate: string;
};

export const TASKS: TaskDef[] = [
  // ── CONTENT ──
  {
    slug: "tiktok-script",
    title: "TikTok Script",
    emoji: "🎬",
    category: "content",
    tier: "pro",
    desc: "Script video pendek yang menarik perhatian dan menjual.",
    fields: [
      {
        name: "produk",
        label: "Produk / Servis",
        type: "text",
        placeholder: "Auto-isi dari profil anda",
      },
      {
        name: "objektif",
        label: "Objektif",
        type: "select",
        options: ["Awareness", "Engagement", "Leads", "Sales", "Education"],
        required: true,
      },
      {
        name: "duration",
        label: "Tempoh",
        type: "select",
        options: ["15 saat", "30 saat", "60 saat", "90 saat"],
        required: true,
      },
      {
        name: "tone",
        label: "Gaya",
        type: "select",
        options: ["Friendly", "Professional", "Funny", "Educational", "Storytelling", "Urgent"],
      },
    ],
    promptTemplate: `Anda adalah pakar pemasaran TikTok Malaysia.

Tugas: Tulis script TikTok yang menarik dan menggalakkan tindakan.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk/Servis: {produk_input}
- Pelanggan sasaran: {sasaran}
- USP: {usp}

KEPERLUAN:
- Objektif: {objektif_input}
- Tempoh: {duration_input}
- Gaya: {tone_input}
- Bahasa: Bahasa Melayu (natural, bukan formal)

STRUKTUR OUTPUT:
1. HOOK (3 saat pertama — mesti berhenti scroll)
2. BODY (script penuh dengan arahan visual)
3. CTA (jelas dan spesifik)

Tulis 3 variasi hook yang berbeza supaya saya boleh pilih.`,
  },

  {
    slug: "social-post",
    title: "Social Media Post",
    emoji: "📱",
    category: "content",
    tier: "pro",
    desc: "Facebook / Instagram content yang engage.",
    fields: [
      {
        name: "platform",
        label: "Platform",
        type: "select",
        options: ["Facebook", "Instagram", "LinkedIn"],
        required: true,
      },
      {
        name: "angle",
        label: "Angle",
        type: "select",
        options: ["Problem-Solution", "Story", "Education", "Social Proof", "Promosi", "Behind the Scenes"],
        required: true,
      },
      {
        name: "topik",
        label: "Topik / Tajuk",
        type: "text",
        placeholder: "cth: Lancaran produk baru bulan ini",
        required: true,
      },
    ],
    promptTemplate: `Anda adalah social media marketer Malaysia.

Tugas: Tulis {platform_input} post yang menarik untuk bisnes saya.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk: {produk}
- Pelanggan: {sasaran}
- Tone: {tone}

KEPERLUAN:
- Platform: {platform_input}
- Angle: {angle_input}
- Topik: {topik_input}
- Bahasa: Bahasa Melayu

STRUKTUR:
1. Hook (ayat pertama yang buat orang berhenti)
2. Body (2-3 perenggan, ringkas)
3. CTA (ajak komen / share / DM)
4. 5 hashtag relevan (# MalaysianMarket)

Tulis dalam gaya yang natural, bukan robotic.`,
  },

  // ── SALES ──
  {
    slug: "whatsapp-reply",
    title: "WhatsApp Reply",
    emoji: "💬",
    category: "sales",
    tier: "pro",
    desc: "Balas customer dengan cepat dan profesional.",
    fields: [
      {
        name: "jenis",
        label: "Jenis Mesej",
        type: "select",
        options: ["Customer Inquiry", "Price Inquiry", "Product Inquiry", "Complaint", "Follow-up", "Payment Reminder", "Closing", "Thank You"],
        required: true,
      },
      {
        name: "customer_msg",
        label: "Mesej dari customer",
        type: "textarea",
        placeholder: "cth: Berapa harga tudung ni? Ada stok warna hitam?",
        required: true,
      },
    ],
    promptTemplate: `Anda adalah sales assistant untuk bisnes Malaysia.

Tugas: Bantu saya balas mesej WhatsApp customer dengan profesional dan mesra.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk: {produk}
- Harga: {harga}
- USP: {usp}

JENIS: {jenis_input}
MESEJ CUSTOMER: "{customer_msg_input}"

ARAHAN:
- Tulis balasan dalam Bahasa Melayu yang natural (bukan formal/kaku)
- Mesti ada emoji yang sesuai (tidak berlebihan)
- Mesti menggalakkan customer untuk langkah seterusnya
- Ringkas — maksimum 3-4 ayat

Tulis 2 versi: satu mesra, satu lebih persuasif.`,
  },

  {
    slug: "follow-up",
    title: "Follow-up Pro spek",
    emoji: "🔥",
    category: "sales",
    tier: "pro",
    desc: "3 cara follow-up prospek tanpa kelihatan desperate.",
    fields: [
      {
        name: "situasi",
        label: "Situasi",
        type: "textarea",
        placeholder: "cth: Customer tanya harga semalam tapi belum beli",
        required: true,
      },
    ],
    promptTemplate: `Anda adalah pakar sales Malaysia.

Tugas: Hasilkan 3 mesej follow-up yang berbeza untuk situasi berikut.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk: {produk}
- USP: {usp}

SITUASI: {situasi_input}

ARAHAN:
Tulis 3 versi follow-up dalam Bahasa Melayu:

1. FRIENDLY — check-in ringan, tidak pushy
2. VALUE-BASED — beri value/info tambahan yang berguna
3. URGENCY — cipta keperluan untuk act sekarang

Setiap mesej:
- Maksimum 3 ayat
- Natural untuk WhatsApp
- Tidak desperate atau aggressive
- Beri sebab untuk customer reply`,
  },

  // ── COPYWRITING ──
  {
    slug: "product-desc",
    title: "Product Description",
    emoji: "✍️",
    category: "copywriting",
    tier: "pro",
    desc: "Penerangan produk yang buat orang nak beli.",
    fields: [
      {
        name: "produk_detail",
        label: "Nama produk & detail",
        type: "text",
        placeholder: "cth: Tudung Bawal Premium Koleksi Merdeka",
        required: true,
      },
      {
        name: "angle",
        label: "Angle jualan",
        type: "select",
        options: ["Quality Premium", "Harga Berpatutan", "Limited Edition", "Solution to Problem", "Lifestyle Aspirational"],
      },
    ],
    promptTemplate: `Anda adalah copywriter e-commerce Malaysia.

Tugas: Tulis product description yang menjual.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk asas: {produk}
- Harga: {harga}

PRODUK: {produk_detail_input}
ANGLE: {angle_input}

STRUKTUR:
1. Headline (5-7 patah perkataan, menarik)
2. Penerangan utama (2-3 perenggan)
3. 5 bullet points benefit (bukan feature)
4. CTA untuk beli

Bahasa: Bahasa Melayu yang natural dan persuasive.
Gaya: {tone}.`,
  },

  {
    slug: "ad-copy",
    title: "Iklan FB/IG",
    emoji: "📢",
    category: "copywriting",
    tier: "pro",
    desc: "Copy iklan yang berhenti scroll dan dapatkan klik.",
    fields: [
      {
        name: "platform",
        label: "Platform Iklan",
        type: "select",
        options: ["Facebook Feed", "Instagram Story", "Instagram Feed", "Facebook Story"],
        required: true,
      },
      {
        name: "offer",
        label: "Offer / Promosi",
        type: "text",
        placeholder: "cth: Diskaun 20% minggu ini",
      },
      {
        name: "objektif",
        label: "Objektif Iklan",
        type: "select",
        options: ["Awareness", "Traffic", "Leads", "Sales/Conversion"],
        required: true,
      },
    ],
    promptTemplate: `Anda adalah media buyer & copywriter iklan Malaysia.

Tugas: Tulis copy iklan yang menukar scroll menjadi klik.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk: {produk}
- Pelanggan: {sasaran}
- USP: {usp}

KEPERLUAN IKLAN:
- Platform: {platform_input}
- Offer: {offer_input}
- Objektif: {objektif_input}

Tulis:
1. PRIMARY TEXT (100-150 patah perkataan)
2. HEADLINE (max 40 karakter)
3. DESCRIPTION (max 30 karakter)
4. 3 CADANGAN CTA button

Bahasa: Bahasa Melayu yang persuade bukan hard-sell.
Tone: {tone}.

Pastikan copy follow guideline platform (bukan clickbait).`,
  },

  // ── MAX TIER ──
  {
    slug: "closing-script",
    title: "Closing Script",
    emoji: "💰",
    category: "sales",
    tier: "max",
    desc: "Skrip closing yang dapatkan 'Yes' dari prospek.",
    fields: [
      {
        name: "situasi",
        label: "Situasi closing",
        type: "textarea",
        placeholder: "cth: Customer berminat tapi masih ragu tentang harga",
        required: true,
      },
    ],
    promptTemplate: `Anda adalah master closer menggunakan rangka $100M Offer.

Tugas: Hasilkan skrip closing untuk situasi berikut.

MAKLUMAT BISNES:
- Nama: {nama_bisnes}
- Produk: {produk}
- Harga: {harga}
- USP: {usp}

SITUASI: {situasi_input}

STRUKTUR:
1. ACKNOWLEDGE — sahkan kebimbangan mereka
2. REFRAME — tukar perspective
3. STACK VALUE — tunjuk nilai melebihi harga
4. RISK REVERSAL — jaminan/cara mengurangkan risiko
5. CLOSE — soalan closing yang dapatkan YES
6. FOLLOW-UP PLAN jika mereka masih ragu

Bahasa: Bahasa Melayu, persuasive tapi tidak aggressive.
Tone: {tone}.

Tulis skrip seolah-olah anda sedang bercakap dengan prospek secara langsung.`,
  },
];

/* Helper: dapatkan task by slug */
export function getTask(slug: string): TaskDef | undefined {
  return TASKS.find((t) => t.slug === slug);
}

/* Helper: generate prompt dari template + user inputs + profile */
export function generatePrompt(
  task: TaskDef,
  inputs: Record<string, string>,
  profil: Profil
): string {
  let prompt = task.promptTemplate;

  // Replace profile placeholders (from isiPrompt)
  prompt = isiPrompt(prompt, profil);

  // Replace user input placeholders
  for (const field of task.fields) {
    const val = inputs[field.name] || "";
    prompt = prompt.replaceAll(`{${field.name}_input}`, val);
    // Also replace bare field name if used directly
    prompt = prompt.replaceAll(`{${field.name}}`, val || `{${field.name}}`);
  }

  return prompt;
}
