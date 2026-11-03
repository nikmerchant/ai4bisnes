import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync(new URL("../src/app/actions.ts", import.meta.url), "utf8");
const portal = readFileSync(new URL("../src/app/api/stripe/portal/route.ts", import.meta.url), "utf8");

// FPX does not support recurring payments, so subscription Checkout offers card only.
test("subscription checkout offers card only", () => {
  assert.match(actions, /mode:\s*"subscription"/);
  assert.match(actions, /payment_method_types:\s*\["card"\]/);
  assert.doesNotMatch(actions, /"fpx"/);
});

// A customer whose renewal failed must still reach the portal to fix the card or cancel.
test("billing portal opens for active, past_due and unpaid subscriptions", () => {
  assert.match(portal, /\.in\(\s*"status",\s*\["active",\s*"past_due",\s*"unpaid"\]\s*\)/);
  assert.doesNotMatch(portal, /\.eq\(\s*"status",\s*"active"\s*\)/);
  assert.match(portal, /\.order\(\s*"created_at",\s*\{\s*ascending:\s*false\s*\}\s*\)/);
  assert.match(portal, /\.limit\(1\)/);
});
