---
title: "Prompt AI untuk Buat Reminder Hutang dan Invois Tertunggak: Lembut ke Tegas"
description: "Draf reminder invois tertunggak dengan AI, daripada sopan hingga tegas, selepas semak baki, bayaran separa dan pertikaian pelanggan."
date: "2026-10-30"
tags: ["Operasi SME", "Prompt AI"]
heroImage: "/blog/prompt-ai-untuk-buat-reminder-hutang-invois-tertunggak-lembut-ke-tegas.png"
faq:
  - q: "Boleh AI tentukan jumlah hutang pelanggan?"
    a: "Jangan jadikan jawapan AI rekod kewangan. Semak baki melalui invois, bayaran diterima dan nota kredit yang disahkan."
  - q: "Bagaimana mahu reminder tegas tanpa mengugut?"
    a: "Nyatakan nombor invois, baki yang disahkan dan permintaan tarikh bayaran. Jangan tambah penalti atau tindakan yang belum diluluskan."
  - q: "Adakah prompt ini menghantar WhatsApp secara automatik?"
    a: "Tidak. Prompt menyediakan draf untuk semakan manusia; penghantaran automatik memerlukan sistem dan kawalan berasingan."
  - q: "Apa perlu dibuat jika pelanggan mempertikaikan invois?"
    a: "Hentikan reminder kutipan biasa dan serahkan isu kepada staf yang boleh menyemak dokumen serta meluluskan penyelesaian."
---

AI boleh membantu menulis reminder invois yang sopan atau tegas, tetapi jumlah yang dituntut mesti datang daripada rekod yang sudah disemak. **Tentukan baki dan status kes dahulu, kemudian pilih nada mesej.** Cara ini mengelakkan pelanggan yang sudah membayar menerima tuntutan kali kedua.

## Apa perlu disemak sebelum minta AI tulis reminder invois tertunggak?

Semak nombor invois, tarikh matang, bayaran diterima, nota kredit dan sebarang pertikaian. Jangan terus menyalin angka daripada senarai jualan kerana jumlah asal mungkin sudah berubah.

Gunakan satu baris untuk setiap invois dalam Google Sheets. Rekodkan juga tarikh semakan dan staf yang bertanggungjawab. Jika bayaran belum dapat dipadankan dengan invois tertentu, tahan draf sehingga semakan selesai.

| Medan | Perkara yang perlu dipastikan |
|---|---|
| ID invois | Unik dan sepadan dengan dokumen pelanggan |
| Baki disahkan | Jumlah asal ditolak bayaran serta nota kredit sah |
| Status kes | Terbuka, selesai atau dipertikaikan |
| Susulan terakhir | Tarikh, saluran dan respons pelanggan |
| Pemilik kes | Staf yang meluluskan mesej seterusnya |

Dokumentasi [FILTER Google Sheets](https://support.google.com/docs/answer/3093197?hl=en) menerangkan cara memaparkan baris yang memenuhi syarat. Anda boleh menapis invois terbuka untuk disemak, tetapi hasil tapisan tidak mengesahkan wang sudah masuk atau memberi kebenaran menghantar mesej.

## Bagaimana bayaran separa mengubah jumlah yang patut disebut?

Gunakan baki selepas semua pelarasan disahkan. Reminder berdasarkan jumlah invois asal boleh terlebih tuntut walaupun ayatnya cukup sopan.

Contoh rekaan: sebuah studio reka bentuk di Shah Alam mengeluarkan INV-101 sebanyak RM1,200. Pelanggan sudah membayar RM400 dan menerima nota kredit RM100. Baki yang patut disebut ialah RM700.

Semakan pengiraan menggunakan skrip untuk contoh ini menghasilkan RM700. Dua kes tambahan turut disemak: invois RM900 yang dibayar penuh menghasilkan baki sifar, manakala invois RM650 yang dipertikaikan ditandakan untuk semakan, bukan reminder biasa. Ini ujian pengiraan dan aturan contoh, bukan bukti prompt AI sudah diuji atau wang sebenar diterima.

Sebelum menghantar, padankan semula baki dengan rekod terkini. Pelanggan mungkin baru membayar selepas senarai pagi disediakan. Tutup kes hanya selepas bukti bayaran disahkan, bukan kerana pelanggan membalas “done”.

## Prompt apa sesuai untuk reminder pertama yang lembut?

Minta AI menyediakan satu mesej pendek berasaskan fakta yang diluluskan sahaja. Gantikan nama dan butiran sensitif dengan kod semasa mendraf.

```text
Anda membantu staf akaun mendraf reminder BM untuk pelanggan SME.
Data disahkan: pelanggan P-17, invois INV-101, baki RM700,
tarikh matang [tarikh sebenar], tarikh semakan [tarikh sebenar].
Status: tiada pertikaian; reminder pertama.
Tulis mesej sopan maksimum 70 perkataan. Minta pelanggan mengesahkan
status bayaran. Jika sudah membayar, minta rujukan transaksi melalui
saluran biasa. Jangan cipta penalti, tarikh atau janji diskaun.
Jika mana-mana tarikh kosong, senaraikan maklumat yang perlu dilengkapkan
sebelum mesej boleh dihantar. Hasilkan draf sahaja.
```

Contoh wording editorial, bukan output ujian AI: “Salam, kami membuat susulan invois INV-101 dengan baki RM700. Boleh sahkan status bayaran? Jika sudah dibuat, mohon kongsi rujukan transaksi melalui saluran biasa supaya kami boleh padankan rekod. Terima kasih.”

Masukkan tarikh matang sebenar selepas semakan. Jangan biarkan placeholder terhantar kepada pelanggan.

## Bila patut tukar kepada reminder yang lebih tegas?

Tukar nada selepas tempoh susulan dalaman yang dipersetujui berlalu dan tiada pertikaian terbuka. Bilangan hari bergantung pada terma kredit serta dasar syarikat, bukan cadangan AI.

Tambah arahan ini kepada prompt:

```text
Ini susulan kedua. Rujuk mesej pada [tarikh yang disahkan].
Minta pengesahan tarikh bayaran sebelum [tarikh respons diluluskan].
Nada jelas dan profesional. Jangan mengugut, memalukan pelanggan,
atau mendakwa tindakan undang-undang sudah bermula.
Jangan tawarkan ansuran, caj lewat atau penggantungan servis tanpa
arahan bertulis pihak yang berkuasa meluluskannya.
```

Bezakan tarikh respons daripada tarikh bayaran. Anda boleh meminta pelanggan memberi jawapan pada Jumaat tanpa mendakwa kontrak mewajibkan bayaran pada hari itu. Jika mereka meminta ansuran, staf perlu mendapatkan kelulusan sebelum menjanjikan jumlah atau jadual baharu.

## Apa perlu dibuat jika invois dipertikaikan atau data pelanggan sensitif?

Hentikan aliran reminder biasa untuk kes dipertikaikan. Minta staf menyemak skop kerja, bukti serahan dan pelarasan yang dipersetujui sebelum meneruskan kutipan.

Masukkan hanya data minimum ke dalam prompt. Elakkan nombor kad pengenalan, akaun bank penuh, alamat rumah atau keseluruhan penyata pelanggan. [Data Controls OpenAI](https://help.openai.com/en/articles/7730893-data-controls-faq) menerangkan kawalan latihan model; mematikan tetapan tersebut tidak memadam sejarah chat. Tetapan privasi juga tidak menggantikan kebenaran syarikat untuk memproses data.

Lantik seorang pemilik kes supaya dua staf tidak menghantar reminder serentak. Simpan draf diluluskan, masa penghantaran dan respons dalam rekod dalaman yang aksesnya terhad. Prompt ini tidak menyambungkan ChatGPT ke WhatsApp, tidak membaca bank dan tidak menghantar mesej secara automatik.

Anda boleh [daftar AI4Bisnes](/daftar) untuk meneroka bahan prompt bisnes. Untuk panduan kerja AI yang lain, baca [blog Cakna AI](https://caknaai.com/blog/). Mulakan dengan satu invois yang tidak dipertikaikan dan semak setiap fakta sebelum menekan hantar.

## FAQ

### Boleh guna prompt ini untuk pelanggan individu?

Boleh untuk mendraf komunikasi, tetapi semak terma, dasar privasi dan keadaan kes. Panduan ini bukan nasihat undang-undang atau lesen menjalankan kutipan hutang.

### Perlu akaun ChatGPT berbayar?

Aliran ini memerlukan fungsi mendraf teks sahaja. Semak akses dan had akaun anda; tiada ciri berbayar tertentu yang diwajibkan oleh contoh prompt.

### Berapa hari selepas tarikh matang patut hantar reminder?

Ikut terma kredit dan dasar syarikat yang diluluskan. Artikel ini tidak menetapkan sela universal kerana pelanggan dan kontrak boleh berbeza.

### Boleh minta AI kira baki terus daripada screenshot?

Elakkan menjadikannya pengesahan akhir. Bacaan gambar boleh tersilap, dan screenshot mungkin tidak mengandungi bayaran terkini atau nota kredit.

### Bagaimana jika pelanggan sudah bayar tetapi wang belum dipadankan?

Tahan reminder seterusnya. Minta staf menyemak rujukan transaksi dan invois berkaitan sebelum menandakan kes selesai atau menuntut semula.

### Boleh gabungkan beberapa invois dalam satu mesej?

Boleh selepas setiap invois disemak. Senaraikan ID dan baki berasingan supaya pelanggan tahu bayaran mana yang masih perlu dijelaskan.

### Bolehkah reminder mengandungi caj lewat?

Jangan tambah caj daripada cadangan AI. Semak terma yang sah dan dapatkan kelulusan pihak yang bertanggungjawab sebelum menyatakannya.

### Apa beza tegas dengan mengugut?

Mesej tegas menyatakan fakta dan permintaan respons dengan jelas. Ugutan menambah tekanan atau akibat yang tidak disahkan atau belum diluluskan.

### Boleh AI terus menawarkan bayaran ansuran?

Tidak tanpa kelulusan. AI boleh mendraf pilihan yang sudah diluluskan, tetapi tidak patut mencipta jadual atau mengikat syarikat pada tawaran baharu.

### Adakah FILTER Google Sheets menghantar reminder?

Tidak. Fungsi itu menapis data mengikut syarat. Penghantaran memerlukan tindakan manusia atau sistem berasingan dengan kawalan yang sesuai.

### Bagaimana elak dua staf mengejar invois sama?

Tetapkan seorang pemilik kes dan rekod susulan terakhir. Semak rekod itu sebelum penghantaran; spreadsheet bersama sahaja tidak mengunci tindakan serentak.

### Adakah contoh mesej ini hasil ujian ChatGPT sebenar?

Tidak. Mesej ditulis sebagai contoh editorial. Ujian skrip yang dinyatakan hanya menyemak pengiraan baki dan aturan kes rekaan.

Tentang penulis: Tuan Nik, pengasas NiagaIQ Technologies Sdn Bhd, berkongsi panduan penggunaan AI tanpa kod untuk operasi dan pemasaran SME Malaysia.
