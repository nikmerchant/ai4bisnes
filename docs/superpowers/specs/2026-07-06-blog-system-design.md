# Sistem Blog AI4Bisnes

Status: Diluluskan user (6 Julai 2026), sedia untuk pelan implementasi.

## Tujuan

Tarik organic lead melalui SEO — artikel blog BM ikut kata kunci SME
Malaysia. Kandungan dijana draf secara mingguan (Claude), disemak manusia
sebelum publish — sejajar corak retention/kempen sedia ada dalam projek ni
(rujuk [[ai4bisnes-feature-roadmap]]).

## Keputusan yang dikunci

- **Topik:** senarai sekali-jalan (~15-20 topik), bukan keputusan setiap
  minggu. Cadangan dari kata kunci "AI untuk bisnes Malaysia" bersilang 10
  kategori app sedia ada (F&B, Runcit, dsb.).
- **Approval:** draf disimpan dalam folder berasingan (belum live/belum
  dalam sitemap), scheduled task hantar ringkasan untuk kelulusan — ikut
  pola tepat `pek-kempen-bulanan` sedia ada.
- **Jadual:** Khamis petang, mingguan.
- **Gambar hero:** dijana AI setiap artikel, gaya konsisten palet jenama
  (violet-600/zinc-950, sama arahan seni `opengraph-image.tsx`).
- **URL:** `/blog/[slug]` rata — tiada sub-kategori folder. Tag hanya label
  paparan di listing.
- **Tiada:** CMS/admin UI, komen, auto-publish tanpa kelulusan manusia.

## Seni bina

### 1. Format kandungan

- Fail `content/blog/<slug>.md` — frontmatter YAML (`title`, `description`,
  `date`, `tags: string[]`, `heroImage: string` path relatif ke
  `public/blog/`).
- Parse guna `gray-matter` (frontmatter) + `marked` (Markdown→HTML) — dua
  dependency baharu sahaja (belum ada `@next/mdx` dalam projek, dan tak
  perlu — kandungan blog prosa sahaja, tiada komponen React tersisip).
- Draf belum-lulus disimpan `content/blog/drafts/<slug>.md` — dibaca
  terpisah dari `content/blog/*.md` (yang live), supaya draf TAK muncul di
  listing/sitemap secara automatik.

### 2. Senarai topik

- Fail `content/blog/topik-senarai.md` — senarai bullet, setiap baris
  `- [ ] Tajuk topik` / `- [x] Tajuk topik (dah ditulis, slug: xxx)`.
- Saya sediakan draf senarai pertama (15-20 topik) semasa fasa
  implementasi, minta kelulusan user sekali sebelum proses mingguan mula
  guna senarai ni.

### 3. Proses mingguan (scheduled task baharu `blog-mingguan`)

Cron Khamis petang. Sama pola dengan `pek-kempen-bulanan` (rujuk fail
sedia ada `C:\Users\USER\.claude\scheduled-tasks\pek-kempen-bulanan\SKILL.md`):

1. Baca `content/blog/topik-senarai.md`, ambil topik pertama bertanda
   `- [ ]` (belum ditulis).
2. Tulis artikel 600-900 patah perkataan BM, konteks Malaysia (RM, contoh
   tempatan), 1-2 pautan dalaman lembut (`/daftar` atau kategori app
   berkaitan) sebagai CTA — bukan hard-sell.
3. Jana gambar hero (guna tool image-generation MCP sedia ada — arahan
   seni: gelap zinc-950/gradient violet, sama nada dengan
   `opengraph-image.tsx`), simpan `public/blog/<slug>.png`.
4. Tulis fail draf `content/blog/drafts/<slug>.md`.
5. Tandakan topik `- [x]` dalam `topik-senarai.md` (elak duplikat topik
   minggu depan walaupun draf belum lulus).
6. **JANGAN commit/push.** Laporkan kepada user: tajuk + 2-3 ayat intro +
   nota gambar hero dah dijana, minta kelulusan eksplisit sebelum publish
   (sama disiplin macam `pek-kempen-bulanan` — kandungan customer-facing
   perlu manusia lulus).

### 4. Publish

Bila user kata "ok publish" (dalam mana-mana sesi akan datang): alih fail
draf dari `content/blog/drafts/<slug>.md` ke `content/blog/<slug>.md`,
commit, push — Vercel auto-deploy ambil alih (sama pola git sedia ada
seluruh projek ni).

### 5. Halaman

- `/blog` — listing: baca semua `.md` dalam `content/blog/` (bukan
  `drafts/`), susun `date` menurun, papar kad (gambar hero, tajuk, tarikh,
  tag sebagai `<span>` label).
- `/blog/[slug]` — artikel penuh, guna `AuthShell`-style nav/footer
  (liquid-glass nav sama dengan landing), render HTML dari `marked`.
- `sitemap.ts` (sedia ada) — tambah loop baca semua slug live, masukkan
  URL `https://ai4bisnes.com/blog/<slug>` dengan `lastModified` dari
  frontmatter `date`.
- JSON-LD `Article` schema per halaman `/blog/[slug]` (headline,
  datePublished, image, author Organization AI4Bisnes) — ikut pola
  `JSON_LD` sedia ada di `page.tsx`.
- OG image per artikel: guna `heroImage` yang dijana (bukan
  `opengraph-image.tsx` generik) untuk preview medsos lebih relevan.

## Ralat & kes tepi

- **Topik habis** (semua `- [x]` dalam senarai): scheduled task laporkan
  "senarai topik dah habis, sila tambah topik baharu" — tiada auto-generate
  topik baharu tanpa kelulusan (elak topik generik/tak relevan).
- **Gambar hero gagal dijana:** artikel tetap disediakan sebagai draf,
  laporkan "gambar hero gagal, guna OG generik buat sementara" — jangan
  block seluruh draf sebab satu kegagalan imej.
- **Draf tak diluluskan >1 minggu:** tiada tindakan automatik — proses
  minggu depan tulis topik SETERUSNYA (bukan retry draf lama), draf lama
  kekal dalam folder sehingga user putuskan.

## Ujian (self-check minimum)

- Selepas implementasi, jalankan skrip mingguan SEKALI secara manual
  (bukan tunggu Khamis) dengan satu topik ujian, sahkan: (a) fail draf
  tercipta di `content/blog/drafts/`, (b) TIDAK muncul di `/blog` atau
  `sitemap.xml` semasa draf, (c) selepas "publish" manual (alih fail),
  MUNCUL di kedua-dua.
