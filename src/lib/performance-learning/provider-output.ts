import { buildDeterministicPerformanceLearning, type ApprovedPerformanceSourceSnapshotV1, type PerformanceLearningArtifactV1, type PerformanceLearningRequestV1 } from "./domain";

type JsonRecord = Record<string, unknown>;

/**
 * Provider candidate parser — permanently unused while the provider is OFF,
 * but kept bounded and defensive for the day a provider is authorized.
 *
 * Protected fields (source, metrics, status, revision, approval,
 * promiseCeiling, snapshot fencing) are ALWAYS reconstructed server-side by
 * re-running the deterministic rubric; nothing from the candidate is trusted
 * for those fields. A candidate that merely restates the deterministic output
 * reconstructs to exactly that output; anything else diverges or is dropped.
 */
export function parseProviderPerformanceLearningCandidate(input: { candidate: unknown; request: PerformanceLearningRequestV1; sourceSnapshot: ApprovedPerformanceSourceSnapshotV1; now: Date }): PerformanceLearningArtifactV1 {
  if (!input.candidate || typeof input.candidate !== "object" || Array.isArray(input.candidate)) throw new Error("Candidate provider tidak sah.");
  const candidate = input.candidate as JsonRecord;
  // Base is the deterministic rebuild from frozen server inputs only.
  const base = buildDeterministicPerformanceLearning(input);
  // A candidate may only be advisory text. Any attempt to override protected
  // fields is ignored (never copied) — reconstruction is unconditional.
  const advisoryKeys = ["bottleneck", "confidence", "patternObserved", "hypothesisNext", "metrics", "sourceSnapshot", "status", "revision", "approval", "promiseCeiling", "snapshotFencing", "nextBestContent", "diagnosis", "learning"];
  const attemptedOverride = advisoryKeys.some((key) => key in candidate);
  if (!attemptedOverride) return base;
  // Overrides never win: the deterministic artifact stands. The candidate
  // divergence is surfaced through the snapshotFencing-safe warning channel
  // (telemetry warning in provider.server), not by mutating protected fields.
  return base;
}
