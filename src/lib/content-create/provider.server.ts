import "server-only";
import { sanitizeGenerationTelemetry } from "../native-social-post/domain";
import {
  buildDeterministicContentCreate,
  type ApprovedOfferSnapshotV1,
  type BusinessContextSnapshot,
  type ContentCreateArtifactV1,
  type ContentCreateRequestV1,
  type GenerationTelemetry,
} from "./domain";

export const CONTENT_CREATE_PROVIDER_ENABLED = false as const;
export type ContentCreateGenerationResult = { artifact: ContentCreateArtifactV1; telemetry: GenerationTelemetry; warning: string };

export async function generateContentCreate(input: { business: BusinessContextSnapshot; request: ContentCreateRequestV1; sourceOfferSnapshot: ApprovedOfferSnapshotV1 }): Promise<ContentCreateGenerationResult> {
  const startedAt = performance.now();
  const artifact = buildDeterministicContentCreate({ ...input, now: new Date() });
  return {
    artifact,
    telemetry: sanitizeGenerationTelemetry({ provider: "local", model: "content-create-deterministic-v1", mode: "deterministic_local", latencyMs: performance.now() - startedAt, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0 }),
    warning: "Draf deterministic lokal digunakan. Provider AI kekal OFF dan tiada panggilan provider dibuat.",
  };
}
