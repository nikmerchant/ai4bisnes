---
name: blog-mingguan
description: Auto-tulis & auto-publish artikel blog AI4Bisnes — 3x seminggu (Isnin/Rabu/Jumaat)
workdir: /root/projects/ai4bisnes
---

Anda membantu produk AI4Bisnes (ai4bisnes.com) — koleksi prompt AI Bahasa Melayu untuk SME Malaysia. Direktori kerja: /root/projects/ai4bisnes.

TUGAS: Tulis DAN PUBLISH **SATU** artikel blog SAHAJA. JANGAN tulis lebih dari satu artikel dalam satu run. Ini AUTO-PUBLISH — jangan tunggu kelulusan tambahan.
    ⚠️ STRATEGI SEO: Post mesti berselerak — jika hari Isnin, tulis untuk Isnin; jika Rabu, untuk Rabu; jika Jumaat, untuk Jumaat. JANGAN post semua sekali gus.

1. Baca content/blog-topik-senarai.md. Ambil topik PERTAMA bertanda "- [ ]" dari atas.
2. Jana slug dari topik (huruf kecil, tanda sengkang, buang aksara khas).
3. Tulis artikel **700-900 patah perkataan** BM, konteks Malaysia (RM, contoh tempatan):
   - **Answer-First**: bawah setiap H2/H3, terus letak jawapan paling ringkas kepada soalan teras subtajuk tu.
   - **Machine Readability**: perenggan pendek (2-3 ayat), guna bullet points, numbered lists, dan **bold** untuk key takeaways.
   - **Question-Driven Headings**: guna soalan panjang spesifik sebagai H2 (cth: "Macam Mana Nak Buat Prompt ChatGPT Untuk Kedai Makanan?") — elak heading generic macam "Pengenalan" atau "Kesimpulan".
   - **WAJIB**: sekurang-kurangnya SATU subtajuk dalam bentuk soalan penuh dengan "?" (penting untuk GEO/AEO).
   - **WAJIB E-E-A-T**: back content dengan data asli, cite primary sources, link ke authority websites (MDEC, LHDN, Bank Negara, Google, Meta). Tambah author bio ringkas di hujung post.
   - **FAQ komprehensif**: hujung post mesti ada FAQ section dengan **10-15 soalan** berkaitan follow-up queries, bukan 3-5 je. Format Q&A ringkas.
   - Satu perspektif/contoh asli spesifik SME Malaysia.
   - **GEO check**: guna BM semulajadi, elak frasa kaku/translation-ese seperti "ia adalah", "merupakan", "bagi". Guna ayat pendek, conversational. English jargon dikekalkan bila kata itu lebih dikenali (ChatGPT, Instagram, Facebook) tapi jangan selit tanpa perlu.
   - 1-2 pautan dalaman lembut ke /daftar sebagai CTA primer.
   - CTA kedua: cross-promote ke blog Cakna AI (https://caknaai.com/blog/).
   - JANGAN guna **bold** sebagai ganti heading/senarai.
4. Sediakan 3-5 FAQ (untuk frontmatter `faq:`, bukan body).
5. Jana gambar hero WAJIB guna Higgsfield CLI — **prompt MESTI berdasarkan topik blog**, bukan generic:
   ```
   # Bina prompt unik berdasarkan topik + 3 keyword dari artikel
   PROMPT="Ilustrasi editorial digital untuk SME Malaysia, tema $(echo '<topik>' | head -c60), aksen ungu/violet, gaya minimalis profesional, ruang negatif luas, NO text NO people NO logo, berkualiti tinggi"
   job_id=$(higgsfield generate create flux_2 --prompt "$PROMPT" --json | grep -oP '[a-f0-9-]{36}')
   sleep 30
   result_url=$(higgsfield generate get $job_id --json | grep -oP '"result_url":"\K[^"]+')
   curl -sLo public/blog/<slug>.png "$result_url"
   ```
   Simpan sebagai public/blog/<slug>.png.
   JIKA GAGAL: cuba SEMULA dengan prompt berbeza. JANGAN teruskan tanpa hero image.
6. Tulis TERUS content/blog/<slug>.md dengan frontmatter:
   ---
   title: "<tajuk>"
   description: "<1 ayat meta description>"
   date: "<YYYY-MM-DD>"
   tags: ["<1-2 tag>"]
   heroImage: "/blog/<slug>.png"
   faq:
     - q: "<soalan>"
       a: "<jawapan>"
   ---
7. Tandakan topik "- [x] <tajuk> (slug: <slug>)" dalam content/blog-topik-senarai.md.
8. Jalankan `npm run build` di /root/projects/ai4bisnes. KALAU gagal: betulkan, atau padam fail .md + kembalikan "- [ ]", laporkan BLOCKED.
9. Commit + push: `git add content/blog/<slug>.md public/blog/<slug>.png content/blog-topik-senarai.md && git commit -m "Terbit: <tajuk>" && git push origin master`.
10. Laporkan: tajuk, URL live (https://ai4bisnes.com/blog/<slug>), 2-3 ayat intro, dan status hero image.

KES TEPI: Kalau SEMUA topik dah "- [x]", laporkan "senarai habis" — JANGAN cipta topik sendiri.

Laporan dalam BM, ringkas.
