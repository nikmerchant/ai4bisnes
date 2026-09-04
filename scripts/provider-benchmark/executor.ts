import {
  buildBusinessContextSnapshot,
  buildDeterministicSocialPost,
  parseNativeSocialPostRequest,
  type NativeSocialPostBusinessProfile,
  type SocialPostArtifact,
} from "../../src/lib/native-social-post/domain.ts";
import { buildNativeSocialPostPrompt } from "../../src/lib/native-social-post/prompt.ts";
import { parseProviderSocialPostArtifact } from "../../src/lib/native-social-post/provider-output.ts";
import {
  buildDeterministicOffer,
  buildOfferBusinessContextSnapshot,
  parseNativeOfferRequest,
  type NativeOfferBusinessProfile,
  type OfferArtifact,
  type OfferSourcePostSnapshot,
} from "../../src/lib/native-offer/domain.ts";
import { buildNativeOfferPrompt } from "../../src/lib/native-offer/prompt.ts";
import { parseProviderOfferArtifact } from "../../src/lib/native-offer/provider-output.ts";
import {
  buildDeterministicWhatsAppDraft,
  buildWhatsAppBusinessContextSnapshot,
  parseNativeWhatsAppRequest,
  type WhatsAppDraftArtifact,
  type WhatsAppSourceOfferSnapshot,
} from "../../src/lib/native-whatsapp/domain.ts";
import { buildNativeWhatsAppPrompt } from "../../src/lib/native-whatsapp/prompt.ts";
import { parseProviderWhatsAppDraft } from "../../src/lib/native-whatsapp/provider-output.ts";
import { BudgetGuard, buildRunPlan, createBlindAliases, type BenchmarkCandidate, type BenchmarkFixture, type BenchmarkFixtureSet } from "./core.ts";
import type { ProviderTransportResult } from "./transports.ts";

export type CandidateCallInput = { fixture: BenchmarkFixture; candidate: "flash" | "pro"; modelId: string; runNumber: number; prompt: string };
export type JudgeCallInput = { fixture: BenchmarkFixture; prompt: string };
export type ExecutionDependencies = {
  fixtureSet: BenchmarkFixtureSet;
  now: Date;
  candidateCall: (input: CandidateCallInput) => Promise<ProviderTransportResult>;
  /** Null defers every judge step (e.g. no Anthropic key yet) without failing the run. */
  judgeCall: ((input: JudgeCallInput) => Promise<ProviderTransportResult>) | null;
};

export type ExecutionRecord = {
  fixtureId: string;
  task: BenchmarkFixture["task"];
  candidate: BenchmarkCandidate;
  runNumber: number;
  modelId: string;
  hardGatePassed: boolean;
  hardGateError: string | null;
  parsedArtifact: unknown;
  inputTokens: number;
  outputTokens: number;
  estimatedCostRm: number;
  requestId: string | null;
};

const USD_MYR = 4.5;
const PRICES = {
  flash: { input: 0.44, output: 1.32 },
  pro: { input: 1.32, output: 3.96 },
  judge: { input: 2, output: 10 },
} as const;

function estimateCostRm(candidate: "flash" | "pro" | "judge", inputTokens: number, outputTokens: number) {
  const price = PRICES[candidate];
  return ((inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output) * USD_MYR;
}

function projectedCallCostRm(candidate: "flash" | "pro" | "judge", prompt: string) {
  // Conservative preflight: roughly one token / four chars plus the configured
  // maximum output (DeepSeek 1400, judge 1200). Actual usage replaces it after.
  return estimateCostRm(candidate, Math.ceil(prompt.length / 4), candidate === "judge" ? 1200 : 1400);
}

function socialInputs(fixture: BenchmarkFixture) {
  const business = buildBusinessContextSnapshot(fixture.businessContext as NativeSocialPostBusinessProfile);
  const request = parseNativeSocialPostRequest(fixture.request);
  return { business, request };
}

function offerInputs(fixture: BenchmarkFixture) {
  const business = buildOfferBusinessContextSnapshot(fixture.businessContext as NativeOfferBusinessProfile);
  const request = parseNativeOfferRequest(fixture.request);
  const sourcePost = fixture.sourceArtifact as OfferSourcePostSnapshot | null;
  return { business, request, sourcePost };
}

function whatsappInputs(fixture: BenchmarkFixture) {
  const business = buildWhatsAppBusinessContextSnapshot(fixture.businessContext as NativeSocialPostBusinessProfile);
  const request = parseNativeWhatsAppRequest(fixture.request);
  const sourceOffer = fixture.sourceArtifact as WhatsAppSourceOfferSnapshot | null;
  return { business, request, sourceOffer };
}

function baselineFor(fixture: BenchmarkFixture, now: Date): SocialPostArtifact | OfferArtifact | WhatsAppDraftArtifact {
  if (fixture.task === "social_post") return buildDeterministicSocialPost({ ...socialInputs(fixture), now });
  if (fixture.task === "offer") return buildDeterministicOffer({ ...offerInputs(fixture), now });
  return buildDeterministicWhatsAppDraft({ ...whatsappInputs(fixture), now });
}

function promptFor(fixture: BenchmarkFixture) {
  if (fixture.task === "social_post") return buildNativeSocialPostPrompt(socialInputs(fixture));
  if (fixture.task === "offer") return buildNativeOfferPrompt(offerInputs(fixture));
  return buildNativeWhatsAppPrompt(whatsappInputs(fixture));
}

function parseCandidate(fixture: BenchmarkFixture, raw: string, now: Date): SocialPostArtifact | OfferArtifact | WhatsAppDraftArtifact {
  if (fixture.task === "social_post") return parseProviderSocialPostArtifact({ raw, ...socialInputs(fixture), now });
  if (fixture.task === "offer") return parseProviderOfferArtifact({ raw, ...offerInputs(fixture), now });
  return parseProviderWhatsAppDraft({ raw, ...whatsappInputs(fixture), now });
}

function protectedContractMatches(fixture: BenchmarkFixture, artifact: SocialPostArtifact | OfferArtifact | WhatsAppDraftArtifact) {
  const contextMatches = JSON.stringify(artifact.businessContext) === JSON.stringify(
    fixture.task === "social_post" ? socialInputs(fixture).business : fixture.task === "offer" ? offerInputs(fixture).business : whatsappInputs(fixture).business
  );
  if (!contextMatches || artifact.status !== "draft") return false;
  if (fixture.task === "social_post" && artifact.kind === "social_post") {
    const request = socialInputs(fixture).request;
    return artifact.platform === request.platform && artifact.objective === request.objective && artifact.angle === request.angle && artifact.topic === request.topic;
  }
  if (fixture.task === "offer" && artifact.kind === "offer") {
    const request = offerInputs(fixture).request;
    return artifact.entry === request.entry && artifact.sourcePostId === request.sourcePostId && artifact.offerType === request.offerType && artifact.product === request.product && artifact.goal === request.goal && artifact.audience === request.audience;
  }
  if (fixture.task === "whatsapp" && artifact.kind === "whatsapp_reply_draft") {
    const request = whatsappInputs(fixture).request;
    return artifact.entry === request.entry && artifact.sourceOfferId === request.sourceOfferId && artifact.replyIntent === request.replyIntent && artifact.customerName === request.customerName;
  }
  return false;
}

function judgePrompt(fixture: BenchmarkFixture, records: ExecutionRecord[]) {
  const candidates = ["baseline", "flash", ...(fixture.hardSubset ? ["pro"] : [])] as Array<"baseline" | "flash" | "pro">;
  const aliases = createBlindAliases(fixture.id, 1, candidates);
  const outputs = Object.fromEntries(candidates.map((candidate) => [aliases[candidate], records.filter((record) => record.candidate === candidate && record.hardGatePassed).map((record) => record.parsedArtifact)]));
  return `Anda ialah penilai Bahasa Melayu Malaysia yang buta kepada identiti model.\nFixture: ${fixture.id}\nFokus: ${JSON.stringify(fixture.judgeFocus)}\nRisiko: ${JSON.stringify(fixture.riskTags)}\nCalon anonim: ${JSON.stringify(outputs)}\nPulangkan JSON sahaja: {"fixtureId":"${fixture.id}","preferredCandidate":"A|B|C","scores":{"schemaContract":0,"claimSafety":0,"bmClarity":0,"usefulness":0,"voiceConsistency":0,"latencyCost":0},"safetyFlags":[],"rationale":"satu ayat"}`;
}

function parseJudge(raw: string, fixtureId: string) {
  let value: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not_object");
    value = parsed as Record<string, unknown>;
  } catch { throw new Error("judge_output_invalid"); }
  if (value.fixtureId !== fixtureId || !["A", "B", "C"].includes(String(value.preferredCandidate))) throw new Error("judge_output_invalid");
  if (!value.scores || typeof value.scores !== "object" || Array.isArray(value.scores) || !Array.isArray(value.safetyFlags) || typeof value.rationale !== "string") throw new Error("judge_output_invalid");
  return value;
}

/**
 * Fully orchestrates the benchmark using injected dependencies. This function
 * is explicitly for mocked E2E under the current zero-call authorization;
 * runner.ts does not import or invoke it yet.
 */
export async function executeBenchmarkWithMocks(input: ExecutionDependencies) {
  const guard = new BudgetGuard({ autoStopRm: input.fixtureSet.budget.autoStop, hardCapRm: input.fixtureSet.budget.hardCap });
  const records: ExecutionRecord[] = [];
  const plan = buildRunPlan(input.fixtureSet);
  for (const fixture of input.fixtureSet.fixtures) {
    const baseline = baselineFor(fixture, input.now);
    records.push({ fixtureId: fixture.id, task: fixture.task, candidate: "baseline", runNumber: 1, modelId: "deterministic-v1", hardGatePassed: protectedContractMatches(fixture, baseline), hardGateError: null, parsedArtifact: baseline, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0, requestId: null });
    const prompt = promptFor(fixture);
    const candidateSteps = plan.filter((step) => step.fixtureId === fixture.id && (step.candidate === "flash" || step.candidate === "pro"));
    for (const step of candidateSteps) {
      const candidate = step.candidate as "flash" | "pro";
      if (!guard.canReserve(projectedCallCostRm(candidate, prompt))) throw new Error("BUDGET_STOP");
      let response: ProviderTransportResult;
      try {
        response = await input.candidateCall({ fixture, candidate, modelId: step.modelId, runNumber: step.runNumber, prompt });
      } catch (error) {
        // A single transport failure (rate limit, timeout) must not abort the
        // whole paid run: record it as a failed step and continue.
        records.push({ fixtureId: fixture.id, task: fixture.task, candidate, runNumber: step.runNumber, modelId: step.modelId, hardGatePassed: false, hardGateError: `transport_${error instanceof Error ? error.message : "unknown"}`, parsedArtifact: null, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0, requestId: null });
        continue;
      }
      const cost = estimateCostRm(candidate, response.inputTokens, response.outputTokens);
      guard.commit(cost);
      try {
        const artifact = parseCandidate(fixture, response.raw, input.now);
        const passed = protectedContractMatches(fixture, artifact);
        records.push({ fixtureId: fixture.id, task: fixture.task, candidate, runNumber: step.runNumber, modelId: step.modelId, hardGatePassed: passed, hardGateError: passed ? null : "protected_contract_mismatch", parsedArtifact: artifact, inputTokens: response.inputTokens, outputTokens: response.outputTokens, estimatedCostRm: cost, requestId: response.requestId });
      } catch {
        records.push({ fixtureId: fixture.id, task: fixture.task, candidate, runNumber: step.runNumber, modelId: step.modelId, hardGatePassed: false, hardGateError: "provider_output_rejected", parsedArtifact: null, inputTokens: response.inputTokens, outputTokens: response.outputTokens, estimatedCostRm: cost, requestId: response.requestId });
      }
    }
    const blindPrompt = judgePrompt(fixture, records.filter((record) => record.fixtureId === fixture.id));
    if (!input.judgeCall) {
      // Judge deferred (e.g. no Anthropic key yet): mark as deferred, spend nothing.
      records.push({ fixtureId: fixture.id, task: fixture.task, candidate: "judge", runNumber: 1, modelId: "CLAUDE_SONNET_5_DEFERRED", hardGatePassed: false, hardGateError: "judge_deferred_no_anthropic_key", parsedArtifact: null, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0, requestId: null });
      continue;
    }
    if (!guard.canReserve(projectedCallCostRm("judge", blindPrompt))) throw new Error("BUDGET_STOP");
    const judged = await input.judgeCall({ fixture, prompt: blindPrompt });
    const judgeCost = estimateCostRm("judge", judged.inputTokens, judged.outputTokens);
    guard.commit(judgeCost);
    let judgeValue: unknown = null;
    let judgePassed = true;
    try { judgeValue = parseJudge(judged.raw, fixture.id); } catch { judgePassed = false; }
    records.push({ fixtureId: fixture.id, task: fixture.task, candidate: "judge", runNumber: 1, modelId: "CLAUDE_SONNET_5_MODEL_ID_REQUIRED_AT_EXECUTION", hardGatePassed: judgePassed, hardGateError: judgePassed ? null : "judge_output_rejected", parsedArtifact: judgeValue, inputTokens: judged.inputTokens, outputTokens: judged.outputTokens, estimatedCostRm: judgeCost, requestId: judged.requestId });
  }
  const count = (candidate: BenchmarkCandidate) => records.filter((record) => record.candidate === candidate).length;
  const deferred = records.filter((record) => record.hardGateError === "judge_deferred_no_anthropic_key").length;
  return {
    records,
    estimatedSpendRm: guard.spentRm,
    summary: { totalSteps: records.length, baseline: count("baseline"), flash: count("flash"), pro: count("pro"), judge: count("judge"), judgeDeferred: deferred, providerCallsMade: count("flash") + count("pro") + count("judge") - deferred, actualNetworkCalls: 0 },
  };
}
