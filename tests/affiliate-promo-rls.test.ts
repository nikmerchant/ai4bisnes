import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const MIGRATION = readFileSync("supabase/migrations/202609040001_affiliate_promo_artifacts.sql", "utf8");
const VERIFY = readFileSync("supabase/tests/verify_affiliate_promo.sql", "utf8");

test("migration is additive, isolated and never mutates existing tables", () => {
  assert.ok(MIGRATION.includes("CREATE TABLE IF NOT EXISTS public.affiliate_promo_artifacts"));
  assert.ok(!/ALTER\s+TABLE\s+(?!public\.affiliate_promo_artifacts)/i.test(MIGRATION));
  assert.ok(!/DROP\s+(TABLE|POLICY|INDEX)/i.test(MIGRATION));
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
  assert.ok(MIGRATION.includes("USING (auth.uid() = user_id)"));
  assert.ok(!/FOR\s+(INSERT|UPDATE|DELETE)/i.test(MIGRATION), "tiada policy mutation");
});

test("migration grants no direct mutation to anon/authenticated", () => {
  assert.ok(!/GRANT\s+(INSERT|UPDATE|DELETE|ALL)/i.test(MIGRATION));
  assert.ok(MIGRATION.includes("user_id uuid NOT NULL REFERENCES auth.users"));
  assert.ok(MIGRATION.includes("request_id text NOT NULL"));
  assert.ok(/UNIQUE\s*\(\s*user_id\s*,\s*request_id\s*\)/i.test(MIGRATION));
});

test("table bounds JSON and text payload sizes", () => {
  assert.ok(/artifact\s+jsonb\s+NOT\s+NULL\s+CHECK\s*\(\s*octet_length/i.test(MIGRATION));
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
  for (const source of [MIGRATION, VERIFY]) {
    assert.ok(!/(sk-|supabase_co|eyJhbGciOi)/i.test(source));
  }
});
