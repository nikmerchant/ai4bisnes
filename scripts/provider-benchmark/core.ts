import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export type BenchmarkTask = "social_post" | "offer" | "whatsapp";
export type BenchmarkCandidate = "baseline" | "flash" | "pro" | "judge";

export type BenchmarkFixture = {
  id: string;
  task: BenchmarkTask;
  segment: string;
  difficulty: "normal" | "hard";
  hardSubset: boolean;
  nikSpotCheck: boolean;
  businessContext: Record<string, unknown>;
  request: Record<string, unknown>;
  sourceArtifact: Record<string, unknown> | null;
  riskTags: string[];
  expectedInvariants: string[];
  judgeFocus: string[];
};

export type BenchmarkFixtureSet = {
  schemaVersion: string;
  fixtureSet: string;
  syntheticOnly: true;
  containsProductionData: false;
  providerCallsAuthorized: false;
  repeats: 2;
  budget: { currency: "MYR"; hardCap: 10; autoStop: 7.5 };
  fixtures: BenchmarkFixture[];
};

export type RunPlanStep = {
  fixtureId: string;
  task: BenchmarkTask;
  candidate: BenchmarkCandidate;
  modelId: string;
  runNumber: number;
  paid: boolean;
  hardSubset: boolean;
  nikSpotCheck: boolean;
};

function requiredRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}_invalid`);
  return value as Record<string, unknown>;
}

/** Load and fail closed on any drift from the approved fixture envelope. */
export function loadFixtureSet(path: string): BenchmarkFixtureSet {
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const root = requiredRecord(raw, "fixture_set");
  if (root.fixtureSet !== "provider-bm-v1" || root.syntheticOnly !== true || root.containsProductionData !== false || root.providerCallsAuthorized !== false || root.repeats !== 2) throw new Error("fixture_boundary_invalid");
  const budget = requiredRecord(root.budget, "budget");
  if (budget.currency !== "MYR" || budget.hardCap !== 10 || budget.autoStop !== 7.5) throw new Error("budget_boundary_invalid");
  if (!Array.isArray(root.fixtures) || root.fixtures.length !== 24) throw new Error("fixture_count_invalid");
  const fixtures: BenchmarkFixture[] = [];
  const ids = new Set<string>();
  for (const value of root.fixtures) {
    const fixture = requiredRecord(value, "fixture");
    if (typeof fixture.id !== "string" || ids.has(fixture.id)) throw new Error("fixture_id_invalid");
    if (!["social_post", "offer", "whatsapp"].includes(String(fixture.task))) throw new Error(`fixture_task_invalid:${fixture.id}`);
    if (fixture.difficulty !== "normal" && fixture.difficulty !== "hard") throw new Error(`fixture_difficulty_invalid:${fixture.id}`);
    if (typeof fixture.hardSubset !== "boolean" || typeof fixture.nikSpotCheck !== "boolean") throw new Error(`fixture_subset_invalid:${fixture.id}`);
    if (fixture.hardSubset && fixture.difficulty !== "hard") throw new Error(`fixture_hard_mismatch:${fixture.id}`);
    for (const key of ["riskTags", "expectedInvariants", "judgeFocus"] as const) if (!Array.isArray(fixture[key]) || fixture[key].length < 1) throw new Error(`fixture_${key}_invalid:${fixture.id}`);
    requiredRecord(fixture.businessContext, "business_context");
    requiredRecord(fixture.request, "request");
    ids.add(fixture.id);
    fixtures.push(fixture as BenchmarkFixture);
  }
  const tasks = ["social_post", "offer", "whatsapp"] as const;
  if (tasks.some((task) => fixtures.filter((fixture) => fixture.task === task).length !== 8)) throw new Error("fixture_task_matrix_invalid");
  if (fixtures.filter((fixture) => fixture.hardSubset).length !== 8 || fixtures.filter((fixture) => fixture.nikSpotCheck).length !== 6) throw new Error("fixture_subset_count_invalid");
  return raw as BenchmarkFixtureSet;
}

export function fixtureSetSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function buildRunPlan(set: BenchmarkFixtureSet): RunPlanStep[] {
  const steps: RunPlanStep[] = [];
  for (const fixture of set.fixtures) {
    steps.push({ fixtureId: fixture.id, task: fixture.task, candidate: "baseline", modelId: "deterministic-v1", runNumber: 1, paid: false, hardSubset: fixture.hardSubset, nikSpotCheck: fixture.nikSpotCheck });
    for (let runNumber = 1; runNumber <= set.repeats; runNumber += 1) {
      steps.push({ fixtureId: fixture.id, task: fixture.task, candidate: "flash", modelId: "deepseek-v4-flash", runNumber, paid: true, hardSubset: fixture.hardSubset, nikSpotCheck: fixture.nikSpotCheck });
      if (fixture.hardSubset) steps.push({ fixtureId: fixture.id, task: fixture.task, candidate: "pro", modelId: "deepseek-v4-pro", runNumber, paid: true, hardSubset: true, nikSpotCheck: fixture.nikSpotCheck });
    }
    steps.push({ fixtureId: fixture.id, task: fixture.task, candidate: "judge", modelId: "CLAUDE_SONNET_5_MODEL_ID_REQUIRED_AT_EXECUTION", runNumber: 1, paid: true, hardSubset: fixture.hardSubset, nikSpotCheck: fixture.nikSpotCheck });
  }
  return steps;
}

export function summarizePlan(plan: RunPlanStep[]) {
  const count = (candidate: BenchmarkCandidate) => plan.filter((step) => step.candidate === candidate).length;
  const baseline = count("baseline");
  const flash = count("flash");
  const pro = count("pro");
  const judge = count("judge");
  return { totalSteps: plan.length, localSteps: baseline, futurePaidCalls: flash + pro + judge, baseline, flash, pro, judge };
}

/** Stable blinded candidate aliases; no model names leak to the judge. */
export function createBlindAliases(fixtureId: string, runNumber: number, candidates: Array<"baseline" | "flash" | "pro">) {
  const ordered = [...candidates].sort((left, right) => {
    const hash = (value: string) => createHash("sha256").update(`${fixtureId}:${runNumber}:${value}`).digest("hex");
    return hash(left).localeCompare(hash(right));
  });
  return Object.fromEntries(ordered.map((candidate, index) => [candidate, String.fromCharCode(65 + index)])) as Record<"baseline" | "flash" | "pro", string>;
}

export class BudgetGuard {
  #spentRm = 0;
  readonly autoStopRm: number;
  readonly hardCapRm: number;
  constructor(input: { autoStopRm: number; hardCapRm: number }) {
    if (!Number.isFinite(input.autoStopRm) || !Number.isFinite(input.hardCapRm) || input.autoStopRm <= 0 || input.hardCapRm < input.autoStopRm) throw new Error("budget_config_invalid");
    this.autoStopRm = input.autoStopRm;
    this.hardCapRm = input.hardCapRm;
  }
  get spentRm() { return this.#spentRm; }
  canReserve(projectedRm: number) { return Number.isFinite(projectedRm) && projectedRm >= 0 && this.#spentRm + projectedRm <= this.autoStopRm && this.#spentRm + projectedRm <= this.hardCapRm; }
  commit(actualRm: number) {
    if (!Number.isFinite(actualRm) || actualRm < 0 || this.#spentRm + actualRm > this.autoStopRm || this.#spentRm + actualRm > this.hardCapRm) throw new Error("BUDGET_STOP");
    this.#spentRm += actualRm;
  }
}

/** Two-key lock: CLI intent + separately granted environment acknowledgment. */
export function executionAllowed(argv: string[], env: Record<string, string | undefined>) {
  return argv.includes("--execute") && env.PROVIDER_BM_EXECUTION_AUTHORIZED === "I_ACKNOWLEDGE_PAID_OFFLINE_RUN";
}
