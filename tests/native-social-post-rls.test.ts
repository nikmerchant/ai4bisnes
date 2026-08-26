import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/202608260001_native_social_post_rls.sql", import.meta.url), "utf8");
const verify = readFileSync(new URL("../supabase/tests/verify_native_social_post_rls.sql", import.meta.url), "utf8");

const TABLE = "native_social_post_artifacts";

test("migration is additive and never mutates generated_outputs 1.0", () => {
  const executableSql = migration.replace(/^\s*--.*$/gm, "");
  assert.match(executableSql, /create table if not exists public\.native_social_post_artifacts/);
  assert.doesNotMatch(executableSql, /(alter|drop|truncate|update|delete from|insert into)\s+(table\s+)?public\.generated_outputs/i);
  assert.match(migration, /MUST NOT alter public\.generated_outputs/);
});

test("migration creates durable owner/request idempotency", () => {
  assert.match(migration, /request_id uuid not null/);
  assert.match(migration, /unique \(user_id, request_id\)/);
  assert.match(verify, /native_social_post_user_request_unique/);
  assert.match(verify, /contype = 'u'/);
});

test("migration installs RLS before owner-only SELECT policy", () => {
  const order = [
    migration.indexOf("enable row level security"),
    migration.indexOf("force row level security"),
    migration.indexOf("drop policy if exists"),
    migration.indexOf("revoke all"),
    migration.indexOf("grant select"),
    migration.indexOf('create policy "native social posts owner select"'),
    migration.indexOf("create index if not exists"),
  ];
  assert.ok(order.every((pos) => pos >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);

  const policy = migration.slice(
    migration.indexOf('create policy "native social posts owner select"'),
    migration.indexOf("-- Mutations are route-only")
  );
  assert.match(policy, /for select/);
  assert.match(policy, /to authenticated/);
  assert.match(policy, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(policy, /for insert|for update|for delete|for all/i);
});

test("migration grants no direct mutations to anon/authenticated", () => {
  assert.match(migration, new RegExp(`revoke all on table public\\.${TABLE} from anon`));
  assert.match(migration, new RegExp(`revoke all on table public\\.${TABLE} from authenticated`));
  assert.match(migration, new RegExp(`grant select on table public\\.${TABLE} to authenticated`));
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete|all|truncate)/i);
});

test("table constrains JSON shape and rendered text size", () => {
  assert.equal((migration.match(/jsonb_typeof/g) ?? []).length, 3);
  assert.match(migration, /octet_length\(rendered_text\) <= 50000/);
  assert.match(migration, /references auth\.users\(id\) on delete cascade/);
});

test("verify SQL checks FORCE RLS, policy, mutation grants, index and unique", () => {
  assert.match(verify, /relforcerowsecurity/);
  assert.match(verify, /relrowsecurity/);
  assert.match(verify, /policyname = 'native social posts owner select'/);
  assert.match(verify, /roles = array\['authenticated'\]::name\[\]/);
  assert.match(verify, /privilege_type in \('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'\)/);
  assert.match(verify, /native_social_post_user_created_idx/);
  assert.match(verify, /native_social_post_user_request_unique/);
});

test("SQL files contain no credentials and DDL scope stays on shadow table", () => {
  for (const sql of [migration, verify]) {
    assert.ok(!/(api[-_]?key|password|secret|token)\s*[:=]/i.test(sql));
  }
  for (const match of migration.matchAll(/\b(?:table|on)\s+public\.(\w+)/gi)) {
    assert.equal(match[1], TABLE, `unexpected DDL scope: ${match[0]}`);
  }
});
