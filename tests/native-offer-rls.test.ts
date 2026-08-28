import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/202608280001_native_offer_rls.sql", import.meta.url), "utf8");
const verify = readFileSync(new URL("../supabase/tests/verify_native_offer_rls.sql", import.meta.url), "utf8");

test("offer migration is additive and never mutates legacy tables", () => {
  const executableSql = migration.replace(/^\s*--.*$/gm, "");
  assert.match(executableSql, /create table if not exists public\.native_offer_artifacts/);
  assert.doesNotMatch(executableSql, /alter\s+table\s+public\.(generated_outputs|native_social_post_artifacts)/i);
  // drop policy if exists is allowed (idempotent policy install); destructive drops are not
  assert.doesNotMatch(executableSql, /drop\s+(table|column)/i);
  assert.doesNotMatch(executableSql, /drop\s+policy(?!\s+if\s+exists)/i);
  assert.doesNotMatch(executableSql, /(insert\s+into|update|delete\s+from)\s+public\.(generated_outputs|native_social_post_artifacts)/i);
});

test("offer migration creates durable owner/request idempotency", () => {
  assert.match(migration, /constraint native_offer_user_request_unique unique \(user_id, request_id\)/);
});

test("offer migration installs RLS before owner-only SELECT policy", () => {
  assert.match(migration, /alter table public\.native_offer_artifacts enable row level security/);
  assert.match(migration, /alter table public\.native_offer_artifacts force row level security/);
  const forceIndex = migration.indexOf("force row level security");
  const policyIndex = migration.indexOf('create policy "native offers owner select"');
  assert.ok(forceIndex > -1 && policyIndex > forceIndex);
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/);
});

test("offer migration grants no direct mutations to anon/authenticated", () => {
  assert.match(migration, /revoke all on table public\.native_offer_artifacts from anon/);
  assert.match(migration, /revoke all on table public\.native_offer_artifacts from authenticated/);
  assert.match(migration, /grant select on table public\.native_offer_artifacts to authenticated/);
});

test("offer table constrains JSON shape and rendered text size", () => {
  assert.match(migration, /request jsonb not null check \(jsonb_typeof\(request\) = 'object'\)/);
  assert.match(migration, /artifact jsonb not null check \(jsonb_typeof\(artifact\) = 'object'\)/);
  assert.match(migration, /octet_length\(rendered_text\) <= 50000/);
});

test("offer verify SQL checks FORCE RLS, policy, mutation grants, index and unique", () => {
  assert.match(verify, /native_offer_artifacts FORCE RLS is not enabled/);
  assert.match(verify, /native offers owner select/);
  assert.match(verify, /direct client mutation grants remain/);
  assert.match(verify, /native_offer_user_created_idx/);
  assert.match(verify, /native_offer_user_request_unique/);
});

test("offer SQL files contain no credentials", () => {
  const combined = migration + verify;
  assert.doesNotMatch(combined, /(sb_secret_|sk_live_|sk_test_|service_role|SUPABASE_SERVICE|password\s*=)/i);
});
