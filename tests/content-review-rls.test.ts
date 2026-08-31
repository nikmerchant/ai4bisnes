import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MIGRATION = readFileSync(new URL("../supabase/migrations/202608300001_native_content_engine_artifacts.sql", import.meta.url), "utf8");
const VERIFY = readFileSync(new URL("../supabase/tests/verify_native_content_engine_artifacts.sql", import.meta.url), "utf8");
const sql = MIGRATION.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");

test("migration is additive and isolated from legacy and Slice 1-3 tables", () => {
  assert.match(sql, /create table if not exists public\.native_content_engine_artifacts/);
  for (const table of ["generated_outputs", "native_social_post_artifacts", "native_offer_artifacts", "native_whatsapp_draft_artifacts"]) {
    assert.doesNotMatch(sql, new RegExp(`(?:alter|drop|insert|update|delete|grant|revoke)\\s+[^;]*\\b${table}\\b`, "i"));
    assert.doesNotMatch(sql, new RegExp(`on\\s+public\\.${table}\\b`, "i"));
  }
});

test("table has source envelope, owner/request idempotency and owner/time index", () => {
  assert.match(sql, /request_id uuid not null/);
  assert.match(sql, /source_social_post_id bigint null/);
  assert.match(sql, /source_social_post_status text null/);
  assert.match(sql, /source_text_hash text not null/);
  assert.match(sql, /before_text text not null/);
  assert.match(sql, /improved_text text not null/);
  assert.match(sql, /unique \(user_id, request_id\)/);
  assert.match(sql, /native_content_engine_user_created_idx/);
});

test("RLS is enabled and forced before owner-only SELECT; direct mutation is unavailable", () => {
  const rlsIdx = sql.indexOf("enable row level security");
  const policyIdx = sql.indexOf("create policy");
  assert.ok(rlsIdx > -1 && policyIdx > rlsIdx);
  assert.match(sql, /force row level security/);
  assert.match(sql, /for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /revoke all on table public\.native_content_engine_artifacts from anon/);
  assert.match(sql, /revoke all on table public\.native_content_engine_artifacts from authenticated/);
  assert.match(sql, /grant select on table public\.native_content_engine_artifacts to authenticated/);
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete)/i);
});

test("migration bounds JSON and text payloads", () => {
  assert.match(sql, /request jsonb not null check \(jsonb_typeof\(request\) = 'object'\)/);
  assert.match(sql, /artifact jsonb not null check \(jsonb_typeof\(artifact\) = 'object'\)/);
  assert.match(sql, /octet_length\(before_text\) <= 20000/);
  assert.match(sql, /octet_length\(improved_text\) <= 25000/);
});

test("verification SQL checks FORCE RLS, owner policy, no mutation grants, unique and index", () => {
  assert.match(VERIFY, /relforcerowsecurity/);
  assert.match(VERIFY, /native content engine owner select/);
  assert.match(VERIFY, /direct client mutation grants detected/);
  assert.match(VERIFY, /native_content_engine_user_request_unique/);
  assert.match(VERIFY, /native_content_engine_user_created_idx/);
  assert.match(VERIFY, /CONTENT_REVIEW_RLS_PASS/);
  for (const source of [MIGRATION, VERIFY]) {
    assert.doesNotMatch(source, /(apikey|api_key|secret|password|token)\s*[:=]/i);
    assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{10,}/);
  }
});
