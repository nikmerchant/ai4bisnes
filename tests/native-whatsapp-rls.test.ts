import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MIGRATION = readFileSync(new URL("../supabase/migrations/202608290001_native_whatsapp_rls.sql", import.meta.url), "utf8");
const VERIFY = readFileSync(new URL("../supabase/tests/verify_native_whatsapp_rls.sql", import.meta.url), "utf8");

function executable(sql: string) {
  return sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
}

const sql = executable(MIGRATION);

test("whatsapp migration is additive and never mutates legacy tables", () => {
  assert.match(sql, /create table if not exists public\.native_whatsapp_draft_artifacts/);
  for (const legacy of ["generated_outputs", "native_social_post_artifacts", "native_offer_artifacts"]) {
    assert.doesNotMatch(sql, new RegExp(`(?:alter|drop|insert|update|delete|grant|revoke)\\s+[^;]*\\b${legacy}\\b`, "i"));
    assert.doesNotMatch(sql, new RegExp(`on\\s+public\\.${legacy}\\b`, "i"));
  }
});

test("whatsapp migration creates durable owner/request idempotency", () => {
  assert.match(sql, /request_id uuid not null/);
  assert.match(sql, /unique \(user_id, request_id\)/);
});

test("whatsapp migration installs RLS before owner-only SELECT policy", () => {
  const rlsIdx = sql.indexOf("enable row level security");
  const policyIdx = sql.indexOf("create policy");
  assert.ok(rlsIdx > -1 && policyIdx > -1 && rlsIdx < policyIdx);
  assert.match(sql, /force row level security/);
  assert.match(sql, /for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
});

test("whatsapp migration grants no direct mutations to anon/authenticated", () => {
  assert.match(sql, /revoke all on table public\.native_whatsapp_draft_artifacts from anon/);
  assert.match(sql, /revoke all on table public\.native_whatsapp_draft_artifacts from authenticated/);
  assert.match(sql, /grant select on table public\.native_whatsapp_draft_artifacts to authenticated/);
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete)/i);
});

test("whatsapp table constrains JSON shape and rendered text size", () => {
  assert.match(sql, /request jsonb not null check \(jsonb_typeof\(request\) = 'object'\)/);
  assert.match(sql, /artifact jsonb not null check \(jsonb_typeof\(artifact\) = 'object'\)/);
  assert.match(sql, /rendered_text text not null check \(octet_length\(rendered_text\) <= 50000\)/);
});

test("whatsapp SQL contains no credentials", () => {
  for (const source of [MIGRATION, VERIFY]) {
    assert.doesNotMatch(source, /(apikey|api_key|secret|password|token)\s*[:=]/i);
    assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{10,}/);
  }
});

test("whatsapp verify SQL checks FORCE RLS, policy, mutation grants, index and unique", () => {
  assert.match(VERIFY, /relforcerowsecurity/);
  assert.match(VERIFY, /native whatsapp drafts owner select/);
  assert.match(VERIFY, /direct client mutation grants detected/);
  assert.match(VERIFY, /native_whatsapp_user_request_unique/);
  assert.match(VERIFY, /native_whatsapp_user_created_idx/);
  assert.match(VERIFY, /SLICE3_RLS_PASS/);
});
