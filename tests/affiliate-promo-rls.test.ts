import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const MIGRATION = readFileSync("supabase/migrations/202609040001_affiliate_promo_artifacts.sql", "utf8");
const VERIFY = readFileSync("supabase/tests/verify_affiliate_promo.sql", "utf8");
const GATE_B = readFileSync("supabase/tests/affiliate_promo_gate_b_atomic.sql", "utf8");

test("migration is additive, isolated and never mutates existing tables", () => {
  assert.ok(MIGRATION.includes("CREATE TABLE IF NOT EXISTS public.affiliate_promo_artifacts"));
  assert.ok(!/ALTER\s+TABLE\s+(?!public\.affiliate_promo_artifacts)/i.test(MIGRATION));
  assert.ok(!/DROP\s+(TABLE|INDEX)/i.test(MIGRATION));
  assert.match(MIGRATION, /DROP POLICY IF EXISTS affiliate_promo_select_owner ON public\.affiliate_promo_artifacts/i);
  for (const legacy of ["generated_outputs", "native_social_post_artifacts", "native_offer_artifacts", "native_whatsapp_draft_artifacts", "native_content_engine_artifacts"]) {
    assert.ok(!new RegExp(`(INSERT|UPDATE|DELETE|ALTER)\\s+[^;]*\\b${legacy}\\b`, "i").test(MIGRATION), `${legacy} tidak boleh disentuh`);
  }
});

test("migration enables and forces RLS before owner-only SELECT policy", () => {
  const rlsOn = MIGRATION.indexOf("ALTER TABLE public.affiliate_promo_artifacts ENABLE ROW LEVEL SECURITY");
  const rlsForce = MIGRATION.indexOf("ALTER TABLE public.affiliate_promo_artifacts FORCE ROW LEVEL SECURITY");
  const policy = MIGRATION.indexOf("CREATE POLICY");
  assert.ok(rlsOn >= 0 && rlsForce >= 0 && policy > rlsForce, "susunan ENABLE→FORCE→POLICY");
  assert.ok(MIGRATION.includes("FOR SELECT"));
  assert.match(MIGRATION, /TO authenticated\s+USING \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.ok(!/FOR\s+(INSERT|UPDATE|DELETE)/i.test(MIGRATION), "tiada policy mutation");
});

test("migration grants no direct mutation to anon/authenticated", () => {
  assert.ok(!/GRANT\s+(INSERT|UPDATE|DELETE|ALL)/i.test(MIGRATION));
  assert.match(MIGRATION, /REVOKE ALL ON TABLE public\.affiliate_promo_artifacts FROM anon/i);
  assert.match(MIGRATION, /REVOKE ALL ON TABLE public\.affiliate_promo_artifacts FROM authenticated/i);
  assert.match(MIGRATION, /GRANT SELECT ON TABLE public\.affiliate_promo_artifacts TO authenticated/i);
  assert.ok(MIGRATION.includes("user_id uuid NOT NULL REFERENCES auth.users"));
  assert.ok(MIGRATION.includes("request_id uuid NOT NULL"));
  assert.ok(/UNIQUE\s*\(\s*user_id\s*,\s*request_id\s*\)/i.test(MIGRATION));
});

test("table bounds JSON and text payload sizes", () => {
  assert.ok(MIGRATION.includes("jsonb_typeof(artifact) = 'object'"));
  assert.ok(/CHECK\s*\(\s*octet_length\(artifact::text\)/i.test(MIGRATION));
  assert.ok(/rendered_text\s+text\s+NOT\s+NULL\s+CHECK\s*\(\s*octet_length/i.test(MIGRATION));
  assert.ok(MIGRATION.includes("CHECK (artifact->>'kind' = 'affiliate_promo')"));
});

test("verify SQL checks FORCE RLS, owner policy, no mutation grants, unique and index", () => {
  assert.ok(VERIFY.includes("rowsecurity"));
  assert.ok(VERIFY.includes("relforcerowsecurity"));
  assert.ok(VERIFY.includes("affiliate_promo_select_owner"));
  assert.ok(VERIFY.includes("pg_policies"));
  assert.ok(VERIFY.includes("information_schema.table_privileges"));
  assert.ok(!VERIFY.includes("DELETE FROM public.affiliate_promo_artifacts"));
});

test("SQL files contain no credentials", () => {
  for (const source of [MIGRATION, VERIFY, GATE_B]) {
    assert.ok(!/(sk-|supabase_co|eyJhbGciOi)/i.test(source));
  }
});

test("Gate B pack is atomic, verifies exact baseline and rejects legacy policy/count drift", () => {
  assert.match(GATE_B, /begin;[\s\S]*commit;[\s\S]*APS_GATE_B_PASS/i);
  for (const [table, count] of [["generated_outputs", 7], ["native_social_post_artifacts", 2], ["native_offer_artifacts", 3], ["native_whatsapp_draft_artifacts", 3], ["native_content_engine_artifacts", 15]] as const) {
    assert.match(GATE_B, new RegExp(`public\\.${table}\\) <> ${count}`));
    assert.ok(!new RegExp(`(INSERT|UPDATE|DELETE|ALTER)\\s+[^;]*public\\.${table}`, "i").test(GATE_B), `${table} mesti read-only`);
  }
  assert.match(GATE_B, /CREATE TEMP TABLE aps_legacy_policies_before/i);
  assert.match(GATE_B, /EXCEPT[\s\S]*aps_legacy_policies_before|aps_legacy_policies_before[\s\S]*EXCEPT/i);
  assert.match(GATE_B, /relforcerowsecurity/);
  assert.match(GATE_B, /request_id[^;]*'uuid'/i);
  assert.match(GATE_B, /mutation grants detected/i);
  assert.doesNotMatch(GATE_B, /^\s*\d+\|/m);
});
