#!/usr/bin/env python3
"""Fix em dashes in blog post (mechanical unslop pass)."""
import sys

path = "content/blog/kenapa-ai-masih-ingat-perniagaan-lama-anda-panduan-pks-kemas-kini-jawapan-ai.md"
with open(path, encoding="utf-8") as f:
    content = f.read()

repls = [
    # YAML frontmatter (unique context each)
    ("sumber yang ia baca \u2014 Google Business Profile, direktori, laman web, dan media sosial",
     "sumber yang ia baca: Google Business Profile, direktori, laman web, dan media sosial"),
    ("adalah nombor satu \u2014 nama, alamat, waktu operasi, dan kategori",
     "adalah nombor satu: nama, alamat, waktu operasi, dan kategori"),
    ("tanya soalan seperti pelanggan \u2014 contohnya 'kedai kek terbaik di [kawasan]'",
     "tanya soalan seperti pelanggan, contohnya 'kedai kek terbaik di [kawasan]'"),
    # Body
    ("kedai kosong \u2014 dan mungkin tak kembali lagi",
     "kedai kosong, dan mungkin tak kembali lagi"),
    ("ia boleh dibetulkan \u2014 dengan syarat anda tahu caranya",
     "ia boleh dibetulkan, dengan syarat anda tahu caranya"),
    ("secara langsung \u2014 ia menyusun jawapan dari sumber yang ia baca",
     "secara langsung, ia menyusun jawapan dari sumber yang ia baca"),
    ("1. **Sumber asas tak dikemas kini** \u2014 Google Business Profile, direktori, atau laman web masih tunjuk alamat, nombor telefon, atau menu lama.",
     "1. Sumber asas tak dikemas kini: Google Business Profile, direktori, atau laman web masih tunjuk alamat, nombor telefon, atau menu lama."),
    ("2. **AI tak boleh \"nampak\" maklumat baru secara automatik** \u2014 ia perlukan masa dan isyarat untuk sahkan maklumat baharu sebelum menggantikan yang lama.",
     "2. AI tak boleh \"nampak\" maklumat baru secara automatik: ia perlukan masa dan isyarat untuk sahkan maklumat baharu sebelum menggantikan yang lama."),
    ("3. **Tiada kandungan baru yang betulkan fakta** \u2014 kalau semua artikel, post, dan profil masih sebut butiran lama, AI tak ada sebab untuk tukar jawapan.",
     "3. Tiada kandungan baru yang betulkan fakta: kalau semua artikel, post, dan profil masih sebut butiran lama, AI tak ada sebab untuk tukar jawapan."),
    ("jangan salahkan pustakawan \u2014 kemas kini rak anda.",
     "jangan salahkan pustakawan. Kemas kini rak anda."),
    ("Jangan tanya \"beritahu tentang syarikat saya\" \u2014 itu bukan cara pelanggan bertanya.",
     "Jangan tanya \"beritahu tentang syarikat saya\". Itu bukan cara pelanggan bertanya."),
    ("**lima sumber utama \u2014 Google Business Profile, direktori pihak ketiga, laman web sendiri, media sosial, dan ulasan.**",
     "**lima sumber utama: Google Business Profile, direktori pihak ketiga, laman web sendiri, media sosial, dan ulasan.**"),
    ("| Paling tinggi \u2014 ini sumber nombor satu |",
     "| Paling tinggi, ini sumber nombor satu |"),
    ("untuk perniagaan Malaysia \u2014 kerana sumber yang berselerak",
     "untuk perniagaan Malaysia, kerana sumber yang berselerak"),
    ("## Langkah Kemas Kini \u2014 Apa Yang Perlu Dibuat?",
     "## Langkah Kemas Kini: Apa Yang Perlu Dibuat?"),
    ("**kemas kini sumber ikut keutamaan \u2014 Google Business Profile dahulu, kemudian direktori, laman web, media sosial, dan kandungan baru.**",
     "**kemas kini sumber ikut keutamaan: Google Business Profile dahulu, kemudian direktori, laman web, media sosial, dan kandungan baru.**"),
    ("1. **Google Business Profile** \u2014 log masuk di [business.google.com](https://business.google.com), kemas kini alamat, waktu operasi, nombor telefon, dan kategori. Ini kesan paling cepat.",
     "1. Google Business Profile: log masuk di [business.google.com](https://business.google.com), kemas kini alamat, waktu operasi, nombor telefon, dan kategori. Ini kesan paling cepat."),
    ("2. **Pastikan konsisten NAP** \u2014 Nama, Alamat, dan Nombor Telefon mesti sama di semua direktori. AI suka sumber yang sepadan.",
     "2. Pastikan konsisten NAP: Nama, Alamat, dan Nombor Telefon mesti sama di semua direktori. AI suka sumber yang sepadan."),
    ("3. **Kemas kini laman web** \u2014 alamat di footer, halaman \"Hubungi Kami\", dan \"Tentang Kami\". Jangan lupa peta lokasi baru.",
     "3. Kemas kini laman web: alamat di footer, halaman \"Hubungi Kami\", dan \"Tentang Kami\". Jangan lupa peta lokasi baru."),
    ("4. **Kemas kini media sosial** \u2014 bio Instagram, Facebook About, dan TikTok linktree. Info terbaru pengaruhi cara AI gambarkan anda.",
     "4. Kemas kini media sosial: bio Instagram, Facebook About, dan TikTok linktree. Info terbaru pengaruhi cara AI gambarkan anda."),
    ("5. **Hasilkan kandungan baru** \u2014 tulis post atau artikel yang sebut fakta betul: \"Kedai kami kini di [lokasi baru]\", \"Menu baru untuk 2026\". Ini isyarat kuat untuk AI.",
     "5. Hasilkan kandungan baru: tulis post atau artikel yang sebut fakta betul, contohnya \"Kedai kami kini di [lokasi baru]\" dan \"Menu baru untuk 2026\". Ini isyarat kuat untuk AI."),
    ("6. **Galak ulasan Google baru** \u2014 rating dan ulasan terkini antara faktor utama yang AI pertimbangkan.",
     "6. Galak ulasan Google baru: rating dan ulasan terkini antara faktor utama yang AI pertimbangkan."),
    ("**enam hingga lapan minggu untuk perubahan ketara \u2014 bukan satu malam, dan bukan setahun.**",
     "**enam hingga lapan minggu untuk perubahan ketara, bukan satu malam, dan bukan setahun.**"),
    ("Yang penting ialah **konsisten** \u2014 terus kemas kini",
     "Yang penting ialah **konsisten**: terus kemas kini"),
    ("**pelanggan minta cadangan AI sebelum beli \u2014 kalau AI sebut maklumat salah tentang anda, anda hilang peluang sebelum mereka sampai ke kedai.**",
     "**pelanggan minta cadangan AI sebelum beli. Kalau AI sebut maklumat salah tentang anda, anda hilang peluang sebelum mereka sampai ke kedai.**"),
    ("Mereka tak mula dengan Google sahaja \u2014 ramai tanya ChatGPT, Gemini, atau Copilot untuk dapatkan cadangan.",
     "Mereka tak mula dengan Google sahaja. Ramai tanya ChatGPT, Gemini, atau Copilot untuk dapatkan cadangan."),
    ("asas AI visibility yang boleh dilakukan hari ini \u2014 dan anda boleh mula",
     "asas AI visibility yang boleh dilakukan hari ini. Anda boleh mula"),
    ("Masalah ini sasarkan cara AI menjawab soalan pengguna \u2014 termasuk alamat, waktu, dan cadangan.",
     "Masalah ini sasarkan cara AI menjawab soalan pengguna, termasuk alamat, waktu, dan cadangan."),
    ("cara paling berkesan tetap kemas kini sumber yang AI baca \u2014 kerana jawapan akhir datang dari sumber tersebut.",
     "cara paling berkesan tetap kemas kini sumber yang AI baca, kerana jawapan akhir datang dari sumber tersebut."),
    ("hasilkan kandungan baru \u2014 post medsos, artikel, dan deskripsi",
     "hasilkan kandungan baru: post medsos, artikel, dan deskripsi"),
]

missing = []
for old, new in repls:
    if old in content:
        content = content.replace(old, new, 1)
    else:
        missing.append(old[:60])

# Remove horizontal rule before author bio (LOW tell)
hr_old = "\n\n---\n\n*Ditulis oleh Tuan Nik"
if hr_old in content:
    content = content.replace(hr_old, "\n\n*Ditulis oleh Tuan Nik", 1)
else:
    missing.append("HR-before-bio")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

remaining = content.count("\u2014")
print(f"replacements applied: {len(repls) - len(missing)}/{len(repls)}")
print(f"missing (not found): {len(missing)}")
for m in missing:
    print("  MISSING:", m)
print(f"em dashes remaining in file: {remaining}")
sys.exit(0 if remaining == 0 and not missing else 1)
