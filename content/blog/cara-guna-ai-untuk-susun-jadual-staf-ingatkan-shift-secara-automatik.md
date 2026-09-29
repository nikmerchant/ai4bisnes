---
title: "Cara Guna AI untuk Susun Jadual Staf dan Ingatkan Shift Secara Automatik"
description: "Panduan praktikal SME Malaysia menyusun roster staf dengan AI, Google Sheets dan peringatan Google Calendar tanpa sistem mahal."
date: "2026-09-30"
tags: ["AI Operasi", "Pengurusan Staf"]
heroImage: "/blog/cara-guna-ai-untuk-susun-jadual-staf-ingatkan-shift-secara-automatik.png"
faq:
  - q: "Bolehkah AI menentukan jadual staf sendiri?"
    a: "AI boleh mencadangkan roster daripada syarat yang diberi, tetapi penyelia perlu menyemak kelayakan, cuti, waktu kerja dan keperluan operasi sebelum jadual diterbitkan."
  - q: "Perlukah SME membeli sistem HR untuk bermula?"
    a: "Tidak. Pasukan kecil boleh bermula dengan borang ketersediaan, Google Sheets, AI dan Google Calendar, kemudian menilai sistem khusus apabila operasi menjadi lebih rumit."
  - q: "Adakah import CSV terus menghantar peringatan kepada staf?"
    a: "Tidak. Google menyatakan tetamu tidak dibawa masuk semasa import. Gunakan kalendar kongsi atau jemput staf pada acara, kemudian minta mereka menyemak tetapan notifikasi sendiri."
  - q: "Data apa yang selamat dimasukkan ke dalam prompt AI?"
    a: "Gunakan nama ringkas atau ID staf, peranan, ketersediaan dan aturan shift. Elakkan nombor kad pengenalan, akaun bank, alamat rumah dan maklumat kesihatan."
---

AI boleh mempercepat penyediaan jadual staf, tetapi jangan beri kuasa muktamad kepadanya. Kaedah paling mudah untuk SME ialah kumpul ketersediaan dalam Google Form atau Sheet, minta AI mencadangkan roster mengikut aturan operasi, semak hasilnya, kemudian terbitkan shift dalam Google Calendar. Selepas notifikasi ditetapkan, kalendar akan mengingatkan staf tanpa penyelia menghantar mesej satu demi satu.

Anggap AI sebagai pembantu menyusun, bukan sistem rekod HR. Penyelia masih perlu mengesahkan cuti, kelayakan tugas, had waktu bekerja dan pertukaran shift sebelum jadual diumumkan.

## Apa yang perlu disediakan sebelum AI menyusun jadual staf?

Mulakan dengan data yang kecil tetapi seragam. Satu baris patut mewakili seorang staf untuk satu tempoh jadual, bukan salinan chat WhatsApp yang bercampur dengan mesej lain.

Sediakan medan berikut:

- Nama ringkas atau ID staf
- Peranan, contohnya juruwang, barista atau penyelia
- Hari dan jam yang staf boleh bekerja
- Cuti yang telah diluluskan
- Kemahiran atau tugasan khas
- Bilangan staf minimum setiap shift
- Waktu buka dan tutup premis

[Google Forms](https://support.google.com/docs/answer/2917686?hl=en) boleh menyimpan respons ke Google Sheets. Ini memberi penyelia satu sumber data yang lebih teratur berbanding mencari ketersediaan dalam chat. Hadkan akses Sheet kepada orang yang benar-benar perlu melihat jadual.

Jangan masukkan nombor kad pengenalan, akaun bank, alamat rumah atau butiran kesihatan ke dalam prompt. Prinsip keselamatan, penyimpanan dan integriti data turut diterangkan oleh [Jabatan Perlindungan Data Peribadi](https://www.pdp.gov.my/ppdpv1/prinsip-perlindungan-data-peribadi/).

## Macam mana nak beri arahan jadual yang AI boleh ikut?

Nyatakan aturan sebagai syarat yang boleh diperiksa. Arahan kabur seperti “buat jadual yang adil” mudah menghasilkan roster yang nampak kemas tetapi gagal semasa operasi.

Gunakan prompt ini sebagai permulaan:

> Anda pembantu operasi kedai makan di Shah Alam. Susun jadual Isnin hingga Ahad untuk data staf di bawah. Kedai buka 10 pagi hingga 10 malam. Setiap shift perlukan sekurang-kurangnya seorang penyelia, dua kru dapur dan dua kru servis. Jangan jadualkan staf pada waktu yang mereka tandakan tidak tersedia. Hadkan seorang staf kepada satu shift sehari. Paparkan jadual dalam jadual markdown, kemudian senaraikan konflik dan slot yang belum cukup staf. Jangan mereka data yang tiada.

Tampal data yang sudah dibuang maklumat sensitif. Minta AI asingkan konflik, bukannya menyembunyikan kekurangan staf dengan mengisi nama secara rawak.

## Bagaimana nak semak roster sebelum dihantar kepada staf?

Semak jadual mengikut senarai tetap. Jangan bergantung pada rupa jadual sahaja.

1. Pastikan setiap shift memenuhi bilangan staf minimum.
2. Semak sekurang-kurangnya seorang staf mempunyai kemahiran wajib.
3. Bandingkan jadual dengan cuti dan ketersediaan asal.
4. Cari pertindihan masa dan staf yang bekerja dua shift berturut-turut.
5. Semak pembahagian hujung minggu dan shift malam.
6. Minta penyelia meluluskan versi akhir.

Contohnya, sebuah kafe dengan 12 staf mungkin mendapati AI meletakkan dua barista berpengalaman pada shift sama, tetapi tiada seorang pun pada waktu petang. Pembetulannya bukan sekadar menukar nama. Tambah aturan bahawa setiap shift mesti mempunyai sekurang-kurangnya seorang barista terlatih, kemudian jana semula.

Simpan versi akhir dalam Sheet berasingan dengan tarikh kelulusan. Cara ini membezakan cadangan AI daripada jadual rasmi yang staf patut ikut.

## Bagaimana nak jadikan peringatan shift berjalan secara automatik?

Terbitkan jadual yang sudah diluluskan ke kalendar kongsi. Google Calendar membenarkan pemilik [berkongsi kalendar dan mengawal tahap akses](https://support.google.com/calendar/answer/37082?hl=en). Cipta kalendar khas seperti “Shift Cawangan Shah Alam”, bukan campurkan roster dalam kalendar peribadi penyelia.

Untuk jumlah shift yang banyak, sediakan fail CSV daripada jadual akhir dan [import acara ke Google Calendar](https://support.google.com/calendar/answer/37118?hl=en). Perlu diingat, Google menyatakan tetamu dan maklumat persidangan tidak dibawa masuk melalui import. Import CSV juga tidak terus menyegerakkan dua akaun.

Selepas kalendar dikongsi, setiap staf perlu menyemak notifikasi akaun mereka. Menurut panduan [notifikasi Google Calendar](https://support.google.com/calendar/answer/37242?hl=en), tetapan notifikasi bersifat peribadi dan orang lain tidak boleh mengubahnya. Minta staf memilih peringatan yang sesuai, contohnya sehari sebelum dan satu jam sebelum shift.

Jika operasi masih bergantung pada WhatsApp, hantar satu mesej ringkas yang memautkan kalendar rasmi. Jangan dakwa WhatsApp menghantar peringatan automatik melainkan anda benar-benar menggunakan integrasi yang diluluskan, diuji dan mempunyai akses API yang sesuai.

## Apa rutin mingguan paling mudah untuk SME?

Gunakan kitaran yang sama setiap minggu supaya masalah dapat dikesan awal.

- Khamis: staf hantar ketersediaan minggu depan.
- Jumaat pagi: penyelia bersihkan data dan minta AI jana draf.
- Jumaat petang: penyelia semak konflik dan luluskan roster.
- Sabtu: jadual diterbitkan ke kalendar kongsi.
- Setiap hari: staf menerima notifikasi mengikut tetapan sendiri.
- Selepas pertukaran shift: penyelia kemas kini acara dan Sheet rasmi.

Mulakan dengan satu cawangan selama dua minggu. Rekod tiga ukuran: masa menyediakan roster, jumlah konflik selepas diterbitkan dan bilangan shift yang masih memerlukan peringatan manual. Jika proses stabil, barulah salin template ke cawangan lain.

Mahukan prompt operasi BM yang boleh terus disesuaikan? [Daftar AI4Bisnes](/daftar) dan bina arahan mengikut aturan sebenar pasukan anda. Untuk panduan AI praktikal lain, baca [blog Cakna AI](https://caknaai.com/blog/).

Sumber rasmi di atas disemak pada 30 September 2026.

## FAQ

### Bolehkah AI menentukan jadual staf sendiri?

AI boleh mencadangkan susunan, tetapi penyelia perlu meluluskan jadual akhir.

### Tool AI apa yang sesuai untuk menyusun roster?

Gunakan tool yang boleh membaca arahan dan jadual berstruktur. Pilihan lebih penting daripada disiplin data dan semakan manusia.

### Perlukah SME membeli sistem HR?

Tidak untuk percubaan kecil. Google Forms, Sheets dan Calendar boleh menjadi aliran asas sebelum operasi memerlukan sistem khusus.

### Bolehkah saya salin chat WhatsApp terus ke AI?

Tidak digalakkan. Chat mudah bercampur dengan maklumat peribadi dan arahan lama. Pindahkan ketersediaan ke borang atau Sheet dahulu.

### Adakah import CSV terus menjemput staf?

Tidak. Google menyatakan tetamu tidak dibawa masuk semasa import acara.

### Siapa yang menetapkan notifikasi shift?

Setiap staf menetapkan notifikasi pada akaun Google Calendar sendiri kerana tetapan itu bersifat peribadi.

### Berapa awal peringatan patut dihantar?

Satu peringatan sehari sebelum dan satu lagi sejam sebelum shift boleh dijadikan titik mula. Sesuaikan dengan perjalanan dan jenis kerja.

### Macam mana nak urus pertukaran shift?

Minta kelulusan penyelia, kemudian kemas kini Sheet rasmi dan acara kalendar yang berkaitan.

### Apa berlaku jika AI meletakkan staf pada dua shift?

Tolak draf itu, tambah aturan satu shift sehari dan jana semula. Semak sekali lagi sebelum diterbitkan.

### Perlukah nama penuh staf dimasukkan dalam prompt?

Tidak. Nama ringkas atau ID staf biasanya memadai untuk menyusun jadual.

### Bolehkah kaedah ini digunakan untuk banyak cawangan?

Boleh, tetapi uji satu cawangan dahulu. Asingkan aturan, peranan dan kalendar setiap lokasi supaya jadual tidak bercampur.

### Apa ukuran kejayaan proses ini?

Pantau masa penyediaan roster, konflik selepas terbit dan jumlah peringatan manual yang masih diperlukan.

Tentang penulis: Tuan Nik mengendalikan NiagaIQ Technologies Sdn Bhd dan membangunkan AI4Bisnes untuk membantu SME Malaysia menggunakan AI tanpa kod dan dengan bajet rendah. Beliau menulis panduan yang boleh diuji dalam operasi sebenar, bukan sekadar teori pemasaran.
