import assert from "node:assert/strict";
import test from "node:test";

import { executeBenchmarkWithMocks, type CandidateCallInput, type JudgeCallInput } from "../scripts/provider-benchmark/executor.ts";
import { loadFixtureSet } from "../scripts/provider-benchmark/core.ts";

const FIXTURES = "C:/Users/USER/Documents/Hermes Projects/AI4Bisnes 2.0/strategy/provider-benchmark/evaluation/provider-bm-v1-fixtures.json";

function rawFor(input: CandidateCallInput): string {
  if (input.fixture.task === "social_post") return JSON.stringify({
    schemaVersion: 999, kind: "hacked", status: "approved", platform: "hacked", objective: "hacked", angle: "hacked", topic: "hacked",
    hook: `Hook BM ${input.fixture.id}`, body: "Penerangan ringkas berdasarkan konteks sintetik yang diberikan.", callToAction: "Hubungi kami untuk semakan lanjut.", hashtags: ["#PKSMalaysia"], tone: "Mesra", assumptions: [], businessContext: { hacked: true },
  });
  if (input.fixture.task === "offer") return JSON.stringify({ headline: `Tawaran ${input.fixture.id}`, promise: "Nilai jelas berdasarkan maklumat yang diberikan.", valueStack: ["Komponen satu", "Komponen dua", "Komponen tiga"], callToAction: "Minta semakan lanjut.", assumptions: [] });
  return JSON.stringify({ greeting: "Hai, terima kasih kerana menghubungi kami.", acknowledgment: "Kami faham pertanyaan anda.", body: "Kami akan semak maklumat yang diperlukan dahulu.", nextStep: "Kongsikan butiran untuk semakan manual.", assumptions: [] });
}

function judgeRaw(input: JudgeCallInput): string {
  assert.doesNotMatch(input.prompt, /deepseek|deterministic-v1|claude/i);
  return JSON.stringify({ fixtureId: input.fixture.id, preferredCandidate: "A", scores: { schemaContract: 25, claimSafety: 25, bmClarity: 18, usefulness: 13, voiceConsistency: 9, latencyCost: 4 }, safetyFlags: [], rationale: "Semua calon mematuhi kontrak; A paling jelas." });
}

test("mocked E2E executes exact 112-step plan through production builders/parsers with zero global fetch", async () => {
  const set = loadFixtureSet(FIXTURES);
  let candidateCalls = 0;
  let judgeCalls = 0;
  let globalCalls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => { globalCalls += 1; throw new Error("real network forbidden"); };
  try {
    const result = await executeBenchmarkWithMocks({
      fixtureSet: set,
      now: new Date("2026-09-03T00:00:00.000Z"),
      candidateCall: async (input) => { candidateCalls += 1; return { raw: rawFor(input), inputTokens: 200, outputTokens: 100, requestId: `mock-${candidateCalls}` }; },
      judgeCall: async (input) => { judgeCalls += 1; return { raw: judgeRaw(input), inputTokens: 300, outputTokens: 100, requestId: `judge-${judgeCalls}` }; },
    });
    assert.equal(globalCalls, 0);
    assert.equal(candidateCalls, 64);
    assert.equal(judgeCalls, 24);
    assert.equal(result.records.length, 112);
    assert.deepEqual(result.summary, { totalSteps: 112, baseline: 24, flash: 48, pro: 16, judge: 24, judgeDeferred: 0, providerCallsMade: 88, actualNetworkCalls: 0 });
    assert.equal(result.records.filter((record) => record.hardGatePassed === false).length, 0);
    assert.ok(result.estimatedSpendRm > 0 && result.estimatedSpendRm < 7.5);
  } finally { globalThis.fetch = original; }
});

test("production parser reconstruction defeats provider attempts to override protected Social fields", async () => {
  const set = loadFixtureSet(FIXTURES);
  const fixture = set.fixtures.find((item) => item.id === "PB-S07")!;
  const result = await executeBenchmarkWithMocks({
    fixtureSet: { ...set, fixtures: [fixture] },
    now: new Date("2026-09-03T00:00:00.000Z"),
    candidateCall: async (input) => ({ raw: rawFor(input), inputTokens: 10, outputTokens: 10, requestId: "mock" }),
    judgeCall: async (input) => ({ raw: judgeRaw(input), inputTokens: 10, outputTokens: 10, requestId: "judge" }),
  });
  for (const record of result.records.filter((item) => item.candidate === "flash" || item.candidate === "pro")) {
    const artifact = record.parsedArtifact as Record<string, unknown>;
    assert.equal(artifact.kind, "social_post");
    assert.equal(artifact.status, "draft");
    assert.equal(artifact.platform, fixture.request.platform);
    assert.equal(artifact.topic, fixture.request.topic);
    assert.deepEqual(artifact.businessContext, fixture.businessContext);
  }
});

test("executor stops before auto-stop when mocked usage would exceed RM7.50", async () => {
  const set = loadFixtureSet(FIXTURES);
  await assert.rejects(executeBenchmarkWithMocks({
    fixtureSet: set,
    now: new Date("2026-09-03T00:00:00.000Z"),
    candidateCall: async (input) => ({ raw: rawFor(input), inputTokens: 2_000_000, outputTokens: 1_000_000, requestId: "expensive" }),
    judgeCall: async (input) => ({ raw: judgeRaw(input), inputTokens: 1, outputTokens: 1, requestId: "judge" }),
  }), /BUDGET_STOP/);
});

test("malformed provider output is recorded as a hard-gate failure, not silently replaced", async () => {
  const set = loadFixtureSet(FIXTURES);
  const fixture = set.fixtures.find((item) => item.id === "PB-W05")!;
  const result = await executeBenchmarkWithMocks({
    fixtureSet: { ...set, fixtures: [fixture] },
    now: new Date("2026-09-03T00:00:00.000Z"),
    candidateCall: async () => ({ raw: "not-json", inputTokens: 1, outputTokens: 1, requestId: "bad" }),
    judgeCall: async (input) => ({ raw: judgeRaw(input), inputTokens: 1, outputTokens: 1, requestId: "judge" }),
  });
  assert.equal(result.records.filter((record) => record.candidate === "flash" || record.candidate === "pro").every((record) => record.hardGatePassed === false), true);
});

test("null judgeCall defers all judge steps, spends nothing and still completes 112 steps", async () => {
  const set = loadFixtureSet(FIXTURES);
  const result = await executeBenchmarkWithMocks({
    fixtureSet: set,
    now: new Date("2026-09-03T00:00:00.000Z"),
    candidateCall: async (input) => ({ raw: rawFor(input), inputTokens: 200, outputTokens: 100, requestId: "mock" }),
    judgeCall: null,
  });
  assert.equal(result.records.length, 112);
  assert.equal(result.summary.judgeDeferred, 24);
  assert.equal(result.summary.providerCallsMade, 64);
  const judgeRecords = result.records.filter((record) => record.candidate === "judge");
  assert.equal(judgeRecords.every((record) => record.hardGateError === "judge_deferred_no_anthropic_key"), true);
  assert.equal(judgeRecords.every((record) => record.estimatedCostRm === 0), true);
});

test("single candidate transport failure is recorded and the run continues", async () => {
  const set = loadFixtureSet(FIXTURES);
  let calls = 0;
  const result = await executeBenchmarkWithMocks({
    fixtureSet: set,
    now: new Date("2026-09-03T00:00:00.000Z"),
    candidateCall: async (input) => {
      calls += 1;
      if (calls === 3) throw new Error("deepseek_http_429");
      return { raw: rawFor(input), inputTokens: 100, outputTokens: 50, requestId: "mock" };
    },
    judgeCall: null,
  });
  assert.equal(result.records.length, 112);
  const transportFailures = result.records.filter((record) => record.hardGateError?.startsWith("transport_"));
  assert.equal(transportFailures.length, 1);
  assert.equal(transportFailures[0].hardGateError, "transport_deepseek_http_429");
  assert.equal(result.summary.providerCallsMade, 64);
});
