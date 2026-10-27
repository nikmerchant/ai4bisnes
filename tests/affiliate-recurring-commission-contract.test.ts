import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function sql(path: string) {
  const url = new URL("../supabase/" + path, import.meta.url);
  assert.ok(existsSync(url), "Missing authorized SQL file: " + path);
  return readFileSync(url, "utf8").replace(/--[^\n]*/g, "").trim();
}

const phase1 = "migrations/202610270001_affiliate_invoice_id.sql";
const phase2 = "migrations/202610270002_affiliate_drop_subscription_unique.sql";

test("phase 1 adds a nullable invoice column and plain unique index while preserving the legacy arbiter", () => {
  const source = sql(phase1);
  assert.match(source, /^begin\s*;/i);
  assert.match(source, /commit\s*;$/i);
  assert.match(source, /add column if not exists stripe_invoice_id text\s*;/i);
  assert.match(source, /create unique index if not exists affiliate_commissions_stripe_invoice_id_key\s+on public\.affiliate_commissions\s*\(stripe_invoice_id\)\s*;/i);
  assert.doesNotMatch(source, /drop|subscription_id_key|not null|where|NULLS NOT DISTINCT/i);
});

test("phase 2 indexes subscription lookups before removing only the legacy uniqueness", () => {
  const source = sql(phase2);
  const create = /create index if not exists affiliate_commissions_subscription_id_idx\s+on public\.affiliate_commissions\s*\(subscription_id\)\s*;/i;
  const drop = /alter table public\.affiliate_commissions drop constraint if exists affiliate_commissions_subscription_id_key\s*;/i;
  assert.match(source, create);
  assert.match(source, drop);
  assert.ok(source.search(create) < source.search(drop));
  assert.match(source, /^begin\s*;/i);
  assert.match(source, /commit\s*;$/i);
  assert.doesNotMatch(source, /drop\s+(table|column)|stripe_invoice_id|foreign key/i);
});

test("real commission payload and conflict target match the invoice unique index", () => {
  const source = ts.createSourceFile("route.ts", readFileSync(new URL("../src/app/api/stripe/webhook/route.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const calls: ts.CallExpression[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "upsert") {
      const receiver = node.expression.expression;
      if (ts.isCallExpression(receiver) && ts.isPropertyAccessExpression(receiver.expression) &&
        receiver.expression.name.text === "from" && ts.isStringLiteral(receiver.arguments[0]) &&
        receiver.arguments[0].text === "affiliate_commissions") calls.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(calls.length, 1);
  const [payload, options] = calls[0].arguments;
  assert.ok(ts.isObjectLiteralExpression(payload) && ts.isObjectLiteralExpression(options));
  assert.deepEqual(payload.properties.map((property) => {
    assert.ok(ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property));
    assert.ok(ts.isIdentifier(property.name));
    return property.name.text;
  }).sort(), ["amount_rm", "referred_user_id", "referrer_id", "stripe_invoice_id", "subscription_id"]);
  const conflict = options.properties.find((property) => property.name?.getText(source) === "onConflict");
  assert.ok(conflict && ts.isPropertyAssignment(conflict) && ts.isStringLiteral(conflict.initializer));
  const index = sql(phase1).match(/on public\.affiliate_commissions\s*\((stripe_invoice_id)\)\s*;/i);
  assert.ok(index);
  assert.equal(conflict.initializer.text, index[1]);
});

test("each verify is a single read-only SELECT and rollback guards precede schema changes", () => {
  for (const phase of ["phase1", "phase2"]) {
    const verify = sql("tests/verify_affiliate_recurring_" + phase + ".sql");
    assert.equal(verify.split(";").filter((part) => part.trim()).length, 1);
    assert.match(verify, /^with\b/i);
    assert.match(verify, /\bselect\b/i);
    assert.match(verify, /'ALL_CHECKS'/);
    assert.match(verify, /'PASS'/);
    assert.match(verify, /'FAIL'/);
    assert.doesNotMatch(verify, /\b(begin|commit|rollback|insert|update|delete|alter|drop|create|lock|do)\b/i);
    const rollback = sql("tests/rollback_affiliate_recurring_" + phase + ".sql");
    assert.match(rollback, /lock table public\.affiliate_commissions in access exclusive mode/i);
    assert.ok(rollback.indexOf("raise exception") < rollback.indexOf("drop index"));
    if (phase === "phase1") {
      assert.match(rollback, /stripe_invoice_id is not null/i);
      assert.match(rollback, /affiliate_commissions_subscription_id_key/);
    } else {
      assert.match(rollback, /group by subscription_id\s+having count\(\*\) > 1/i);
      assert.match(rollback, /add constraint affiliate_commissions_subscription_id_key unique \(subscription_id\)/i);
    }
  }
});
