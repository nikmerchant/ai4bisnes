import "server-only";
import { sanitizeGenerationTelemetry } from "../native-social-post/domain";
import { buildDeterministicVisualPackaging, type ApprovedContentCreateSnapshotV1, type GenerationTelemetry, type VisualPackagingArtifactV1, type VisualPackagingRequestV1 } from "./domain";

export const VISUAL_PACKAGING_PROVIDER_ENABLED = false as const;
export type VisualPackagingGenerationResult = { artifact: VisualPackagingArtifactV1; telemetry: GenerationTelemetry; warning: string };

export async function generateVisualPackaging(input: { request: VisualPackagingRequestV1; sourceSnapshot: ApprovedContentCreateSnapshotV1 }): Promise<VisualPackagingGenerationResult> {
  const startedAt = performance.now();
  const artifact = buildDeterministicVisualPackaging({ ...input, now: new Date() });
  return {
    artifact,
    telemetry: sanitizeGenerationTelemetry({ provider: "local", model: "visual-packaging-deterministic-v1", mode: "deterministic_local", latencyMs: performance.now() - startedAt, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0 }),
    warning: "Pelan deterministic lokal digunakan. Provider dan media kekal OFF; tiada panggilan luar dibuat.",
  };
}
