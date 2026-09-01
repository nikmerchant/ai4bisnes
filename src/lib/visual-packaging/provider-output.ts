import { buildDeterministicVisualPackaging, type ApprovedContentCreateSnapshotV1, type VisualPackagingArtifactV1, type VisualPackagingRequestV1 } from "./domain";

type JsonRecord = Record<string, unknown>;

export function parseProviderVisualPackagingCandidate(input: { candidate: unknown; request: VisualPackagingRequestV1; sourceSnapshot: ApprovedContentCreateSnapshotV1; now: Date }): VisualPackagingArtifactV1 {
  if (!input.candidate || typeof input.candidate !== "object" || Array.isArray(input.candidate)) throw new Error("Candidate provider tidak sah.");
  const candidate = input.candidate as JsonRecord;
  const base = buildDeterministicVisualPackaging(input);
  const candidateText = JSON.stringify(candidate);
  const unsafe = /jamin|guarantee|\d+\s*%|jualan\s+(?:naik|meningkat|meletup)|tinggal|slot|testimonial|testimoni|dashboard|before.?after|transformasi/i.test(candidateText);
  if (!unsafe) return base;
  // Protected source/status/format/revision/approval/promise fields are never
  // copied. Unsupported candidate claims are revalidated and removed.
  return {
    ...base,
    safety: {
      ...base.safety,
      unsupportedVisualClaims: [...base.safety.unsupportedVisualClaims, { claim: "Claim atau visual provider di luar Approved Content", reason: "Candidate dibuang semasa protected reconstruction; proof tidak disokong.", action: "REMOVE" }],
    },
  };
}
