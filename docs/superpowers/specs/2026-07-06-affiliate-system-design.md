# Sistem Affiliate AI4Bisnes

Status: Diluluskan user (6 Julai 2026), sedia untuk pelan implementasi.

## Tujuan

Tambah gelagat pemasaran word-of-mouth: setiap pengguna berdaftar dapat kod
rujukan sendiri automatik, dan dapat komisen berulang 20% selagi orang yang
mereka rujuk kekal melanggan Pro/Max. Bahagian dari strategi pemasaran modal
RM1000 (bajet warm-outreach + organik) yang dibincang dalam sesi ini.

## Keputusan yang dikunci

- **Kelayakan:** semua pengguna berdaftar (Basic termasuk) automatik jadi
  affiliate — tiada proses mohon/lulus.
- **Komisen:** 20% berulang dari `price_rm` setiap bayaran (bukan sekali sahaja)
  selagi pengguna yang dirujuk terus membayar.
- **Payout:** manual — tiada UI admin, tiada integrasi payout automatik. Owner
  minta query SQL bila nak bayar bulanan (DuitNow/bank terus), tandakan
  `status='paid'` selepas bayar.
- **Attribution:** cookie 30 hari dari klik pertama `?ref=KODXYZ` sehingga
  daftar akaun.
- **Tiada:** multi-level referral, minimum payout threshold dalam kod, banner/
  marketing asset khas, skrin admin dalam app.

## Seni bina

### 1. Kod rujukan (`profiles.referral_code`)

- Kolum baharu `profiles.referral_code text unique not null`.
- Dijana dalam `handle_new_user()` (trigger sedia ada yang cipta row profile):
  `encode(gen_random_bytes(4), 'hex')` — 8 aksara hex, ~4 bilion kombinasi,
  peluang perlanggaran boleh diabaikan pada skala SME (ponytail: tiada retry
  loop collision, upgrade kalau `unique_violation` betul-betul berlaku).
- Backfill kod untuk profile sedia ada (migration data one-off).

### 2. Tracking rujukan (cookie)

- `src/proxy.ts` (middleware sedia ada) matcher ditambah `"/"`. Untuk laluan
  `"/"`, logik baharu: baca `?ref=`, kalau wujud set cookie `ai4b_ref`
  (30 hari, path `/`), **tiada** semakan auth (laluan awam, redirect auth
  hanya untuk laluan dilindungi sedia ada).
- Pautan affiliate: `ai4bisnes.com/?ref=KODXYZ` (halaman landing sedia ada,
  tiada halaman baharu).

### 3. Kaitkan rujukan semasa daftar (`profiles.referred_by`)

- Kolum baharu `profiles.referred_by uuid references profiles(id)`, nullable,
  diset SEKALI sahaja semasa daftar (row baharu, jadi tiada risiko tulis
  ganti).
- `src/app/actions.ts` fungsi `daftar()`:
  1. Baca cookie `ai4b_ref` (guna `cookies()` dari `next/headers`).
  2. Selepas `auth.signUp()` berjaya (dapat `data.user.id`), kalau cookie
     wujud: guna admin client (`SUPABASE_SERVICE_ROLE_KEY`, pola sedia ada
     macam `route.ts` callback bayaran) untuk cari `profiles.id` dengan
     `referral_code` padan, dan `update profiles set referred_by = <id>`
     untuk user baharu — **kecuali** kod itu kepunyaan diri sendiri (tak
     mungkin berlaku pada user baharu, tapi semak untuk jelas).
  3. Guna admin client sebab user baharu belum ada sesi (email confirmation
     wajib) — sama sebab `route.ts` guna service role, bukan client biasa.

### 4. Rekod komisen (`affiliate_commissions`)

```sql
create table affiliate_commissions (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references profiles(id),
  referred_user_id uuid not null references profiles(id),
  subscription_id bigint not null references subscriptions(id) unique,
  amount_rm numeric not null,
  status text not null default 'earned' check (status in ('earned','paid')),
  created_at timestamptz not null default now()
);
-- RLS: affiliate baca rekod sendiri sahaja
alter table affiliate_commissions enable row level security;
create policy "baca rekod sendiri" on affiliate_commissions
  for select using (referrer_id = auth.uid());
-- tiada policy insert/update untuk client — hanya service role (bypass RLS) tulis
```

- `subscription_id unique` — jaminan satu bayaran = satu komisen (elak
  double-insert kalau toyyibPay callback ulang; `route.ts` sedia ada pun
  dah guard `status='pending'` jadi ini lapisan kedua).
- Dalam `src/app/api/bayaran/callback/route.ts`, selepas subscription
  ditandakan `active` dan profile tier dikemaskini: semak
  `profiles.referred_by` bagi `sub.user_id` — kalau wujud, insert satu row
  `affiliate_commissions` (`amount_rm = sub.price_rm * 0.20`).
- Ini secara semula jadi kekal "berulang" — setiap kali pengguna dirujuk
  bayar semula (renewal manual toyyibPay ikut corak sedia ada, tiada auto-
  debit), satu rekod komisen baharu tercipta.

### 5. Dashboard affiliate (`/app/affiliate`)

- Halaman baharu, semua tier boleh akses (guard proxy sedia ada
  `/app/:path*` sudah cukup — tiada guard tier tambahan).
- Papar: pautan rujukan (`ai4bisnes.com/?ref=<referral_code>`) + butang
  salin (guna komponen `SalinBar`/pola sedia ada), jumlah orang dirujuk,
  jumlah komisen `earned` vs `paid`.
- Pautan ikon 🤝 di header `/app` (sebelah 🗄 Vault sedia ada).

### 6. Payout manual

- Bulanan, minta saya jalankan:
  `select referrer_id, sum(amount_rm) from affiliate_commissions where status='earned' group by 1`
- Owner bayar DuitNow/bank terus, kemudian saya jalankan
  `update ... set status='paid'` untuk rekod berkenaan.

## Ralat & kes tepi

- **Kod rujukan tak sah / dah tak wujud** (referral_code dalam cookie tak
  padan mana-mana profile): `referred_by` kekal null, daftar terus jalan
  normal — senyap, bukan ralat kepada pengguna.
- **Cookie luput (>30 hari):** `ai4b_ref` dah hilang, tiada atribusi —
  tingkah laku dijangka.
- **toyyibPay callback berulang** untuk bil sama: dilindungi 2 lapisan
  (guard `status='pending'` sedia ada + `subscription_id unique` pada
  `affiliate_commissions`).

## Ujian (self-check minimum, bukan suite penuh)

- Skrip `demo()`/manual: cipta 2 akaun ujian (A = affiliate, B = rujukan
  guna `?ref=<kod A>`), simulasi bayaran B (guna flow sedia ada, akaun
  ujian toyyibPay atau terus `execute_sql` update status), sahkan satu row
  `affiliate_commissions` tercipta dengan `referrer_id = A`, `amount_rm`
  betul (20% dari `price_rm`).
