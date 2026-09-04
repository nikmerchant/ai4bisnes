import assert from "node:assert/strict";
import test from "node:test";

import {
  BudgetGuard,
  buildRunPlan,
  createBlindAliases,
  executionAllowed,
  loadFixtureSet,
  summarizePlan,
} from "../scripts/provider-benchmark/core.ts";

const FIXTURES = "C:/Users/USER/Documents/Hermes Projects/AI4Bisnes 2.0/strategy/provider-benchmark/evaluation/provider-bm-v1-fixtures.json";

test("fixture set loads and preserves frozen matrix/hash", () => {
  const set = loadFixtureSet(FIXTURES);
  assert.equal(set.fixtures.length, 24);
  assert.equal(set.fixtures.filter((fixture) => fixture.task === "social_post").length, 8);
  assert.equal(set.fixtures.filter((fixture) => fixture.task === "offer").length, 8);
  assert.equal(set.fixtures.filter((fixture) => fixture.task === "whatsapp").length, 8);
  assert.equal(set.fixtures.filter((fixture) => fixture.hardSubset).length, 8);
  assert.equal(set.fixtures.filter((fixture) => fixture.nikSpotCheck).length, 6);
  assert.equal(set.providerCallsAuthorized, false);
});

test("run plan is exact: 24 baseline, 48 Flash, 16 Pro, 24 judge", () => {
  const plan = buildRunPlan(loadFixtureSet(FIXTURES));
  const summary = summarizePlan(plan);
  assert.deepEqual(summary, { totalSteps: 112, localSteps: 24, futurePaidCalls: 88, baseline: 24, flash: 48, pro: 16, judge: 24 });
  assert.equal(plan.filter((step) => step.candidate === "pro").every((step) => step.hardSubset), true);
});

test("blind aliases are deterministic, complete and hide candidate names", () => {
  const one = createBlindAliases("PB-S06", 1, ["baseline", "flash", "pro"]);
  const two = createBlindAliases("PB-S06", 1, ["baseline", "flash", "pro"]);
  assert.deepEqual(one, two);
  assert.deepEqual(new Set(Object.values(one)), new Set(["A", "B", "C"]));
  assert.equal(JSON.stringify(one).includes("deepseek"), false);
});

test("budget guard stops before RM7.50 and always rejects above RM10", () => {
  const guard = new BudgetGuard({ autoStopRm: 7.5, hardCapRm: 10 });
  guard.commit(7.2);
  assert.equal(guard.canReserve(0.29), true);
  assert.equal(guard.canReserve(0.31), false);
  assert.throws(() => guard.commit(3), /BUDGET_STOP/);
  assert.equal(guard.spentRm, 7.2);
});

test("execution is impossible without both CLI flag and separate environment acknowledgment", () => {
  assert.equal(executionAllowed([], {}), false);
  assert.equal(executionAllowed(["--execute"], {}), false);
  assert.equal(executionAllowed([], { PROVIDER_BM_EXECUTION_AUTHORIZED: "I_ACKNOWLEDGE_PAID_OFFLINE_RUN" }), false);
  assert.equal(executionAllowed(["--execute"], { PROVIDER_BM_EXECUTION_AUTHORIZED: "I_ACKNOWLEDGE_PAID_OFFLINE_RUN" }), true);
});

test("current frozen fixture authorization cannot be mistaken for paid execution authorization", () => {
  const set = loadFixtureSet(FIXTURES);
  assert.equal(set.providerCallsAuthorized, false);
  assert.equal(executionAllowed(["--execute"], { PROVIDER_BM_EXECUTION_AUTHORIZED: "false" }), false);
});
