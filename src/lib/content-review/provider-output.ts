import {
  CONTENT_REVIEW_BOTTLENECKS,
  buildDeterministicContentReview,
  validateContentReviewArtifact,
  type BusinessContextSnapshot,
  type ContentReviewArtifactV1,
  type ContentReviewBottleneck,
  type ContentReviewRequestV1,
  type SourceSocialPostStatus,
} from "./domain";

type JsonRecord = Record<string, unknown>;
function strings(value: unknown, maxItems: number, maxLength = 500) {
  if (!Array.isArray(value)) return null;
  const output = value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, maxItems);
  if (!output.length || output.some((item) => item.length > maxLength)) return null;
  return output;
}

export function parseProviderContentReviewCandidate(input: {
  candidate: unknown;
  business: BusinessContextSnapshot;
  request: ContentReviewRequestV1;
  sourceSocialPostStatus: SourceSocialPostStatus;
  sourceTextHash: string;
  now: Date;
}): ContentReviewArtifactV1 {
  if (!input.candidate || typeof input.candidate !== "object" || Array.isArray(input.candidate)) throw new Error("Candidate provider tidak sah.");
  const candidate = input.candidate as JsonRecord;
  const base = buildDeterministicContentReview(input);
  const bottleneck = CONTENT_REVIEW_BOTTLENECKS.includes(candidate.primaryCreativeBottleneck as ContentReviewBottleneck)
    ? candidate.primaryCreativeBottleneck as ContentReviewBottleneck
    : base.primaryCreativeBottleneck;
  const improved = candidate.improvedDraft && typeof candidate.improvedDraft === "object" && !Array.isArray(candidate.improvedDraft)
    ? candidate.improvedDraft as JsonRecord : null;
  const artifact: ContentReviewArtifactV1 = {
    ...base,
    // Only bounded candidate review prose may cross this boundary. Protected
    // source, status, hashes, context, recipe, timestamps and claims remain server-owned.
    strengths: strings(candidate.strengths, 5) ?? base.strengths,
    weaknesses: strings(candidate.weaknesses, 5) ?? base.weaknesses,
    fixes: strings(candidate.fixes, 5) ?? base.fixes,
    primaryCreativeBottleneck: bottleneck,
    improvedDraft: improved ? {
      ...base.improvedDraft,
      hook: typeof improved.hook === "string" && improved.hook.trim() && improved.hook.length <= 500 ? improved.hook.trim() : base.improvedDraft.hook,
      body: typeof improved.body === "string" && improved.body.trim() && improved.body.length <= 5000 ? improved.body.trim() : base.improvedDraft.body,
      callToAction: typeof improved.callToAction === "string" && improved.callToAction.trim() && improved.callToAction.length <= 500 ? improved.callToAction.trim() : base.improvedDraft.callToAction,
      hashtags: Array.isArray(improved.hashtags) ? improved.hashtags.filter((tag): tag is string => typeof tag === "string" && tag.length <= 50).slice(0, 10) : base.improvedDraft.hashtags,
    } : base.improvedDraft,
  };
  const validation = validateContentReviewArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}
