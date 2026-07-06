# Sistem Affiliate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setiap pengguna berdaftar dapat kod rujukan automatik; bila orang yang mereka rujuk bayar Pro/Max, affiliate dapat rekod komisen 20% berulang, dilihat di dashboard sendiri.

**Architecture:** Kod rujukan + `referred_by` disimpan dalam `profiles` (kolum baharu). Cookie 30 hari (`ai4b_ref`) tangkap `?ref=` di landing page via `src/proxy.ts`. Semasa daftar, `actions.ts` guna admin client (service role) untuk kaitkan `referred_by`. Bila bayaran diaktifkan dalam `route.ts` callback toyyibPay sedia ada, satu row `affiliate_commissions` dicipta. Dashboard baharu `/app/affiliate` papar pautan + jumlah komisen.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + RLS), toyyibPay (sedia ada). Tiada rangka ujian automatik dalam projek ini (tiada Jest/Vitest) — pengesahan setiap task guna query SQL terus (Supabase MCP `execute_sql`) dan/atau `preview_*` tools ikut konvensyen projek sedia ada (rujuk memori: "diverifikasi end-to-end dalam preview").

**Nota penting seni bina Next.js:** Project ID Supabase untuk semua panggilan MCP: `svcxmnckinpnotlquuae`.

---

### Task 1: Migration — kod rujukan & pautan rujukan pada `profiles`

**Files:**
- Migration (Supabase MCP `apply_migration`, nama: `affiliate_referral_columns`)
- Verify: query SQL terus (Supabase MCP `execute_sql`)

- [ ] **Step 1: Tulis & jalankan migration**

Guna Supabase MCP tool `apply_migration` dengan `project_id: "svcxmnckinpnotlquuae"`, `name: "affiliate_referral_columns"`, `query`:

```sql
-- Kolum kod rujukan sendiri + siapa rujuk pengguna ini
alter table profiles
  add column referral_code text unique,
  add column referred_by uuid references profiles(id);

-- Backfill kod untuk profile sedia ada
update profiles
set referral_code = encode(gen_random_bytes(4), 'hex')
where referral_code is null;

alter table profiles alter column referral_code set not null;

-- Kemaskini trigger row baharu supaya auto dapat kod rujukan
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.profiles (id, referral_code)
  values (new.id, encode(gen_random_bytes(4), 'hex'));
  return new;
end;
$function$;
```

- [ ] **Step 2: Sahkan kolum wujud & semua profile ada kod unik**

Jalankan via Supabase MCP `execute_sql`:

```sql
select count(*) as jumlah, count(distinct referral_code) as unik
from profiles;
```

Expected: `jumlah` = `unik` (tiada duplicate), dan tiada row dengan `referral_code` null (query kedua: `select count(*) from profiles where referral_code is null;` mesti pulangkan 0).

- [ ] **Step 3: Commit**

Migration dijalankan terus ke DB production via MCP (tiada fail SQL tempatan disimpan dalam repo — ikut corak projek sedia ada, semua migration lepas pun begini). Tiada commit git untuk step ini; teruskan ke Task 2.

---

### Task 2: Migration — jadual `affiliate_commissions`

**Files:**
- Migration (Supabase MCP `apply_migration`, nama: `affiliate_commissions_table`)

- [ ] **Step 1: Cipta jadual + RLS**

Guna Supabase MCP `apply_migration`, `project_id: "svcxmnckinpnotlquuae"`, `name: "affiliate_commissions_table"`, `query`:

```sql
create table affiliate_commissions (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references profiles(id),
  referred_user_id uuid not null references profiles(id),
  subscription_id bigint not null references subscriptions(id) unique,
  amount_rm numeric not null,
  status text not null default 'earned' check (status in ('earned', 'paid')),
  created_at timestamptz not null default now()
);

create index on affiliate_commissions (referrer_id);

alter table affiliate_commissions enable row level security;

create policy "baca rekod sendiri" on affiliate_commissions
  for select
  using (referrer_id = auth.uid());
```

- [ ] **Step 2: Sahkan jadual & RLS wujud**

Jalankan via Supabase MCP `execute_sql`:

```sql
select tablename, rowsecurity from pg_tables where tablename = 'affiliate_commissions';
```

Expected: satu row, `rowsecurity` = `true`.

```sql
select polname, cmd from pg_policies where tablename = 'affiliate_commissions';
```

Expected: satu policy `baca rekod sendiri` dengan `cmd = 'r'` (SELECT).

- [ ] **Step 3: Semak Supabase advisor untuk isu keselamatan**

Guna Supabase MCP tool `get_advisors` dengan `project_id: "svcxmnckinpnotlquuae"`, `type: "security"`. Sahkan tiada ERROR baharu berkaitan `affiliate_commissions` (WARN sedia ada untuk fungsi lain adalah normal, rujuk memori projek).

---

### Task 3: Tangkap cookie rujukan di landing page

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Kemaskini `proxy.ts` untuk baca `?ref=` dan set cookie di laluan `/`**

Baca fail sedia ada dulu (`src/proxy.ts`), kemudian ganti sepenuhnya dengan:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Landing page: tangkap kod rujukan affiliate, tiada semakan auth di sini
  if (request.nextUrl.pathname === "/") {
    const ref = request.nextUrl.searchParams.get("ref");
    if (ref) {
      response.cookies.set("ai4b_ref", ref, {
        maxAge: 60 * 60 * 24 * 30, // 30 hari
        path: "/",
      });
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/masuk", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/app/:path*", "/onboarding", "/naik-taraf", "/set-kata-laluan"],
};
```

- [ ] **Step 2: Semak build tidak rosak**

Run: `npm run build`
Expected: build berjaya tanpa ralat TypeScript/ESLint.

- [ ] **Step 3: Sahkan cookie diset dalam preview**

Guna `preview_start` (kalau server belum jalan), kemudian `preview_eval` dengan expression:

```javascript
window.location.href = window.location.origin + "/?ref=TEST1234";
```

Selepas reload, guna `preview_eval` dengan expression `document.cookie` — sahkan string mengandungi `ai4b_ref=TEST1234`.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "Tangkap cookie rujukan affiliate (?ref=) di landing page"
```

---

### Task 4: Kaitkan `referred_by` semasa daftar

**Files:**
- Modify: `src/app/actions.ts` (fungsi `daftar`)

- [ ] **Step 1: Tambah logik resolve rujukan dalam `daftar()`**

Dalam `src/app/actions.ts`, tambah import di bahagian atas fail (selepas import sedia ada):

```typescript
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
```

Ganti fungsi `daftar()` sedia ada (baris 28-38) dengan:

```typescript
export async function daftar(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  if (!email || !password) redirect("/daftar?ralat=Sila+isi+semua+medan");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/daftar?ralat=${encodeURIComponent(ralatBM(error.message))}`);

  await kaitkanRujukan(data.user?.id);

  redirect("/masuk?mesej=Pendaftaran+berjaya.+Sila+semak+emel+anda+untuk+pengesahan,+kemudian+log+masuk.");
}

// Kaitkan pengguna baharu dengan affiliate yang rujuk mereka (jika ada cookie
// ai4b_ref yang padan kod rujukan sah). Guna admin client sebab pengguna
// baharu belum ada sesi (email confirmation wajib) — sama sebab route.ts
// callback bayaran guna service role.
async function kaitkanRujukan(userId: string | undefined) {
  if (!userId) return;
  const kod = (await cookies()).get("ai4b_ref")?.value;
  if (!kod) return;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", kod)
    .maybeSingle();

  if (referrer && referrer.id !== userId) {
    await admin
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", userId);
  }
}
```

- [ ] **Step 2: Semak build tidak rosak**

Run: `npm run build`
Expected: build berjaya.

- [ ] **Step 3: Sahkan end-to-end dalam preview**

1. Guna Supabase MCP `execute_sql` untuk cari `referral_code` akaun sedia ada (cth akaun peribadi nikmerchant):
   ```sql
   select id, referral_code from profiles where id = (select id from auth.users where email = 'nikmerchant@gmail.com');
   ```
2. Guna `preview_eval`: `window.location.href = window.location.origin + "/?ref=<KOD_DARI_STEP_1>"`.
3. Guna `preview_click`/`preview_fill` untuk daftar akaun ujian baharu (emel sekali guna, cth `affiliate-test-<timestamp>@ai4bisnes.com`) melalui `/daftar`.
4. Guna Supabase MCP `execute_sql`:
   ```sql
   select referred_by from profiles where id = (select id from auth.users where email = '<emel ujian step 3>');
   ```
   Expected: `referred_by` sama dengan id dari step 1.
5. **Bersihkan:** padam akaun ujian selepas sahkan —
   ```sql
   delete from auth.users where email = '<emel ujian step 3>';
   ```
   (cascade padam profile berkaitan).

- [ ] **Step 4: Commit**

```bash
git add src/app/actions.ts
git commit -m "Kaitkan pengguna baharu dengan affiliate yang rujuk (referred_by)"
```

---

### Task 5: Jana rekod komisen bila bayaran diaktifkan

**Files:**
- Modify: `src/app/api/bayaran/callback/route.ts`

- [ ] **Step 1: Tambah logik insert komisen selepas subscription aktif**

Baca fail sedia ada, kemudian tambah selepas blok `.update({ tier: sub.tier })` (sebelum `return new Response("ok")` akhir), gantikan bahagian akhir fail (dari `await admin.from("profiles").update(...)` hingga akhir) dengan:

```typescript
  await admin
    .from("profiles")
    .update({ tier: sub.tier })
    .eq("id", sub.user_id);

  await janaKomisenAffiliate(admin, sub);

  return new Response("ok");
}

// Kalau pengguna yang bayar ini dirujuk oleh affiliate, rekod komisen 20%.
// subscription_id unique pada affiliate_commissions elak rekod berganda
// kalau callback toyyibPay dipanggil lebih dari sekali untuk bil sama.
async function janaKomisenAffiliate(
  admin: ReturnType<typeof createAdminClient>,
  sub: { id: number; user_id: string; tier: string; period: string }
) {
  const { data: pembayar } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", sub.user_id)
    .single();
  if (!pembayar?.referred_by) return;

  const { data: langganan } = await admin
    .from("subscriptions")
    .select("price_rm")
    .eq("id", sub.id)
    .single();
  if (!langganan) return;

  await admin.from("affiliate_commissions").insert({
    referrer_id: pembayar.referred_by,
    referred_user_id: sub.user_id,
    subscription_id: sub.id,
    amount_rm: Number(langganan.price_rm) * 0.2,
  });
}
```

- [ ] **Step 2: Semak build tidak rosak**

Run: `npm run build`
Expected: build berjaya. (Kalau TypeScript reject jenis `admin` sebagai parameter, pastikan `createAdminClient` diimport di bahagian atas fail — dah wujud dalam fail asal.)

- [ ] **Step 3: Sahkan dengan data ujian terus dalam DB (tanpa perlu bayaran sebenar)**

Guna Supabase MCP `execute_sql` untuk simulasi keseluruhan aliran tanpa toyyibPay sebenar:

```sql
-- 1. Cipta 2 profile ujian: A (affiliate), B (dirujuk A)
-- (guna akaun sedia ada atau cipta baharu ikut keperluan — pastikan padam selepas ujian)

-- 2. Andaikan B ada subscription 'pending' price_rm=49, tier='pro'
-- Cari id subscription B, kemudian jalankan logik yang sama macam callback:
update subscriptions set status = 'active' where id = <id_subscription_B>;

insert into affiliate_commissions (referrer_id, referred_user_id, subscription_id, amount_rm)
values (<id_profile_A>, <id_profile_B>, <id_subscription_B>, 49 * 0.2);
```

Sahkan row tercipta dengan `amount_rm = 9.80`:

```sql
select * from affiliate_commissions where referrer_id = <id_profile_A>;
```

Nota: ini mengesahkan skema/RLS/logik SQL sahaja. Ujian penuh laluan kod TypeScript (route handler sebenar dipanggil toyyibPay) sukar disimulasi tanpa bil sebenar — akan disahkan bila bayaran ujian RM1 pertama dibuat (rujuk checklist toyyibPay sedia ada dalam memori projek).

- [ ] **Step 4: Bersihkan data ujian**

```sql
delete from affiliate_commissions where referrer_id = <id_profile_A>;
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/bayaran/callback/route.ts"
git commit -m "Jana rekod komisen affiliate 20% bila bayaran diaktifkan"
```

---

### Task 6: Dashboard affiliate `/app/affiliate`

**Files:**
- Create: `src/app/app/affiliate/page.tsx`

- [ ] **Step 1: Cipta halaman**

```typescript
import { createClient } from "@/lib/supabase/server";
import { CtaSpinner } from "@/app/cta-spinner";
import Link from "next/link";
import { SalinBar } from "../library";

export default async function Affiliate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profil }, { data: komisen }] = await Promise.all([
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("affiliate_commissions")
      .select("amount_rm, status, created_at")
      .eq("referrer_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  const rows = komisen ?? [];
  const jumlahEarned = rows
    .filter((r) => r.status === "earned")
    .reduce((s, r) => s + Number(r.amount_rm), 0);
  const jumlahPaid = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.amount_rm), 0);
  const pautan = `https://ai4bisnes.com/?ref=${profil?.referral_code ?? ""}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <p className="mb-2 text-sm">
        <Link
          href="/app"
          className="rounded px-0.5 text-neutral-500 underline active:opacity-70"
        >
          ← Kembali ke library
          <CtaSpinner />
        </Link>
      </p>
      <h1 className="text-2xl font-bold">🤝 Program Affiliate</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Kongsi pautan anda — dapat 20% komisen berulang setiap bulan orang
        yang anda rujuk terus melanggan Pro atau Max.
      </p>

      <div className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase text-neutral-500">
          Pautan rujukan anda
        </p>
        <p className="mt-1 break-all font-mono text-sm">{pautan}</p>
        <div className="mt-3">
          <SalinBar teks={pautan} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-violet-50 p-4 dark:bg-violet-950">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Komisen tertunggak
          </p>
          <p className="mt-1 text-2xl font-extrabold text-violet-700 dark:text-violet-300">
            RM{jumlahEarned.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Sudah dibayar
          </p>
          <p className="mt-1 text-2xl font-extrabold">
            RM{jumlahPaid.toFixed(2)}
          </p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Sejarah rujukan</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Belum ada rujukan lagi. Kongsi pautan anda di atas untuk mula.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800"
            >
              <span className="text-neutral-500">
                {new Date(r.created_at).toLocaleDateString("ms-MY")}
              </span>
              <span className="font-medium">RM{Number(r.amount_rm).toFixed(2)}</span>
              <span className="text-xs uppercase text-neutral-400">
                {r.status === "paid" ? "Dibayar" : "Tertunggak"}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Semak build tidak rosak**

Run: `npm run build`
Expected: build berjaya.

- [ ] **Step 3: Commit**

```bash
git add src/app/app/affiliate/page.tsx
git commit -m "Tambah dashboard affiliate /app/affiliate"
```

---

### Task 7: Pautan ke dashboard affiliate dari `/app`

**Files:**
- Modify: `src/app/app/page.tsx:129-136`

- [ ] **Step 1: Tambah pautan 🤝 Affiliate sebelah 🗄 Vault**

Dalam `src/app/app/page.tsx`, cari blok (sekitar baris 129-136):

```typescript
            <Link
              href="/app/vault"
              className="rounded px-0.5 underline active:opacity-70"
            >
              🗄 Vault
              <CtaSpinner />
            </Link>
```

Ganti dengan:

```typescript
            <Link
              href="/app/vault"
              className="rounded px-0.5 underline active:opacity-70"
            >
              🗄 Vault
              <CtaSpinner />
            </Link>{" "}
            ·{" "}
            <Link
              href="/app/affiliate"
              className="rounded px-0.5 underline active:opacity-70"
            >
              🤝 Affiliate
              <CtaSpinner />
            </Link>
```

- [ ] **Step 2: Sahkan dalam preview**

Guna `preview_start` (kalau belum jalan), log masuk sebagai akaun ujian sedia ada, `preview_snapshot` di `/app` — sahkan pautan "🤝 Affiliate" wujud dalam header, klik, dan `preview_snapshot` di `/app/affiliate` — sahkan pautan rujukan, RM0.00 komisen (akaun baharu), dan mesej "Belum ada rujukan lagi" terpapar.

- [ ] **Step 3: Commit**

```bash
git add src/app/app/page.tsx
git commit -m "Tambah pautan Affiliate di header dashboard"
```

---

### Task 8: Push ke production

- [ ] **Step 1: Push semua commit**

```bash
git push origin master
```

Expected: Vercel auto-deploy (Git integration sedia ada) ambil alih; sahkan di Vercel dashboard atau tunggu ~1-2 minit kemudian semak `https://ai4bisnes.com/app/affiliate` (perlu log masuk).

---

## Self-Review (dijalankan semasa tulis pelan ini)

- **Liputan spec:** kod rujukan ✅ (Task 1), tracking cookie ✅ (Task 3), `referred_by` semasa daftar ✅ (Task 4), rekod komisen ✅ (Task 2 + 5), dashboard ✅ (Task 6-7), payout manual — sengaja tiada task kod (dokumentasi query dalam spec sudah cukup, ini keputusan reka bentuk bukan kerja kod).
- **Placeholder:** tiada TBD/TODO ditemui.
- **Konsistensi jenis:** `referral_code`, `referred_by`, `affiliate_commissions.{referrer_id,referred_user_id,subscription_id,amount_rm,status}` digunakan konsisten across Task 1, 2, 4, 5, 6.
