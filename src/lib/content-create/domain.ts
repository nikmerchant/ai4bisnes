import {
  SOCIAL_POST_OBJECTIVES,
  SOCIAL_POST_PLATFORMS,
  buildBusinessContextSnapshot,
  type BusinessContextSnapshot,
  type GenerationTelemetry,
  type NativeSocialPostBusinessProfile,
  type SocialPostObjective,
  type SocialPostPlatform,
} from "../native-social-post/domain";
import { renderOfferText, type OfferArtifact } from "../native-offer/domain";
import { sha256Hex } from "../content-review/hash";

export type { BusinessContextSnapshot, GenerationTelemetry, SocialPostObjective, SocialPostPlatform };

export const CONTENT_CREATE_SCHEMA_VERSION = 1 as const;
export const CONTENT_CREATE_RECIPE_VERSION = "content-create-offer-v1.0.0" as const;
export const CONTENT_CREATE_CONTENT_ROLES = ["attract", "educate", "trust", "convert"] as const;
export const CONTENT_CREATE_PROOF_STATES = ["SUPPORTED_BY_OFFER", "OWNER_ASSERTED", "UNKNOWN", "NONE"] as const;
export const CONTENT_CREATE_CLAIM_ORIGINS = ["APPROVED_OFFER", "OWNER_PROOF_NOTE", "GENERATED_CANDIDATE"] as const;
export const CONTENT_CREATE_CLAIM_CLASSES = ["FACT", "OBSERVATION", "INFERENCE", "OPINION", "PROMISE", "UNKNOWN"] as const;
export const CONTENT_CREATE_EVIDENCE_STATES = ["SUPPORTED_BY_OFFER", "OWNER_ASSERTED", "UNKNOWN", "NOT_REQUIRED"] as const;
export const CONTENT_CREATE_CLAIM_ACTIONS = ["KEEP", "SOFTEN", "REMOVE", "OWNER_VERIFY"] as const;

export type ContentCreateContentRole = (typeof CONTENT_CREATE_CONTENT_ROLES)[number];
export type ContentCreateProofState = (typeof CONTENT_CREATE_PROOF_STATES)[number];
export type ContentCreateClaimOrigin = (typeof CONTENT_CREATE_CLAIM_ORIGINS)[number];
export type ContentCreateClaimClass = (typeof CONTENT_CREATE_CLAIM_CLASSES)[number];
export type ContentCreateEvidenceState = (typeof CONTENT_CREATE_EVIDENCE_STATES)[number];
export type ContentCreateClaimAction = (typeof CONTENT_CREATE_CLAIM_ACTIONS)[number];
export type ContentCreateStatus = "draft" | "approved";

export type ContentCreateRequestV1 = {
  entry: "from_offer";
  sourceOfferId: number;
  platform: SocialPostPlatform;
  objective: SocialPostObjective;
  contentRole: ContentCreateContentRole;
  proofNote: string;
  extraContext: string;
};

export type ApprovedOfferSnapshotV1 = Readonly<{
  id: number;
  offerType: OfferArtifact["offerType"];
  product: string;
  goal: OfferArtifact["goal"];
  audience: string;
  headline: string;
  valueStack: string[];
  priceNote: string;
  terms: string;
  riskReversal: string;
  urgencyNote: string;
  validUntil: string;
  sourcePostId: number | null;
  sourceContentHash: string;
}>;

export type ContentStrategyV1 = {
  audience: string;
  audienceStage: "unaware" | "problem_aware" | "solution_aware" | "offer_aware";
  contentRole: ContentCreateContentRole;
  coreThesis: string;
  coreMessage: string;
  desiredBeliefShift: { before: string; after: string };
  angle: string;
  primaryEmotion: string;
  proofStrategy: { state: ContentCreateProofState; note: string };
  offerBridge: string;
  callToAction: string;
  successMetric: string;
};

export type ContentCreateDraftV1 = {
  hook: string;
  body: string;
  callToAction: string;
  hashtags: string[];
  revision: number;
  parentContentHash: string | null;
};

export type ContentCreateClaimV1 = {
  claimId: string;
  exactClaimText: string;
  origin: ContentCreateClaimOrigin;
  class: ContentCreateClaimClass;
  evidenceState: ContentCreateEvidenceState;
  action: ContentCreateClaimAction;
  allowedWordingCeiling: string;
};

export type ContentCreateApprovalV1 = {
  actorId: string;
  approvedAt: string;
  contentHash: string;
  approvalScope: "content_create_draft";
};

export type ContentCreateArtifactV1 = {
  schemaVersion: typeof CONTENT_CREATE_SCHEMA_VERSION;
  kind: "content_create";
  status: ContentCreateStatus;
  entry: "from_offer";
  sourceOfferId: number;
  sourceOfferSnapshot: ApprovedOfferSnapshotV1;
  businessContextSnapshot: BusinessContextSnapshot;
  platform: SocialPostPlatform;
  objective: SocialPostObjective;
  strategy: ContentStrategyV1;
  draft: ContentCreateDraftV1;
  claimLedger: ContentCreateClaimV1[];
  assumptions: string[];
  recipeVersion: typeof CONTENT_CREATE_RECIPE_VERSION;
  approval: ContentCreateApprovalV1 | null;
  createdAt: string;
  updatedAt: string;
};

type JsonRecord = Record<string, unknown>;
const LIMITS = {
  proofNote: 500,
  extraContext: 500,
  hook: 500,
  body: 5000,
  cta: 500,
  hashtagCount: 10,
  hashtag: 50,
  claims: 30,
  assumptions: 8,
  strategy: 500,
} as const;

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function clip(value: string, max: number) {
  const normalized = compact(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== "string") throw new Error(`${label} diperlukan.`);
  const output = value.trim();
  if (!output) throw new Error(`${label} diperlukan.`);
  if (output.length > max) throw new Error(`${label} terlalu panjang.`);
  return output;
}

function optionalText(value: unknown, label: string, max: number) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${label} tidak sah.`);
  const output = value.trim();
  if (output.length > max) throw new Error(`${label} terlalu panjang.`);
  return output;
}

function enumValue<const T extends readonly string[]>(value: unknown, allowed: T, message: string): T[number] {
  if (typeof value !== "string" || !allowed.includes(value as T[number])) throw new Error(message);
  return value as T[number];
}

export function parseContentCreateRequest(value: unknown): ContentCreateRequestV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Data permintaan tidak sah.");
  const input = value as JsonRecord;
  if (input.entry !== "from_offer") throw new Error("Jenis entri tidak disokong.");
  const sourceOfferId = Number(input.sourceOfferId ?? input.source_offer_id);
  if (!Number.isSafeInteger(sourceOfferId) || sourceOfferId < 1) throw new Error("Tawaran sumber tidak sah.");
  return {
    entry: "from_offer",
    sourceOfferId,
    platform: enumValue(input.platform, SOCIAL_POST_PLATFORMS, "Platform tidak disokong."),
    objective: enumValue(input.objective, SOCIAL_POST_OBJECTIVES, "Objektif tidak disokong."),
    contentRole: enumValue(input.contentRole ?? input.content_role, CONTENT_CREATE_CONTENT_ROLES, "Content role tidak disokong."),
    proofNote: optionalText(input.proofNote ?? input.proof_note, "Nota bukti", LIMITS.proofNote),
    extraContext: optionalText(input.extraContext ?? input.extra_context, "Konteks tambahan", LIMITS.extraContext),
  };
}

export function buildContentCreateBusinessContextSnapshot(profile: NativeSocialPostBusinessProfile) {
  return buildBusinessContextSnapshot(profile);
}

export function buildApprovedOfferSnapshot(input: { id: number; artifact: OfferArtifact; validUntil: string }): ApprovedOfferSnapshotV1 {
  if (!Number.isSafeInteger(input.id) || input.id < 1) throw new Error("Approved Offer id tidak sah.");
  if (input.artifact.kind !== "offer" || input.artifact.status !== "approved") throw new Error("Approved Offer diperlukan.");
  const validUntil = optionalText(input.validUntil, "Tarikh sah", 10);
  if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) throw new Error("Tarikh sah tidak sah.");
  const rendered = renderOfferText(input.artifact);
  return Object.freeze({
    id: input.id,
    offerType: input.artifact.offerType,
    product: clip(input.artifact.product, 200),
    goal: input.artifact.goal,
    audience: clip(input.artifact.audience, 300),
    headline: clip(input.artifact.headline, 300),
    valueStack: Object.freeze(input.artifact.valueStack.map((item) => clip(item, 300)).filter(Boolean).slice(0, 5)) as unknown as string[],
    priceNote: input.artifact.priceNote.trim(),
    terms: input.artifact.terms.map((item) => item.trim()).filter(Boolean).join("\n"),
    riskReversal: input.artifact.riskReversal.trim(),
    urgencyNote: input.artifact.urgencyNote.trim(),
    validUntil,
    sourcePostId: input.artifact.sourcePostId,
    sourceContentHash: sha256Hex(rendered),
  });
}

export function renderApprovedOfferSource(snapshot: ApprovedOfferSnapshotV1) {
  const sections = [
    snapshot.headline,
    snapshot.product,
    snapshot.valueStack.length ? `Apa yang anda dapat:\n${snapshot.valueStack.map((item) => `• ${item}`).join("\n")}` : "",
    snapshot.priceNote ? `Harga: ${snapshot.priceNote}` : "",
    snapshot.terms ? `Syarat:\n${snapshot.terms}` : "",
    snapshot.riskReversal,
    snapshot.urgencyNote,
    snapshot.validUntil && !`${snapshot.terms}\n${snapshot.urgencyNote}`.includes(snapshot.validUntil) ? `Tarikh sah: ${snapshot.validUntil}` : "",
  ];
  return sections.filter(Boolean).join("\n\n");
}

function unsafeAssertion(value: string) {
  return /abaikan|ignore (?:all|previous)|service\s*role|api[_ -]?key|status\s+approved|publish|schedule|send|tinggal\s+\w+\s+slot|slot\s+(?:sahaja|tinggal)|tamat\s+malam|stok\s+terhad|scarcity|testimoni|testimonial|puan\s+[a-z]+|jamin|dijamin|guarantee|jualan\s+(?:naik|meningkat)|RM\s*\d|\d+\s*%|kali\s+ganda|pasti\s+berhasil/i.test(value);
}

function offerProofAvailable(snapshot: ApprovedOfferSnapshotV1) {
  return Boolean(snapshot.priceNote || snapshot.terms || snapshot.riskReversal || snapshot.urgencyNote || snapshot.validUntil);
}

function proofStrategy(request: ContentCreateRequestV1, snapshot: ApprovedOfferSnapshotV1): ContentStrategyV1["proofStrategy"] {
  if (request.proofNote) {
    if (unsafeAssertion(request.proofNote)) return { state: "UNKNOWN", note: "Nota pemilik mengandungi dakwaan/arahan yang tidak boleh disahkan dan tidak digunakan dalam draf." };
    return { state: "OWNER_ASSERTED", note: "Nota pemilik kekal owner-asserted dan perlu disahkan sebelum digunakan sebagai bukti." };
  }
  if (offerProofAvailable(snapshot) || request.contentRole === "trust") return { state: "SUPPORTED_BY_OFFER", note: "Hanya fakta tepat daripada Approved Offer digunakan." };
  return { state: "NONE", note: "Tiada bukti tambahan digunakan atau direka." };
}

function claim(input: Omit<ContentCreateClaimV1, "claimId">, index: number): ContentCreateClaimV1 {
  return { claimId: `claim-${index}`, ...input };
}

function approvedOfferClaims(snapshot: ApprovedOfferSnapshotV1) {
  const facts: Array<[string, string]> = [
    [snapshot.priceNote, "Kekalkan harga tepat daripada Approved Offer."],
    [snapshot.terms, "Kekalkan terma tepat daripada Approved Offer."],
    [snapshot.riskReversal, "Kekalkan wording risk reversal tepat daripada Approved Offer."],
    [snapshot.urgencyNote, "Kekalkan urgency tepat daripada Approved Offer tanpa menambah scarcity."],
    [snapshot.validUntil, "Kekalkan tarikh sah tepat daripada Approved Offer."],
  ];
  return facts.filter(([text]) => Boolean(text)).map(([exactClaimText, allowedWordingCeiling], index) => claim({
    exactClaimText,
    origin: "APPROVED_OFFER",
    class: "FACT",
    evidenceState: "SUPPORTED_BY_OFFER",
    action: "KEEP",
    allowedWordingCeiling,
  }, index + 1));
}

function ownerProofClaims(note: string, start: number) {
  if (!note) return [];
  if (!unsafeAssertion(note)) return [claim({ exactClaimText: note, origin: "OWNER_PROOF_NOTE", class: "OBSERVATION", evidenceState: "OWNER_ASSERTED", action: "OWNER_VERIFY", allowedWordingCeiling: "Gunakan hanya selepas pemilik mengesahkan rekod atau bukti sebenar." }, start)];
  const claims = [claim({ exactClaimText: note, origin: "OWNER_PROOF_NOTE", class: /jamin|dijamin|jualan|\d+\s*%|kali\s+ganda/i.test(note) ? "PROMISE" : "UNKNOWN", evidenceState: "UNKNOWN", action: "REMOVE", allowedWordingCeiling: "Buang arahan, urgency, scarcity, testimonial, hasil atau jaminan yang tidak wujud dalam Approved Offer." }, start)];
  if (/jamin|dijamin|jualan|\d+\s*%|kali\s+ganda/i.test(note)) claims.push(claim({ exactClaimText: note, origin: "OWNER_PROOF_NOTE", class: "PROMISE", evidenceState: "UNKNOWN", action: "OWNER_VERIFY", allowedWordingCeiling: "Pemilik mesti mengesahkan bukti dan wording; jangan gunakan sebagai kepastian." }, start + 1));
  return claims;
}

export function revalidateCandidateDraftClaims(input: { texts: string[]; sourceOfferSnapshot: ApprovedOfferSnapshotV1; startIndex?: number }) {
  const approved = renderApprovedOfferSource(input.sourceOfferSnapshot).toLowerCase();
  const output: ContentCreateClaimV1[] = [];
  for (const text of input.texts.map((item) => item.trim()).filter(Boolean)) {
    if (!unsafeAssertion(text)) continue;
    const exactClaims = text.split(/(?<=[.!?])\s+|\n+/).map((item) => item.trim()).filter((item) => unsafeAssertion(item));
    for (const exactClaimText of exactClaims) {
      if (approved.includes(exactClaimText.toLowerCase())) continue;
      output.push(claim({ exactClaimText, origin: "GENERATED_CANDIDATE", class: /jamin|dijamin|jualan|\d+\s*%|kali\s+ganda/i.test(exactClaimText) ? "PROMISE" : "UNKNOWN", evidenceState: "UNKNOWN", action: "REMOVE", allowedWordingCeiling: "Buang claim calon yang tidak disokong; gunakan fakta Approved Offer sahaja." }, (input.startIndex ?? 1) + output.length));
    }
  }
  return output;
}

export function sanitizeUnsafeCandidateProse(value: string, snapshot: ApprovedOfferSnapshotV1) {
  const approved = renderApprovedOfferSource(snapshot).toLowerCase();
  return value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !unsafeAssertion(part) || approved.includes(part.toLowerCase()))
    .join(" ")
    .trim();
}

function audienceStage(role: ContentCreateContentRole): ContentStrategyV1["audienceStage"] {
  return role === "attract" ? "problem_aware" : role === "educate" ? "solution_aware" : "offer_aware";
}

function ctaFor(objective: SocialPostObjective) {
  const values: Record<SocialPostObjective, string> = {
    awareness: "Ikuti kami untuk panduan praktikal seterusnya.",
    engagement: "Kongsi cabaran anda di ruangan komen.",
    leads: "Hubungi kami untuk semak sama ada tawaran ini sesuai dengan keperluan anda.",
    sales: "Hubungi kami untuk semak butiran dan membuat tempahan jika sesuai.",
    education: "Simpan panduan ini, kemudian semak tawaran jika anda perlukan bantuan seterusnya.",
  };
  return values[objective];
}

function roleMessage(role: ContentCreateContentRole, snapshot: ApprovedOfferSnapshotV1) {
  const values: Record<ContentCreateContentRole, string> = {
    attract: `Mulakan dengan masalah yang relevan kepada ${snapshot.audience}, kemudian perkenalkan ${snapshot.product} sebagai langkah seterusnya.`,
    educate: `Terangkan satu pertimbangan praktikal sebelum memperkenalkan ${snapshot.product} sebagai langkah seterusnya.`,
    trust: `Terangkan skop ${snapshot.product} dengan fakta Approved Offer dan had bukti yang jelas.`,
    convert: `Hubungkan keperluan ${snapshot.audience} terus kepada butiran sebenar ${snapshot.product}.`,
  };
  return values[role];
}

function buildBody(request: ContentCreateRequestV1, snapshot: ApprovedOfferSnapshotV1) {
  const roleIntro: Record<ContentCreateContentRole, string> = {
    attract: `${snapshot.audience} sering perlukan pilihan yang lebih jelas sebelum mengambil langkah seterusnya.`,
    educate: `Sebelum memilih penyelesaian, semak skop, nilai dan terma yang benar-benar ditawarkan.`,
    trust: `Kepercayaan bermula apabila skop tawaran diterangkan tanpa janji atau hasil yang direka.`,
    convert: `Jika anda sedang mencari ${snapshot.product}, semak butiran tawaran ini sebagai langkah seterusnya.`,
  };
  const sections = [
    roleIntro[request.contentRole],
    snapshot.valueStack.length ? snapshot.valueStack.map((item) => `• ${item}`).join("\n") : "",
    snapshot.priceNote ? `Harga: ${snapshot.priceNote}` : "",
    snapshot.terms ? `Syarat:\n${snapshot.terms}` : "",
    snapshot.riskReversal,
    snapshot.urgencyNote,
    snapshot.validUntil && !`${snapshot.terms}\n${snapshot.urgencyNote}`.includes(snapshot.validUntil) ? `Tarikh sah: ${snapshot.validUntil}` : "",
  ].filter(Boolean);
  return sections.join("\n\n").slice(0, LIMITS.body);
}

function strategyFor(business: BusinessContextSnapshot, request: ContentCreateRequestV1, snapshot: ApprovedOfferSnapshotV1): ContentStrategyV1 {
  const callToAction = ctaFor(request.objective);
  const proof = proofStrategy(request, snapshot);
  return {
    audience: clip(snapshot.audience || business.targetCustomer, LIMITS.strategy),
    audienceStage: audienceStage(request.contentRole),
    contentRole: request.contentRole,
    coreThesis: clip(`${snapshot.product} patut diperkenalkan melalui masalah dan butiran tawaran yang benar-benar relevan.`, LIMITS.strategy),
    coreMessage: clip(roleMessage(request.contentRole, snapshot), LIMITS.strategy),
    desiredBeliefShift: {
      before: clip(`Saya belum pasti sama ada ${snapshot.product} berkaitan dengan keperluan saya.`, LIMITS.strategy),
      after: clip(`Saya faham skop Approved Offer dan boleh menilai sama ada ${snapshot.product} sesuai.`, LIMITS.strategy),
    },
    angle: clip(`${request.contentRole}: approved Offer sebagai langkah seterusnya yang logik`, LIMITS.strategy),
    primaryEmotion: request.contentRole === "trust" ? "yakin dengan batas yang jelas" : request.contentRole === "convert" ? "bersedia menilai" : "ingin tahu",
    proofStrategy: proof,
    offerBridge: clip(`Jika pertimbangan ini relevan, ${snapshot.headline} ialah langkah seterusnya untuk dinilai.`, LIMITS.strategy),
    callToAction,
    successMetric: request.objective === "engagement" ? "Komen berkualiti daripada audience sasaran." : request.objective === "leads" ? "Pertanyaan yang menyebut keperluan sebenar." : request.objective === "sales" ? "Semakan tawaran atau tempahan yang sesuai." : request.objective === "education" ? "Simpanan dan pemahaman butiran tawaran." : "Audience sasaran memahami kaitan masalah dengan tawaran.",
  };
}

export function buildDeterministicContentCreate(input: { business: BusinessContextSnapshot; request: ContentCreateRequestV1; sourceOfferSnapshot: ApprovedOfferSnapshotV1; now: Date }): ContentCreateArtifactV1 {
  if (input.request.sourceOfferId !== input.sourceOfferSnapshot.id) throw new Error("Tawaran sumber tidak sepadan.");
  if (!/^[a-f0-9]{64}$/i.test(input.sourceOfferSnapshot.sourceContentHash)) throw new Error("Hash Approved Offer tidak sah.");
  const timestamp = input.now.toISOString();
  const strategy = strategyFor(input.business, input.request, input.sourceOfferSnapshot);
  const claims = approvedOfferClaims(input.sourceOfferSnapshot);
  claims.push(...ownerProofClaims(input.request.proofNote, claims.length + 1));
  const assumptions = ["Output ialah social text DRAF sahaja dan memerlukan kelulusan manusia."];
  if (input.request.proofNote) assumptions.push("Nota bukti pemilik ialah input tidak dipercayai; ia tidak dianggap bukti bebas.");
  if (input.request.extraContext) assumptions.push("Konteks tambahan pemilik dipagar sebagai data tidak dipercayai dan tidak boleh mengubah Offer atau polisi.");
  const artifact: ContentCreateArtifactV1 = {
    schemaVersion: CONTENT_CREATE_SCHEMA_VERSION,
    kind: "content_create",
    status: "draft",
    entry: "from_offer",
    sourceOfferId: input.sourceOfferSnapshot.id,
    sourceOfferSnapshot: input.sourceOfferSnapshot,
    businessContextSnapshot: input.business,
    platform: input.request.platform,
    objective: input.request.objective,
    strategy,
    draft: {
      hook: clip(input.sourceOfferSnapshot.headline, LIMITS.hook),
      body: buildBody(input.request, input.sourceOfferSnapshot),
      callToAction: strategy.callToAction,
      hashtags: [],
      revision: 1,
      parentContentHash: null,
    },
    claimLedger: claims.slice(0, LIMITS.claims),
    assumptions: assumptions.slice(0, LIMITS.assumptions),
    recipeVersion: CONTENT_CREATE_RECIPE_VERSION,
    approval: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const validation = validateContentCreateArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}

function boundedString(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

function validStringArray(value: unknown, min: number, max: number, itemMax: number) {
  return Array.isArray(value) && value.length >= min && value.length <= max && value.every((item) => boundedString(item, 1, itemMax));
}

function validBusinessContext(value: unknown): value is BusinessContextSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as JsonRecord;
  return ["businessName", "category", "products", "targetCustomer", "location", "usp", "toneOfVoice", "priceRange", "platforms"].every((key) => typeof item[key] === "string" && String(item[key]).length <= 500);
}

function validateSnapshot(value: unknown, errors: string[]): value is ApprovedOfferSnapshotV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) { errors.push("Approved Offer snapshot tidak sah."); return false; }
  const item = value as JsonRecord;
  const textFields = ["product", "audience", "headline", "priceNote", "terms", "riskReversal", "urgencyNote", "validUntil"] as const;
  if (!Number.isSafeInteger(Number(item.id)) || Number(item.id) < 1 || !/^[a-f0-9]{64}$/i.test(String(item.sourceContentHash)) || textFields.some((key) => typeof item[key] !== "string") || !validStringArray(item.valueStack, 1, 5, 300)) errors.push("Approved Offer snapshot tidak sah.");
  return errors.length === 0;
}

export function validateContentCreateArtifact(value: unknown): { ok: true; artifact: ContentCreateArtifactV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, errors: ["Artifact mesti objek."] };
  const item = value as JsonRecord;
  if (item.schemaVersion !== 1 || item.kind !== "content_create" || item.entry !== "from_offer") errors.push("Kontrak artifact tidak sah.");
  if (!(["draft", "approved"] as const).includes(item.status as ContentCreateStatus)) errors.push("Status artifact tidak sah.");
  if (!Number.isSafeInteger(Number(item.sourceOfferId)) || Number(item.sourceOfferId) < 1) errors.push("Tawaran sumber tidak sah.");
  const snapshotErrors: string[] = [];
  const snapshotValid = validateSnapshot(item.sourceOfferSnapshot, snapshotErrors);
  if (!snapshotValid) errors.push(...snapshotErrors);
  else if ((item.sourceOfferSnapshot as ApprovedOfferSnapshotV1).id !== Number(item.sourceOfferId)) errors.push("Tawaran sumber tidak sepadan.");
  if (!validBusinessContext(item.businessContextSnapshot)) errors.push("Business Context tidak sah.");
  if (!SOCIAL_POST_PLATFORMS.includes(item.platform as SocialPostPlatform) || !SOCIAL_POST_OBJECTIVES.includes(item.objective as SocialPostObjective)) errors.push("Platform atau objektif tidak sah.");
  const strategy = item.strategy as JsonRecord | undefined;
  if (!strategy || !CONTENT_CREATE_CONTENT_ROLES.includes(strategy.contentRole as ContentCreateContentRole) || !["unaware", "problem_aware", "solution_aware", "offer_aware"].includes(String(strategy.audienceStage)) || !["audience", "coreThesis", "coreMessage", "angle", "primaryEmotion", "offerBridge", "callToAction", "successMetric"].every((key) => boundedString(strategy[key], 1, LIMITS.strategy))) errors.push("Strategi content tidak sah.");
  else {
    const belief = strategy.desiredBeliefShift as JsonRecord | undefined;
    const proof = strategy.proofStrategy as JsonRecord | undefined;
    if (!belief || !boundedString(belief.before, 1, LIMITS.strategy) || !boundedString(belief.after, 1, LIMITS.strategy) || !proof || !CONTENT_CREATE_PROOF_STATES.includes(proof.state as ContentCreateProofState) || !boundedString(proof.note, 1, LIMITS.strategy)) errors.push("Strategi content tidak sah.");
  }
  const draft = item.draft as JsonRecord | undefined;
  if (!draft || !boundedString(draft.hook, 1, LIMITS.hook) || !boundedString(draft.body, 1, LIMITS.body) || !boundedString(draft.callToAction, 1, LIMITS.cta) || !Array.isArray(draft.hashtags) || draft.hashtags.length > LIMITS.hashtagCount || draft.hashtags.some((tag) => !boundedString(tag, 1, LIMITS.hashtag)) || !Number.isSafeInteger(Number(draft.revision)) || Number(draft.revision) < 1 || (draft.parentContentHash !== null && !/^[a-f0-9]{64}$/i.test(String(draft.parentContentHash)))) errors.push("Draf content tidak sah.");
  if (!Array.isArray(item.claimLedger) || item.claimLedger.length > LIMITS.claims || item.claimLedger.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return true;
    const c = entry as JsonRecord;
    return !boundedString(c.claimId, 1, 100) || !boundedString(c.exactClaimText, 1, 5000) || !CONTENT_CREATE_CLAIM_ORIGINS.includes(c.origin as ContentCreateClaimOrigin) || !CONTENT_CREATE_CLAIM_CLASSES.includes(c.class as ContentCreateClaimClass) || !CONTENT_CREATE_EVIDENCE_STATES.includes(c.evidenceState as ContentCreateEvidenceState) || !CONTENT_CREATE_CLAIM_ACTIONS.includes(c.action as ContentCreateClaimAction) || !boundedString(c.allowedWordingCeiling, 1, 500) || (c.origin !== "APPROVED_OFFER" && c.evidenceState === "SUPPORTED_BY_OFFER") || (c.evidenceState === "UNKNOWN" && c.action === "KEEP");
  })) errors.push("Claim Ledger tidak sah.");
  if (!validStringArray(item.assumptions, 0, LIMITS.assumptions, 500)) errors.push("Assumptions tidak sah.");
  if (item.recipeVersion !== CONTENT_CREATE_RECIPE_VERSION || !boundedString(item.createdAt, 1, 40) || !boundedString(item.updatedAt, 1, 40)) errors.push("Metadata artifact tidak sah.");
  if (item.status === "approved") {
    const approval = item.approval as JsonRecord | null;
    if (!approval || !boundedString(approval.actorId, 1, 200) || !boundedString(approval.approvedAt, 1, 40) || !/^[a-f0-9]{64}$/i.test(String(approval.contentHash)) || approval.approvalScope !== "content_create_draft") errors.push("Approval tidak sah.");
  } else if (item.approval !== null) errors.push("Draf tidak boleh mempunyai approval.");
  if (errors.length) return { ok: false, errors };
  return { ok: true, artifact: item as unknown as ContentCreateArtifactV1 };
}

export function renderContentCreateDraft(draft: ContentCreateDraftV1) {
  return [draft.hook, draft.body, draft.callToAction, draft.hashtags.join(" ")].filter(Boolean).join("\n\n");
}

export function approveContentCreateArtifact(existing: ContentCreateArtifactV1, actorId: string, now: Date) {
  if (existing.status !== "draft") throw new Error("Hanya DRAF boleh diluluskan.");
  const actor = actorId.trim();
  if (!actor) throw new Error("Actor approval diperlukan.");
  const timestamp = now.toISOString();
  const approved: ContentCreateArtifactV1 = {
    ...existing,
    status: "approved",
    approval: { actorId: actor, approvedAt: timestamp, contentHash: sha256Hex(renderContentCreateDraft(existing.draft)), approvalScope: "content_create_draft" },
    updatedAt: timestamp,
  };
  const validation = validateContentCreateArtifact(approved);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return approved;
}

export function applyContentCreateDraftEdits(existing: ContentCreateArtifactV1, value: unknown, now: Date) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Perubahan artifact tidak sah.");
  const input = value as JsonRecord;
  const hashtags = Array.isArray(input.hashtags) ? input.hashtags.map((tag) => requiredText(tag, "Hashtag", LIMITS.hashtag)) : [];
  if (hashtags.length > LIMITS.hashtagCount) throw new Error("Terlalu banyak hashtag.");
  const reopened = existing.status === "approved";
  const timestamp = now.toISOString();
  const edited: ContentCreateArtifactV1 = {
    ...existing,
    status: "draft",
    approval: null,
    createdAt: reopened ? timestamp : existing.createdAt,
    updatedAt: timestamp,
    draft: {
      hook: requiredText(input.hook, "Hook", LIMITS.hook),
      body: requiredText(input.body, "Body", LIMITS.body),
      callToAction: requiredText(input.callToAction, "CTA", LIMITS.cta),
      hashtags,
      revision: reopened ? existing.draft.revision + 1 : existing.draft.revision,
      parentContentHash: reopened && existing.approval ? existing.approval.contentHash : existing.draft.parentContentHash,
    },
  };
  const validation = validateContentCreateArtifact(edited);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return edited;
}

export function canUseContentCreateTier(tier: string | null | undefined) {
  return tier === "pro" || tier === "max";
}
