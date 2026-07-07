# Sistem Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blog `/blog` (Markdown dalam repo) untuk SEO organic lead, dengan proses draf mingguan automatik (scheduled task) yang perlukan kelulusan manusia sebelum publish.

**Architecture:** Fail `.md` (frontmatter YAML + body Markdown) dalam `content/blog/` dibaca oleh `src/lib/blog.ts` (guna `gray-matter` + `marked`), dipaparkan oleh `/blog` (listing) dan `/blog/[slug]` (artikel). Draf belum-lulus disimpan `content/blog/drafts/` (dipisah, tak dibaca oleh laluan awam/sitemap). Scheduled task `blog-mingguan` (luar skop kod — dikonfigur terus via MCP tool) tulis draf setiap Khamis, minta kelulusan sebelum sesiapa alih fail ke folder live.

**Tech Stack:** Next.js 16 App Router (Server Components), `gray-matter` (parse frontmatter), `marked` (Markdown→HTML). Tiada pangkalan data — semua fail sistem.

**Nota penting:** Direktori kerja `C:\Users\USER\Desktop\Claude\AI4Bisnes`. Domain production: `https://ai4bisnes.com`.

---

### Task 1: Pasang dependency & struktur folder

**Files:**
- Modify: `package.json`
- Create: `content/blog/.gitkeep`
- Create: `content/blog/drafts/.gitkeep`

- [ ] **Step 1: Pasang gray-matter dan marked**

Run: `npm install gray-matter marked`
Expected: `package.json` "dependencies" kini ada `gray-matter` dan `marked`.

- [ ] **Step 2: Cipta struktur folder kandungan**

Git tak jejak folder kosong — cipta placeholder:

```bash
mkdir -p content/blog/drafts
touch content/blog/.gitkeep content/blog/drafts/.gitkeep
```

- [ ] **Step 3: Semak build tidak rosak**

Run: `npm run build`
Expected: build berjaya (tiada perubahan kod lagi, cuma dependency baharu).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json content/blog/.gitkeep content/blog/drafts/.gitkeep
git commit -m "Tambah dependency blog (gray-matter, marked) & struktur folder"
```

---

### Task 2: Pustaka baca kandungan blog (`src/lib/blog.ts`)

**Files:**
- Create: `src/lib/blog.ts`

- [ ] **Step 1: Tulis pustaka**

```typescript
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type BlogFaq = { q: string; a: string };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO 'YYYY-MM-DD'
  tags: string[];
  heroImage: string; // path relatif ke /public, cth "/blog/nama-slug.png"
  faq: BlogFaq[];
  html: string;
};

// Baca satu fail .md (bukan drafts/) dan parse ke BlogPost.
function parseFile(slug: string): BlogPost {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    heroImage: data.heroImage ?? "/opengraph-image",
    faq: Array.isArray(data.faq) ? data.faq : [],
    html: marked.parse(content, { async: false }) as string,
  };
}

// Semua artikel LIVE (bukan drafts/), susun tarikh terbaru dulu.
export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const slugs = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
  return slugs
    .map(parseFile)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | null {
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return parseFile(slug);
}
```

- [ ] **Step 2: Cipta fail ujian sementara untuk sahkan pustaka jalan**

Cipta `content/blog/ujian-pustaka.md` (fail ujian sementara, akan dipadam step 4):

```markdown
---
title: "Ujian Pustaka Blog"
description: "Fail ujian untuk sahkan gray-matter + marked berfungsi"
date: "2026-01-01"
tags: ["ujian"]
heroImage: "/opengraph-image"
faq:
  - q: "Adakah ini ujian?"
    a: "Ya, fail ini akan dipadam selepas pengesahan."
---

## Tajuk Ujian

Ini **perenggan ujian** untuk sahkan Markdown diproses betul.

- Item senarai 1
- Item senarai 2
```

- [ ] **Step 3: Sahkan via skrip Node ad-hoc**

Run:
```bash
node -e "
const { getAllPosts, getPostBySlug } = require('./src/lib/blog.ts');
"
```

Nota: `src/lib/blog.ts` guna ESM `import` — Node tak boleh `require()` fail `.ts` terus. Sebaliknya sahkan via Next.js dev server: jalankan `npm run dev` (guna `preview_start` kalau ada akses browser tool), buka mana-mana Server Component sementara yang import `getAllPosts` (boleh guna halaman `/blog` dari Task 3 sekali gus — gabungkan pengesahan step ini dengan Task 3 Step 3 memandangkan tiada rangka ujian unit dalam projek ni).

Kalau tiada akses browser tool, sahkan sekurang-kurangnya `npx tsc --noEmit` lulus (semak jenis TypeScript sah):

Run: `npx tsc --noEmit src/lib/blog.ts`
Expected: tiada ralat jenis.

- [ ] **Step 4: Padam fail ujian**

```bash
rm content/blog/ujian-pustaka.md
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog.ts
git commit -m "Tambah pustaka baca kandungan blog (gray-matter + marked)"
```

---

### Task 3: Halaman senarai `/blog`

**Files:**
- Create: `src/app/blog/blog-shell.tsx`
- Create: `src/app/blog/page.tsx`

- [ ] **Step 1: Cipta komponen nav+footer dikongsi (`blog-shell.tsx`)**

Reuse gaya visual sedia ada dari landing (`src/app/page.tsx`) — nav ringkas (bukan hero aurora penuh, blog perlukan latar putih untuk bacaan) + footer sama persis.

```typescript
import Image from "next/image";
import Link from "next/link";
import { CtaSpinner } from "@/app/cta-spinner";

export function BlogNav() {
  return (
    <nav className="border-b border-zinc-200 bg-white px-6 py-4">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-zinc-900">
          AI4<span className="text-violet-600">BISNES</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/masuk"
            className="rounded-full px-2 py-2 font-medium text-zinc-600 transition-colors hover:text-zinc-900 active:opacity-70"
          >
            Log Masuk
            <CtaSpinner />
          </Link>
          <Link
            href="/daftar"
            className="rounded-full bg-violet-600 px-5 py-2 font-bold text-white transition-colors hover:bg-violet-700 active:opacity-80"
          >
            Daftar Percuma
            <CtaSpinner />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function BlogFooter() {
  return (
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
        </Link>{" "}
        ·{" "}
        <Link href="/hubungi" className="underline hover:text-white">
          Hubungi Kami
        </Link>
      </p>
      <div className="mt-5 flex items-center justify-center gap-2 opacity-70">
        <Image
          src="/brand/niagaiq-logo-dark.jpg"
          alt="NiagaIQ Technologies"
          width={28}
          height={28}
          className="rounded-sm"
        />
        <span>AI4Bisnes dikendalikan oleh NiagaIQ Technologies</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Cipta halaman listing**

```typescript
import Image from "next/image";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { BlogNav, BlogFooter } from "./blog-shell";

export const metadata = {
  title: "Blog — Tip & Panduan AI untuk Bisnes Malaysia",
  description:
    "Panduan praktikal guna AI (ChatGPT/Claude) untuk SME Malaysia — pemasaran, jualan, operasi, dan lagi.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="bg-white text-zinc-900">
      <BlogNav />
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">
          Blog <span className="text-violet-600">AI4Bisnes</span>
        </h1>
        <p className="mt-3 text-zinc-600">
          Tip & panduan praktikal guna AI untuk bisnes anda di Malaysia.
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            Belum ada artikel lagi. Sila kembali tidak lama lagi.
          </p>
        ) : (
          <div className="mt-10 flex flex-col gap-8">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="flex gap-5 rounded-2xl border border-zinc-200 p-4 transition-colors hover:border-violet-600"
              >
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  <Image
                    src={p.heroImage}
                    alt={p.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">
                    {new Date(p.date).toLocaleDateString("ms-MY")}
                  </p>
                  <h2 className="mt-1 font-bold">{p.title}</h2>
                  <p className="mt-1 text-sm text-zinc-600">{p.description}</p>
                  {p.tags.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BlogFooter />
    </div>
  );
}
```

- [ ] **Step 3: Semak build tidak rosak**

Run: `npm run build`
Expected: build berjaya, `/blog` muncul dalam senarai laluan (kemungkinan statik `○` sebab tiada input dinamik).

- [ ] **Step 4: Sahkan dalam preview (dengan fail ujian sementara)**

1. Cipta semula `content/blog/ujian-pustaka.md` (kandungan sama seperti Task 2 Step 2).
2. `preview_start` (kalau belum jalan), navigasi ke `/blog`.
3. `preview_snapshot` — sahkan tajuk "Ujian Pustaka Blog" muncul dalam senarai.
4. Padam `content/blog/ujian-pustaka.md` selepas sah.

- [ ] **Step 5: Commit**

```bash
git add src/app/blog/blog-shell.tsx src/app/blog/page.tsx
git commit -m "Tambah halaman senarai blog /blog"
```

---

### Task 4: Halaman artikel `/blog/[slug]`

**Files:**
- Create: `src/app/blog/[slug]/page.tsx`

- [ ] **Step 1: Cipta halaman**

```typescript
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { BlogNav, BlogFooter } from "../blog-shell";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      images: [post.heroImage],
      type: "article",
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: post.title,
        description: post.description,
        image: `https://ai4bisnes.com${post.heroImage}`,
        datePublished: post.date,
        author: { "@type": "Organization", name: "AI4Bisnes" },
      },
      ...(post.faq.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: post.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <div className="bg-white text-zinc-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <p className="text-sm">
          <Link href="/blog" className="text-zinc-500 underline hover:text-zinc-900">
            ← Kembali ke blog
          </Link>
        </p>
        <p className="mt-4 text-xs text-zinc-400">
          {new Date(post.date).toLocaleDateString("ms-MY")}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          {post.title}
        </h1>
        <div className="relative mt-6 aspect-[1200/630] w-full overflow-hidden rounded-2xl bg-zinc-100">
          <Image src={post.heroImage} alt={post.title} fill className="object-cover" />
        </div>
        <div
          className="prose prose-zinc mt-8 max-w-none prose-headings:font-extrabold prose-a:text-violet-600"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </main>
      <BlogFooter />
    </div>
  );
}
```

- [ ] **Step 2: Semak `@tailwindcss/typography` (`prose` classes) wujud**

Fail ini guna `prose prose-zinc` (plugin `@tailwindcss/typography`) untuk gaya artikel automatik (heading, senarai, blockquote). Semak sama ada plugin ni dah dipasang:

Run: `grep -r "typography" package.json`

- **Kalau TIADA output:** pasang — `npm install -D @tailwindcss/typography`, kemudian tambah ke `src/app/globals.css` (Tailwind v4 guna `@plugin` dalam CSS, bukan `tailwind.config.js`):

```css
@plugin "@tailwindcss/typography";
```

Tambah baris ni betul-betul selepas baris `@import "tailwindcss";` sedia ada di bahagian atas `globals.css`.

- [ ] **Step 3: Semak build tidak rosak**

Run: `npm run build`
Expected: build berjaya. Kalau `generateStaticParams` pulangkan array kosong (tiada artikel live lagi), itu normal — laluan `[slug]` masih sah, cuma tiada halaman statik dijana lagi.

- [ ] **Step 4: Sahkan dalam preview**

1. Cipta semula `content/blog/ujian-pustaka.md` (dari Task 2 Step 2).
2. Navigasi ke `/blog/ujian-pustaka` dalam preview.
3. `preview_snapshot` — sahkan tajuk, tarikh, gambar (guna fallback `/opengraph-image`), body ("Tajuk Ujian" sebagai h2, senarai 2 item) semua terpapar.
4. Padam `content/blog/ujian-pustaka.md` selepas sah.

- [ ] **Step 5: Commit**

```bash
git add src/app/blog/\[slug\]/page.tsx package.json package-lock.json src/app/globals.css
git commit -m "Tambah halaman artikel /blog/[slug] dengan JSON-LD Article+FAQPage"
```

---

### Task 5: Sitemap

**Files:**
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Tambah entri blog ke sitemap**

Baca fail sedia ada (`src/app/sitemap.ts`), tambah import dan entri baharu:

```typescript
import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts().map((p) => ({
    url: `https://ai4bisnes.com/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: "https://ai4bisnes.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://ai4bisnes.com/blog",
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://ai4bisnes.com/daftar",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://ai4bisnes.com/masuk",
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: "https://ai4bisnes.com/hubungi",
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...posts,
  ];
}
```

- [ ] **Step 2: Semak build tidak rosak**

Run: `npm run build`
Expected: build berjaya.

- [ ] **Step 3: Sahkan draf TIDAK muncul dalam sitemap**

1. Cipta `content/blog/drafts/ujian-draf.md` (kandungan sama seperti Task 2 Step 2, slug "ujian-draf").
2. `npm run build` semula, kemudian jalankan dev server dan buka `/sitemap.xml` dalam preview.
3. `preview_snapshot` atau `preview_eval` (`document.body.innerText`) — sahkan `ujian-draf` TIDAK muncul (sebab `getAllPosts()` baca `content/blog/` sahaja, bukan `content/blog/drafts/`).
4. Padam `content/blog/drafts/ujian-draf.md` selepas sah.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "Tambah artikel blog ke sitemap.xml"
```

---

### Task 6: Senarai topik pertama

**Files:**
- Create: `content/blog/topik-senarai.md`

- [ ] **Step 1: Tulis senarai 15-20 topik**

Draf senarai topik SEO silang 10 kategori app sedia ada (F&B, Runcit &
E-dagang, Servis & Profesional, Kecantikan & Kesihatan, Pendidikan &
Latihan, Hartanah, Automotif, Pelancongan & Hospitaliti, Pembinaan &
Kontraktor, Lain-lain) dengan kata kunci "AI untuk bisnes Malaysia":

```markdown
# Senarai Topik Blog AI4Bisnes

Format: `- [ ] Tajuk` (belum ditulis) / `- [x] Tajuk (slug: xxx)` (dah ditulis).
Proses mingguan (scheduled task `blog-mingguan`) ambil topik PERTAMA
bertanda `- [ ]` dari atas.

- [ ] Cara Guna ChatGPT untuk Tulis Caption Instagram Kedai Makanan
- [ ] 5 Prompt AI untuk Bantu Kedai Runcit Anda Jual Lebih Banyak di Shopee
- [ ] Macam Mana AI Boleh Bantu Perniagaan Servis Kurangkan Masa Balas Pelanggan
- [ ] Panduan Guna AI untuk Salon/Spa Tulis Post Promosi Tanpa Bunyi Generik
- [ ] Cara Guna ChatGPT untuk Tarik Pelajar Baharu ke Pusat Tuisyen/Latihan Anda
- [ ] 7 Prompt AI untuk Ejen Hartanah Tulis Iklan Rumah Lebih Menarik
- [ ] Panduan AI untuk Bengkel Automotif — Peringatan Servis & Post Medsos
- [ ] Cara Guna AI untuk Homestay/Resort Tulis Deskripsi Booking Lebih Menjual
- [ ] Prompt AI untuk Kontraktor Tulis Sebut Harga Nampak Profesional
- [ ] Kenapa Jawapan ChatGPT "Tak Kena" Dengan Bisnes Anda — Dan Cara Betulkan
- [ ] Cara Ajar AI Faham Bisnes Anda dalam 5 Minit (Panduan Master Instruction)
- [ ] AI vs Copywriter — Bila Patut Guna AI, Bila Patut Upah Manusia
- [ ] Cara Guna AI untuk SME Tulis Emel Susulan Pelanggan Yang Tak Jadi Beli
- [ ] Prompt AI untuk Jawab Soalan Pelanggan di WhatsApp Business Lebih Pantas
- [ ] Panduan Guna AI untuk Rancang Kempen Medsos Bulan Perayaan (Raya/CNY/Merdeka)
- [ ] Cara Guna ChatGPT Percuma vs Berbayar — Beza Sebenar untuk Bisnes Kecil
- [ ] 5 Kesilapan SME Malaysia Bila Guna AI untuk Pemasaran (dan Cara Elak)
- [ ] Cara Guna AI untuk Tulis Deskripsi Produk Shopee/TikTok Shop Lebih Menjual
```

- [ ] **Step 2: Commit**

```bash
git add content/blog/topik-senarai.md
git commit -m "Tambah senarai topik pertama blog (18 topik, minta kelulusan user)"
```

**PENTING:** Selepas commit, laporkan kepada user (dalam sesi implementasi,
bukan tersembunyi dalam commit) — minta kelulusan senarai topik ni sebelum
scheduled task Task 7 mula guna ia. Kalau user nak ubah/tambah/buang topik,
edit terus fail `content/blog/topik-senarai.md`.

---

### Task 7: Scheduled task `blog-mingguan`

**Files:** Tiada fail kod — guna MCP tool `mcp__scheduled-tasks__create_scheduled_task` terus (sama macam `bayaran-komisen-affiliate` dan `pek-kempen-bulanan` sedia ada).

- [ ] **Step 1: Cipta scheduled task**

Panggil tool `create_scheduled_task` dengan:
- `taskId`: `"blog-mingguan"`
- `cronExpression`: `"0 17 * * 4"` (Khamis, 5 petang, waktu tempatan)
- `description`: `"Draf artikel blog mingguan AI4Bisnes — perlukan kelulusan sebelum publish"`
- `prompt`:

```
Anda membantu produk AI4Bisnes (ai4bisnes.com) — SaaS koleksi prompt AI
Bahasa Melayu untuk SME Malaysia. Direktori kerja: C:\Users\USER\Desktop\Claude\AI4Bisnes.

TUGAS: Tulis SATU draf artikel blog mingguan.

1. Baca content/blog/topik-senarai.md. Ambil topik PERTAMA yang bertanda
   "- [ ]" (belum ditulis) dari atas.
2. Jana slug dari topik (huruf kecil, tanda sengkang, buang aksara khas).
3. Tulis artikel 600-900 patah perkataan Bahasa Melayu, konteks Malaysia
   (RM, contoh tempatan), IKUT STRUKTUR WAJIB ini:
   - Perenggan pertama TERUS jawab soalan teras topik (2-4 ayat) — bukan
     intro umum/basa-basi.
   - Subtajuk H2/H3 deskriptif, perenggan pendek, guna senarai
     bullet/nombor untuk langkah/tip/pro-kontra.
   - Sekurang-kurangnya satu subtajuk dalam bentuk soalan panjang
     conversational (macam orang tanya AI assistant terus).
   - Sekurang-kurangnya satu pautan keluar ke sumber primer dipercayai
     (rasmi kerajaan Malaysia — LHDN/SSM/Bank Negara/MDEC — atau data
     industri) BILA relevan kepada topik.
   - Sisipkan sekurang-kurangnya satu perspektif/contoh asli spesifik
     konteks SME Malaysia (bukan fakta generik).
   - 1-2 pautan dalaman lembut ke /daftar atau kategori app berkaitan
     sebagai CTA — bukan hard-sell.
   - JANGAN guna **bold** sebagai ganti heading/senarai.
4. Sediakan 3-5 soalan+jawapan FAQ berkaitan topik (untuk frontmatter
   `faq:`, bukan dalam body markdown).
5. Jana gambar hero guna tool image-generation (mcp__d9c476af-...__generate_image
   — cari model sesuai guna models_explore dulu kalau belum tahu model ID,
   pilih model imej marketing/ilustratif). Arahan seni: gelap zinc-950
   dengan aksen gradient violet, konsisten dengan gaya jenama AI4Bisnes
   (rujuk src/app/opengraph-image.tsx untuk palet warna: #09090b, #1e1b4b,
   #7c3aed, #a78bfa). Selepas jana, muat turun & simpan sebagai
   public/blog/<slug>.png. KALAU GAGAL: teruskan tanpa gambar (guna
   heroImage: "/opengraph-image" dalam frontmatter), jangan block draf.
6. Tulis fail content/blog/drafts/<slug>.md dengan frontmatter:
   ---
   title: "<tajuk>"
   description: "<1 ayat ringkasan, untuk meta description>"
   date: "<tarikh hari ini format YYYY-MM-DD>"
   tags: ["<1-2 tag ringkas, cth kategori bisnes berkaitan>"]
   heroImage: "/blog/<slug>.png"
   faq:
     - q: "<soalan 1>"
       a: "<jawapan 1>"
     - q: "<soalan 2>"
       a: "<jawapan 2>"
   ---
   <body markdown artikel>
7. Tandakan topik "- [x] <tajuk> (slug: <slug>)" dalam
   content/blog/topik-senarai.md (gantikan baris "- [ ]" asal).
8. JANGAN commit/push. Laporkan kepada user (nikmerchant): tajuk artikel,
   2-3 ayat intro (perenggan jawapan-dulu), nota "gambar hero dah dijana"
   atau "gambar hero gagal, guna fallback". Minta kelulusan eksplisit
   sebelum publish — user akan balas "ok publish" pada sesi akan datang,
   dan pada masa itu: alih fail dari content/blog/drafts/<slug>.md ke
   content/blog/<slug>.md, commit, push.

KES TEPI:
- Kalau SEMUA topik dalam topik-senarai.md dah bertanda "- [x]": laporkan
  "senarai topik dah habis, sila tambah topik baharu ke
  content/blog/topik-senarai.md" — JANGAN cipta topik baharu sendiri
  tanpa kelulusan.

Bahasa laporan: Bahasa Melayu, ringkas dan terus ke intipati.
```

- [ ] **Step 2: Sahkan tugasan tercipta**

Panggil tool `list_scheduled_tasks`, sahkan `blog-mingguan` wujud dengan
`nextRunAt` betul (Khamis akan datang, 5 petang).

Nota: tiada commit git untuk step ini — scheduled task disimpan sebagai
fail `SKILL.md` oleh sistem sendiri di luar repo (`C:\Users\USER\.claude\scheduled-tasks\blog-mingguan\`), sama seperti `pek-kempen-bulanan` dan
`bayaran-komisen-affiliate` sedia ada.

---

### Task 8: Ujian hujung-ke-hujung penuh (self-check)

**Files:** Tiada fail baharu — pengesahan manual sahaja.

- [ ] **Step 1: Simulasi draf → publish penuh**

1. Cipta fail draf ujian secara manual: `content/blog/drafts/ujian-e2e.md`:
```markdown
---
title: "Ujian E2E Blog"
description: "Ujian aliran penuh draf ke publish"
date: "2026-07-06"
tags: ["ujian"]
heroImage: "/opengraph-image"
faq:
  - q: "Ini ujian?"
    a: "Ya."
---

Jawapan terus: ini fail ujian hujung-ke-hujung.

## Subtajuk

- Bullet satu
- Bullet dua
```
2. `npm run build` — sahkan `/blog` TIDAK papar "Ujian E2E Blog" (draf
   belum publish).
3. Buka `/sitemap.xml` — sahkan `ujian-e2e` TIDAK ada.
4. Alih fail: `mv content/blog/drafts/ujian-e2e.md content/blog/ujian-e2e.md`
5. `npm run build` semula — sahkan `/blog` KINI papar "Ujian E2E Blog", dan
   `/blog/ujian-e2e` boleh diakses (guna preview: navigasi terus, sahkan
   tajuk, FAQ, body semua betul).
6. Sahkan `/sitemap.xml` KINI ada `ujian-e2e`.
7. **Bersihkan:** `rm content/blog/ujian-e2e.md`, `npm run build` semula
   sahkan dah hilang dari `/blog` dan sitemap.

- [ ] **Step 2: Commit (jika ada perubahan bersih dari pembersihan)**

```bash
git status
```

Kalau tiada perubahan (fail ujian memang tak pernah masuk git kerana
dipadam sebelum commit), tiada commit diperlukan untuk task ini.

---

## Self-Review (dijalankan semasa tulis pelan ini)

- **Liputan spec:** format kandungan ✅ (Task 2), draf/live pemisahan ✅
  (Task 2+8), struktur GEO/AEO wajib ✅ (Task 7 prompt), senarai topik ✅
  (Task 6), proses mingguan ✅ (Task 7), publish flow ✅ (didokumentasi
  dalam Task 7 prompt + disahkan Task 8), halaman listing+artikel ✅
  (Task 3+4), sitemap ✅ (Task 5), JSON-LD Article+FAQPage ✅ (Task 4).
- **Placeholder:** tiada TBD/TODO ditemui.
- **Konsistensi jenis:** `BlogPost`, `BlogFaq`, `getAllPosts()`,
  `getPostBySlug()` digunakan konsisten across Task 2, 3, 4, 5.
- **Nota skop:** Task 7 (scheduled task) TIADA langkah "test/verify" kod
  formal sebab ia bukan kod — kandungan prompt itu sendiri ialah
  "spesifikasi tingkah laku" yang disahkan hanya bila ia benar-benar
  jalan Khamis pertama. Ini diterima memandangkan `pek-kempen-bulanan`
  dan `bayaran-komisen-affiliate` sedia ada pun sama (tiada unit test
  untuk scheduled task prompt, hanya pengesahan tingkah laku pertama run).
