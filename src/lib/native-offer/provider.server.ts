import "server-only";

import {
  buildDeterministicOffer,
  sanitizeGenerationTelemetry,
  type OfferBusinessContextSnapshot,
  type GenerationTelemetry,
  type NativeOfferRequest,
  type OfferArtifact,
  type OfferSourcePostSnapshot,
} from "./domain";
import { buildNativeOfferPrompt } from "./prompt";
import { parseProviderOfferArtifact } from "./provider-output";
import { readBoundedJsonRequest } from "../native-social-post/http";

export type NativeOfferGenerationResult = {
  artifact: OfferArtifact;
  telemetry: GenerationTelemetry;
  warning: string | null;
};

type CompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function deterministicResult(input: {
  business: OfferBusinessContextSnapshot;
  request: NativeOfferRequest;
  sourcePost?: OfferSourcePostSnapshot | null;
  startedAt: number;
  mode: "deterministic_local" | "deterministic_fallback";
  warning: string | null;
}): NativeOfferGenerationResult {
  const artifact = buildDeterministicOffer({
    business: input.business,
    request: input.request,
    sourcePost: input.sourcePost,
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

function providerConfig() {
  const baseUrl = process.env.DEEPSEEK_API_BASE_URL?.trim();
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const model = process.env.DEEPSEEK_MODEL_ID?.trim();
  if (!baseUrl || !apiKey || !model) return null;

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return null;
  }
  const allowedHosts = new Set(
    String(process.env.AI4B_NATIVE_PROVIDER_ALLOWED_HOSTS || "api.deepseek.com")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase())) return null;
  return { baseUrl: url.toString().replace(/\/$/, ""), apiKey, model };
}

function estimateCostRm(inputTokens: number, outputTokens: number) {
  const inputRate = Number(process.env.DEEPSEEK_INPUT_USD_PER_MTOK);
  const outputRate = Number(process.env.DEEPSEEK_OUTPUT_USD_PER_MTOK);
  const usdMyr = Number(process.env.AI4B_USD_MYR || 4.5);
  if (![inputRate, outputRate, usdMyr].every((value) => Number.isFinite(value) && value >= 0)) return null;
  return ((inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate) * usdMyr;
}

export async function generateNativeOffer(input: {
  business: OfferBusinessContextSnapshot;
  request: NativeOfferRequest;
  sourcePost?: OfferSourcePostSnapshot | null;
}): Promise<NativeOfferGenerationResult> {
  const startedAt = performance.now();
  const selectedProvider = process.env.AI4B_NATIVE_OFFER_PROVIDER?.trim().toLowerCase();
  if (selectedProvider !== "deepseek") {
    return deterministicResult({
      ...input,
      startedAt,
      mode: "deterministic_local",
      warning: "Local preview menggunakan generator deterministic; provider AI belum diaktifkan.",
    });
  }

  const config = providerConfig();
  if (!config) {
    return deterministicResult({
      ...input,
      startedAt,
      mode: "deterministic_fallback",
      warning: "Konfigurasi provider tidak lengkap atau tidak dibenarkan; fallback selamat digunakan.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        max_tokens: 1600,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: buildNativeOfferPrompt(input) }],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`provider_${response.status}`);
    const payload = (await readBoundedJsonRequest(response, 32_768)) as CompletionResponse;
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw || raw.length > 20_000) throw new Error("provider_output_invalid");
    const inputTokens = Math.max(0, Number(payload.usage?.prompt_tokens || 0));
    const outputTokens = Math.max(0, Number(payload.usage?.completion_tokens || 0));
    return {
      artifact: parseProviderOfferArtifact({
        raw,
        business: input.business,
        request: input.request,
        sourcePost: input.sourcePost,
        now: new Date(),
      }),
      telemetry: sanitizeGenerationTelemetry({
        provider: "deepseek",
        model: config.model,
        mode: "provider",
        latencyMs: performance.now() - startedAt,
        inputTokens,
        outputTokens,
        estimatedCostRm: estimateCostRm(inputTokens, outputTokens),
      }),
      warning: null,
    };
  } catch (error) {
    console.warn("native_offer_provider_fallback", error instanceof Error ? error.message : "unknown");
    return deterministicResult({
      ...input,
      startedAt,
      mode: "deterministic_fallback",
      warning: "Provider AI gagal menyiapkan hasil; fallback deterministic digunakan tanpa caj AI.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
