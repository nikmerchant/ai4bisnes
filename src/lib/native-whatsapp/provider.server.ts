import "server-only";

import {
  buildDeterministicWhatsAppDraft,
  sanitizeGenerationTelemetry,
  type WhatsAppBusinessContextSnapshot,
  type GenerationTelemetry,
  type NativeWhatsAppRequest,
  type WhatsAppDraftArtifact,
  type WhatsAppSourceOfferSnapshot,
} from "./domain";

export type NativeWhatsAppGenerationResult = {
  artifact: WhatsAppDraftArtifact;
  telemetry: GenerationTelemetry;
  warning: string | null;
};

function deterministicResult(input: {
  business: WhatsAppBusinessContextSnapshot;
  request: NativeWhatsAppRequest;
  sourceOffer?: WhatsAppSourceOfferSnapshot | null;
  startedAt: number;
  mode: "deterministic_local" | "deterministic_fallback";
  warning: string | null;
}): NativeWhatsAppGenerationResult {
  const artifact = buildDeterministicWhatsAppDraft({
    business: input.business,
    request: input.request,
    sourceOffer: input.sourceOffer,
    now: new Date(),
  });
  return {
    artifact,
    telemetry: sanitizeGenerationTelemetry({
      provider: "local",
      model: "deterministic-v1",
      mode: input.mode,
      latencyMs: performance.now() - input.startedAt,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostRm: 0,
    }),
    warning: input.warning,
  };
}

function estimateCostRm(inputTokens: number, outputTokens: number) {
  const inputRate = Number(process.env.DEEPSEEK_INPUT_USD_PER_MTOK);
  const outputRate = Number(process.env.DEEPSEEK_OUTPUT_USD_PER_MTOK);
  const usdMyr = Number(process.env.AI4B_USD_MYR || 4.5);
  if (![inputRate, outputRate, usdMyr].every((value) => Number.isFinite(value) && value >= 0)) return null;
  return ((inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate) * usdMyr;
}

export async function generateNativeWhatsAppDraft(input: {
  business: WhatsAppBusinessContextSnapshot;
  request: NativeWhatsAppRequest;
  sourceOffer?: WhatsAppSourceOfferSnapshot | null;
}): Promise<NativeWhatsAppGenerationResult> {
  const startedAt = performance.now();
  return deterministicResult({
    ...input,
    startedAt,
    mode: "deterministic_local",
    warning: "Pratonton lokal menggunakan generator deterministic; provider AI belum diaktifkan.",
  });
}
