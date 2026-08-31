import {
  buildDeterministicContentCreate,
  revalidateCandidateDraftClaims,
  sanitizeUnsafeCandidateProse,
  validateContentCreateArtifact,
  type ApprovedOfferSnapshotV1,
  type BusinessContextSnapshot,
  type ContentCreateArtifactV1,
  type ContentCreateRequestV1,
} from "./domain";

type JsonRecord = Record<string, unknown>;

function candidateText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : "";
}

export function parseProviderContentCreateCandidate(input: {
  candidate: unknown;
  business: BusinessContextSnapshot;
  request: ContentCreateRequestV1;
  sourceOfferSnapshot: ApprovedOfferSnapshotV1;
  now: Date;
}): ContentCreateArtifactV1 {
  if (!input.candidate || typeof input.candidate !== "object" || Array.isArray(input.candidate)) throw new Error("Candidate provider tidak sah.");
  const candidate = input.candidate as JsonRecord;
  const base = buildDeterministicContentCreate(input);
  const rawDraft = candidate.draft && typeof candidate.draft === "object" && !Array.isArray(candidate.draft) ? candidate.draft as JsonRecord : null;
  if (!rawDraft) return base;

  const rawHook = candidateText(rawDraft.hook, 500);
  const rawBody = candidateText(rawDraft.body, 5000);
  const rawCta = candidateText(rawDraft.callToAction, 500);
  const candidateClaims = revalidateCandidateDraftClaims({
    texts: [rawHook, rawBody, rawCta],
    sourceOfferSnapshot: input.sourceOfferSnapshot,
    startIndex: base.claimLedger.length + 1,
  });
  const safeHook = sanitizeUnsafeCandidateProse(rawHook, input.sourceOfferSnapshot);
  const safeBody = sanitizeUnsafeCandidateProse(rawBody, input.sourceOfferSnapshot);
  const safeCta = sanitizeUnsafeCandidateProse(rawCta, input.sourceOfferSnapshot);
  const safeBodyBudget = Math.max(0, 5000 - base.draft.body.length - 2);
  const boundedSafeBody = safeBody.slice(0, safeBodyBudget).trim();
  const candidateHashtags = Array.isArray(rawDraft.hashtags)
    ? rawDraft.hashtags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0 && tag.length <= 50).slice(0, 10)
    : [];

  // Candidate prose is revalidated before crossing this boundary. Unsupported
  // prose becomes GENERATED_CANDIDATE claim evidence and is removed. Protected
  // source/context/status/recipe/approval are always reconstructed server-side.
  const artifact: ContentCreateArtifactV1 = {
    ...base,
    draft: {
      ...base.draft,
      hook: safeHook || base.draft.hook,
      body: boundedSafeBody ? `${boundedSafeBody}\n\n${base.draft.body}` : base.draft.body,
      callToAction: safeCta || base.draft.callToAction,
      hashtags: candidateHashtags,
    },
    claimLedger: [...base.claimLedger, ...candidateClaims].slice(0, 30),
  };
  const validation = validateContentCreateArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}
