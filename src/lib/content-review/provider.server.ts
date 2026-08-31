import "server-only";
import { sanitizeGenerationTelemetry } from "../native-social-post/domain";
import {
  buildDeterministicContentReview,
  type BusinessContextSnapshot,
  type ContentReviewArtifactV1,
  type ContentReviewRequestV1,
  type GenerationTelemetry,
  type SourceSocialPostStatus,
} from "./domain";

export const CONTENT_REVIEW_PROVIDER_ENABLED = false as const;
export type ContentReviewGenerationResult = { artifact: ContentReviewArtifactV1; telemetry: GenerationTelemetry; warning: string };

export async function generateContentReview(input: { business: BusinessContextSnapshot; request: ContentReviewRequestV1; sourceSocialPostStatus: SourceSocialPostStatus; sourceTextHash: string }): Promise<ContentReviewGenerationResult> {
  const startedAt = performance.now();
  const artifact = buildDeterministicContentReview({ ...input, now: new Date() });
  return {
    artifact,
    telemetry: sanitizeGenerationTelemetry({ provider: "local", model: "content-review-deterministic-v1", mode: "deterministic_local", latencyMs: performance.now() - startedAt, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0 }),
    warning: "Review deterministic lokal digunakan. Provider AI kekal OFF dan tiada panggilan provider dibuat.",
  };
}
