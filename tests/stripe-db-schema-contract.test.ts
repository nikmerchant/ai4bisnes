import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Frozen production baseline from A4B-029, 2026-10-26 (canonical schema-check result).
// Keep this test portable: it does not depend on a separate planning checkout.
const originalColumns = new Set([
  "id", "user_id", "tier", "period", "price_rm", "status",
  "bill_code", "starts_at", "expires_at", "created_at",
]);
const migrationUrl = new URL("../supabase/migrations/202610260001_stripe_subscription_columns.sql", import.meta.url);
const routeUrl = new URL("../src/app/api/stripe/webhook/route.ts", import.meta.url);

function migration() {
  assert.ok(existsSync(migrationUrl), "The authorized Stripe schema migration must exist");
  return readFileSync(migrationUrl, "utf8");
}

function visit(node: ts.Node, callback: (node: ts.Node) => void) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function subscriptionReceiver(expression: ts.Expression): boolean {
  if (ts.isCallExpression(expression)) {
    if (ts.isPropertyAccessExpression(expression.expression)) {
      if (expression.expression.name.text === "from") {
        const table = expression.arguments[0];
        return ts.isStringLiteral(table) && table.text === "subscriptions";
      }
      return subscriptionReceiver(expression.expression.expression);
    }
  }
  return false;
}

function statusOutputs(expression: ts.Expression): string[] {
  if (ts.isStringLiteral(expression)) return [expression.text];
  if (ts.isConditionalExpression(expression)) {
    return [...statusOutputs(expression.whenTrue), ...statusOutputs(expression.whenFalse)];
  }
  if (ts.isParenthesizedExpression(expression)) return statusOutputs(expression.expression);
  throw new Error("Cannot resolve stored subscription status: " + expression.getText());
}

function subscriptionWrites() {
  const file = ts.createSourceFile("route.ts", readFileSync(routeUrl, "utf8"), ts.ScriptTarget.Latest, true);
  const objects = new Map<string, ts.ObjectLiteralExpression>();
  visit(file, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
      node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      objects.set(node.name.text, node.initializer);
    }
  });
  const assignments = new Map<string, { column: string; value: ts.Expression }[]>();
  visit(file, (node) => {
    if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
    const target = node.left;
    if (!ts.isPropertyAccessExpression(target) && !ts.isElementAccessExpression(target)) return;
    if (!ts.isIdentifier(target.expression) || !objects.has(target.expression.text)) return;
    let column: string;
    if (ts.isPropertyAccessExpression(target)) {
      column = target.name.text;
    } else {
      assert.ok(ts.isStringLiteral(target.argumentExpression), "Dynamic assigned column");
      column = target.argumentExpression.text;
    }
    const list = assignments.get(target.expression.text) ?? [];
    list.push({ column, value: node.right });
    assignments.set(target.expression.text, list);
  });
  const writes: { columns: string[]; statuses: string[]; conflict?: string }[] = [];
  visit(file, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) ||
      !["upsert", "update"].includes(node.expression.name.text) ||
      !subscriptionReceiver(node.expression.expression)) return;
    const value = node.arguments[0];
    const object = ts.isIdentifier(value) ? objects.get(value.text) : value;
    assert.ok(object && ts.isObjectLiteralExpression(object), "Unresolved subscription write payload");
    const columns: string[] = [];
    const statuses: string[] = [];
    for (const property of object.properties) {
      assert.ok(ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property), "Unsupported write property");
      assert.ok(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name), "Dynamic write column");
      columns.push(property.name.text);
      if (property.name.text === "status") {
        assert.ok(ts.isPropertyAssignment(property), "Status must be statically resolvable");
        statuses.push(...statusOutputs(property.initializer));
      }
    }
    if (ts.isIdentifier(value)) {
      for (const assignment of assignments.get(value.text) ?? []) {
        columns.push(assignment.column);
        if (assignment.column === "status") statuses.push(...statusOutputs(assignment.value));
      }
    }
    let conflict: string | undefined;
    const options = node.arguments[1];
    if (options && ts.isObjectLiteralExpression(options)) {
      for (const property of options.properties) {
        if (ts.isPropertyAssignment(property) && property.name.getText(file) === "onConflict") {
          assert.ok(ts.isStringLiteral(property.initializer), "Conflict key must be statically resolvable");
          conflict = property.initializer.text;
        }
      }
    }
    writes.push({ columns, statuses, conflict });
  });
  assert.ok(writes.length > 0, "No subscription writes were inspected");
  return writes;
}

test("every subscription column and stored status written by the real webhook matches the migrated production schema", () => {
  const sql = migration();
  const added = [...sql.matchAll(/alter\s+table\s+public\.subscriptions\s+add\s+column\s+if\s+not\s+exists\s+(\w+)\s+(\w+)/gi)];
  assert.deepEqual(added.map((match) => [match[1], match[2]]), [
    ["stripe_subscription_id", "text"], ["stripe_customer_id", "text"],
  ]);
  const columns = new Set([...originalColumns, ...added.map((match) => match[1])]);
  const check = sql.match(/check\s*\(\s*status\s+in\s*\(([^)]+)\)\s*\)/i);
  assert.ok(check, "Migration must define the status constraint");
  const allowed = new Set([...check[1].matchAll(/'([^']+)'/g)].map((match) => match[1]));
  assert.deepEqual([...allowed].sort(), ["active", "cancelled", "expired", "incomplete", "past_due", "pending", "unpaid"]);
  for (const write of subscriptionWrites()) {
    for (const column of write.columns) assert.ok(columns.has(column), "Unknown subscription column: " + column);
    for (const status of write.statuses) assert.ok(allowed.has(status), "Rejected subscription status: " + status);
  }
});

test("checkout conflict target has a plain unique index compatible with PostgREST inference", () => {
  const sql = migration();
  const index = sql.match(/create\s+unique\s+index\s+if\s+not\s+exists\s+subscriptions_stripe_subscription_id_key\s+on\s+public\.subscriptions\s*\(\s*(\w+)\s*\)\s*;/i);
  assert.ok(index, "Stripe conflict index must be unique and non-partial (B1)");
  const checkout = subscriptionWrites().filter((write) => write.conflict !== undefined);
  assert.equal(checkout.length, 1);
  assert.equal(checkout[0].conflict, index[1]);
});
