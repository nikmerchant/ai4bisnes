import "server-only";

import { buildDeterministicAffiliatePromo, type AffiliatePromoArtifact, type AffiliatePromoRequest } from "./domain";
import type { GenerationTelemetry } from "../native-social-post/domain";

export type AffiliatePromoGenerationResult = { artifact: AffiliatePromoArtifact; telemetry: GenerationTelemetry; warning: string | null };

/** v1 provider boundary is intentionally dormant: deterministic local generation only. */
export async function generateAffiliatePromo(request: AffiliatePromoRequest): Promise<AffiliatePromoGenerationResult> {
  const startedAt = performance.now();
  const artifact = buildDeterministicAffiliatePromo({ request, now: new Date() });
  return {
    artifact,
    telemetry: {
      provider: "local",
      model: "affiliate-promo-deterministic-v1",
      mode: "deterministic_local",
      latencyMs: Math.max(0, performance.now() - startedAt),
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostRm: 0,
    },
    warning: null,
  };
}
