import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildRunPlan, executionAllowed, fixtureSetSha256, loadFixtureSet, summarizePlan } from "./core.ts";

function valueAfter(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : null;
}

const fixturesPath = valueAfter("--fixtures");
if (!fixturesPath) throw new Error("Usage: node runner.ts --fixtures <provider-bm-v1-fixtures.json> [--output <manifest.json>] [--execute]");

const absoluteFixtures = resolve(fixturesPath);
const set = loadFixtureSet(absoluteFixtures);
const plan = buildRunPlan(set);

if (process.argv.includes("--execute")) {
  if (!executionAllowed(process.argv, process.env)) throw new Error("PAID_EXECUTION_NOT_AUTHORIZED");
  const { executeBenchmarkWithMocks } = await import("./executor.ts");
  const { callDeepSeekCandidate, callClaudeJudge } = await import("./transports.ts");
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY_missing");
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const judgeModelId = process.env.CLAUDE_SONNET_5_MODEL_ID;
  const judgeCall = anthropicKey && judgeModelId && /^claude-sonnet-5/.test(judgeModelId)
    ? (input: { prompt: string }) => callClaudeJudge({ apiKey: anthropicKey, modelId: judgeModelId as string, prompt: input.prompt })
    : null;
  const result = await executeBenchmarkWithMocks({
    fixtureSet: set,
    now: new Date(),
    candidateCall: (input) => callDeepSeekCandidate({ apiKey: deepseekKey, modelId: input.modelId, prompt: input.prompt }),
    judgeCall,
  });
  const manifest = {
    benchmarkVersion: "provider-bm-v1",
    mode: "paid_execute",
    fixtureSet: set.fixtureSet,
    fixtureSetSha256: fixtureSetSha256(absoluteFixtures),
    budget: set.budget,
    judgeAvailable: Boolean(judgeCall),
    summary: result.summary,
    estimatedSpendRm: result.estimatedSpendRm,
    hardGateFailures: result.records.filter((record) => !record.hardGatePassed).map(({ fixtureId, candidate, runNumber, hardGateError }) => ({ fixtureId, candidate, runNumber, hardGateError })),
    records: result.records.map((record) => ({ ...record, parsedArtifact: record.parsedArtifact ? JSON.parse(JSON.stringify(record.parsedArtifact)) : null })),
  };
  const output = valueAfter("--output");
  if (output) {
    const absoluteOutput = resolve(output);
    mkdirSync(dirname(absoluteOutput), { recursive: true });
    writeFileSync(absoluteOutput, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({ ...manifest, records: `${manifest.records.length} records (see output file)` }, null, 2));
} else {
  const manifest = {
    benchmarkVersion: "provider-bm-v1",
    mode: "dry_run",
    providerCallsMade: 0,
    fixtureSet: set.fixtureSet,
    fixtureSetSha256: fixtureSetSha256(absoluteFixtures),
    budget: set.budget,
    summary: summarizePlan(plan),
    nikSpotCheck: set.fixtures.filter((fixture) => fixture.nikSpotCheck).map((fixture) => fixture.id),
    hardSubset: set.fixtures.filter((fixture) => fixture.hardSubset).map((fixture) => fixture.id),
    plan,
  };
  const output = valueAfter("--output");
  if (output) {
    const absoluteOutput = resolve(output);
    mkdirSync(dirname(absoluteOutput), { recursive: true });
    writeFileSync(absoluteOutput, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(manifest, null, 2));
}
