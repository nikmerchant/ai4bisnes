---
title: "AI untuk Urus Stok Inventori: Guna Spreadsheet dan ChatGPT Tanpa Software Mahal"
description: "Cara praktikal untuk SME Malaysia menyusun stok, mengesan barang perlahan dan merancang pesanan semula dengan Google Sheets serta ChatGPT."
date: "2026-08-26"
tags: ["AI untuk SME", "Pengurusan Inventori"]
heroImage: "/blog/ai-urus-stok-inventori-spreadsheet-chatgpt-tanpa-software-mahal.png"
faq:
  - q: "Boleh ke ChatGPT mengurus inventori secara automatik?"
    a: "ChatGPT boleh menganalisis salinan data dan mencadangkan tindakan, tetapi rekod stok tetap perlu dikemas kini dalam spreadsheet atau sistem anda."
  - q: "Perlu beli software inventori sebelum guna AI?"
    a: "Tidak semestinya. SME dengan stok yang masih terkawal boleh bermula dengan Google Sheets dan proses kemas kini yang konsisten."
  - q: "Data apa yang diperlukan untuk analisis stok?"
    a: "Mulakan dengan SKU, nama barang, stok semasa, jualan tempoh dipilih, kos, harga jual dan tempoh mendapatkan stok baharu."
  - q: "Selamat ke salin data stok ke ChatGPT?"
    a: "Buang data peribadi, kata laluan, nombor akaun dan maklumat sensitif yang tidak diperlukan sebelum berkongsi data dengan alat AI."
---

SME boleh mula mengurus stok dengan satu spreadsheet yang kemas dan ChatGPT sebagai pembantu analisis. Anda tak perlu terus membeli software mahal. Rekod pergerakan barang dengan konsisten, kemudian minta AI mencari stok perlahan, barang hampir habis dan cadangan pesanan semula.

**AI tak menggantikan kiraan stok fizikal.** AI membantu anda membaca corak dalam data supaya keputusan belian dibuat lebih cepat dan kurang bergantung pada ingatan.

## Data Apa Yang Perlu Ada Sebelum ChatGPT Boleh Membantu?

ChatGPT perlukan jadual yang konsisten. Satu baris mewakili satu produk atau SKU, manakala setiap lajur menyimpan jenis maklumat yang sama.

Mulakan dengan lajur ini:

- SKU atau kod produk;
- nama produk;
- stok semasa;
- unit terjual dalam 30 hari;
- kos seunit dan harga jual;
- tempoh menunggu stok baharu dalam hari;
- stok minimum;
- tarikh kemas kini terakhir.

Elakkan nama produk yang berubah-ubah seperti “Kopi A”, “kopi-a” dan “Kopi A 250g”. Pilih satu format supaya AI tak menganggapnya sebagai tiga barang berbeza. **Data yang seragam lebih penting daripada spreadsheet yang cantik.**

## Macam Mana Nak Susun Spreadsheet Inventori Yang Mudah Dibaca?

Buat satu tab untuk rekod semasa dan satu tab untuk transaksi masuk atau keluar. Jangan campurkan nota pembekal, rekod jualan dan kiraan stok dalam sel yang sama.

Gunakan dropdown untuk kategori dan status. Formula mudah pula boleh mengira nilai stok, contohnya `stok semasa × kos seunit`. Jika senarai semakin panjang, [pivot table dalam Google Sheets](https://support.google.com/docs/answer/1272900?hl=en) boleh menapis set data besar dan menunjukkan hubungan antara data, termasuk hasil jualan mengikut tempoh.

Tetapkan satu masa kemas kini. Kedai makanan sejuk beku di Shah Alam, misalnya, boleh merekod penerimaan stok setiap pagi dan jualan pada waktu tutup. Proses yang sama setiap hari mengurangkan baris tertinggal.

## Prompt Apa Yang Sesuai untuk Analisis Stok Inventori?

Minta AI menjawab soalan operasi yang khusus. Arahan seperti “analisis stok saya” terlalu umum dan mudah menghasilkan nasihat yang tak boleh terus digunakan.

Salin prompt ini, kemudian tampal 10 hingga 30 baris data yang sudah dibersihkan:

```text
Anda membantu pemilik SME runcit di Malaysia menyemak inventori.
Analisis jadual di bawah untuk tempoh 30 hari.

Untuk setiap SKU:
1. kira anggaran hari stok akan bertahan berdasarkan jualan purata harian;
2. tandakan risiko kehabisan stok sebelum pesanan baharu tiba;
3. kenal pasti barang yang jualannya perlahan;
4. cadangkan kuantiti pesanan semula secara konservatif.

Gunakan andaian ini:
- tempoh menunggu pembekal: [X] hari
- stok keselamatan: [X] hari jualan
- bajet pesanan maksimum: RM[X]

Jangan cipta data yang tiada. Nyatakan andaian dan paparkan hasil dalam jadual.
Data:
[tampal data di sini]
```

Semak semula formula dan angka yang diberi. Jika AI membuat andaian yang tak sesuai, ubah prompt dan jalankan analisis semula. **Keputusan akhir tentang kuantiti belian kekal pada pemilik bisnes.**

## Bagaimana Nak Tentukan Barang Yang Perlu Dipesan Semula?

Utamakan barang yang dijangka habis sebelum stok baharu tiba. Bandingkan jualan purata harian, stok semasa, tempoh menunggu pembekal dan stok keselamatan.

Contohnya, sebuah kedai aksesori telefon di Kota Bharu menjual purata empat kabel sehari. Stok semasa tinggal 28 unit, sementara pembekal mengambil masa 10 hari. Stok itu dijangka bertahan tujuh hari, jadi risiko kehabisan berlaku sebelum pesanan baharu sampai.

Jangan terus menambah semua stok yang bergerak pantas. Masukkan bajet tunai dan kapasiti simpanan dalam prompt. Barang laris dengan margin kecil masih boleh menekan cashflow jika anda membeli terlalu banyak.

## Data Mana Yang Tak Patut Dikongsi Dengan Alat AI?

Kongsi data minimum yang diperlukan untuk analisis. Padam nama pelanggan, nombor telefon, alamat, butiran bank, kata laluan dan apa-apa maklumat peribadi yang tak berkaitan dengan stok.

[Jabatan Perlindungan Data Peribadi](https://www.pdp.gov.my/ppdpv1/prinsip-perlindungan-data-peribadi/) menerangkan tujuh prinsip di bawah Akta 709, termasuk keselamatan, penyimpanan dan akses. Gantikan nama pembekal dengan kod seperti `SUP-01` jika identiti sebenar tak diperlukan. Simpan salinan asal dalam tempat yang aksesnya dikawal.

## Berapa Kerap SME Patut Jalankan Semakan Inventori?

Semakan ringkas setiap minggu biasanya cukup untuk mengesan barang hampir habis dan stok perlahan. Barang mudah rosak atau bergerak pantas mungkin perlu diperiksa setiap hari.

Gunakan rutin 20 minit ini:

1. kemas kini stok masuk, jualan dan kerosakan;
2. semak SKU yang jatuh di bawah stok minimum;
3. jalankan prompt analisis dengan data terkini;
4. sahkan cadangan dengan kiraan fizikal dan bajet;
5. rekod keputusan pesanan supaya mudah diaudit minggu depan.

Selepas empat minggu, bandingkan cadangan AI dengan jualan sebenar. Laraskan tempoh analisis atau stok keselamatan jika cadangan terlalu tinggi. Jika anda mahu prompt BM siap guna untuk kerja operasi lain, cuba [AI4Bisnes](/daftar). Untuk panduan AI tanpa kod yang lebih luas, baca [blog Cakna AI](https://caknaai.com/blog/).

## FAQ

### Boleh ke ChatGPT mengurus inventori secara automatik?

ChatGPT boleh menganalisis data yang anda beri dan mencadangkan tindakan. Rekod stok masih perlu dikemas kini dalam spreadsheet atau melalui integrasi yang anda kawal.

### Perlu beli software inventori terlebih dahulu?

Tak semestinya. Google Sheets sesuai untuk operasi kecil yang mempunyai bilangan SKU terkawal dan seorang pemilik proses yang konsisten.

### Berapa banyak data perlu diberi kepada AI?

Mulakan dengan data 30 hari untuk 10 hingga 30 SKU. Tambah tempoh apabila anda mahu melihat corak bermusim atau jualan yang tak tetap.

### Apa beza stok minimum dengan stok keselamatan?

Stok minimum ialah paras yang mencetuskan semakan atau pesanan. Stok keselamatan ialah unit tambahan untuk menampung kelewatan pembekal atau lonjakan jualan.

### Boleh guna Excel selain Google Sheets?

Boleh. Prinsip susunan data sama, asalkan setiap lajur konsisten dan fail boleh dieksport sebagai CSV jika diperlukan.

### Adakah AI boleh meramal jualan bulan depan?

AI boleh membuat anggaran berdasarkan data terdahulu dan andaian. Anggaran itu bukan jaminan, terutama apabila promosi, musim atau harga berubah.

### Bagaimana jika SKU produk tak konsisten?

Bersihkan dan seragamkan SKU sebelum analisis. Satu produk perlu mempunyai satu kod tetap untuk mengelakkan kiraan berganda.

### Perlukah kira stok fizikal?

Ya. Kiraan fizikal mengesan kehilangan, kerosakan, kesilapan rekod dan barang yang tersalah letak.

### Boleh ke AI mencadangkan kuantiti pesanan semula?

Boleh, jika anda memberi stok semasa, kadar jualan, tempoh menunggu, stok keselamatan dan had bajet. Semak cadangan sebelum membuat pesanan.

### Bagaimana nak kesan stok mati?

Tapis produk yang tiada jualan atau sangat perlahan dalam tempoh yang sesuai dengan industri anda. Semak margin, musim dan peluang bundle sebelum memberi diskaun.

### Selamat ke muat naik keseluruhan fail stok?

Lebih selamat berkongsi hanya lajur dan baris yang diperlukan. Buang data peribadi serta maklumat komersial sensitif yang tak membantu analisis.

### Bila patut beralih kepada software inventori khusus?

Pertimbangkan sistem khusus apabila SKU, lokasi, pengguna atau transaksi terlalu banyak untuk dikemas kini dengan tepat dalam satu spreadsheet.

## Tentang Penulis

Tuan Nik membangunkan AI4Bisnes untuk membantu SME Malaysia menggunakan AI dalam operasi, pemasaran dan jualan harian tanpa coding dan tanpa bajet besar.
