import "server-only";
import { sanitizeGenerationTelemetry } from "../native-social-post/domain";
import { buildDeterministicPerformanceLearning, type ApprovedPerformanceSourceSnapshotV1, type GenerationTelemetry, type PerformanceLearningArtifactV1, type PerformanceLearningRequestV1 } from "./domain";

export const PERFORMANCE_LEARNING_PROVIDER_ENABLED = false as const;
export type PerformanceLearningGenerationResult = { artifact: PerformanceLearningArtifactV1; telemetry: GenerationTelemetry; warning: string };

export async function generatePerformanceLearning(input: { request: PerformanceLearningRequestV1; sourceSnapshot: ApprovedPerformanceSourceSnapshotV1 }): Promise<PerformanceLearningGenerationResult> {
  const startedAt = performance.now();
  const artifact = buildDeterministicPerformanceLearning({ ...input, now: new Date() });
  return {
    artifact,
    telemetry: sanitizeGenerationTelemetry({ provider: "local", model: "performance-learning-deterministic-v1", mode: "deterministic_local", latencyMs: performance.now() - startedAt, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0 }),
    warning: "Diagnosis deterministic lokal digunakan. Provider luar kekal OFF; tiada panggilan luar dibuat.",
  };
}
