import { sha256Hex } from "../content-review/hash";
import {
  validateContentCreateArtifact,
  renderContentCreateDraft,
  type ContentCreateArtifactV1,
  type ContentCreateClaimAction,
  type ContentCreateClaimClass,
  type ContentCreateClaimOrigin,
  type ContentCreateEvidenceState,
  type ContentCreateProofState,
  type ContentCreateContentRole,
} from "../content-create/domain";
import type { GenerationTelemetry, SocialPostObjective } from "../native-social-post/domain";

export type { GenerationTelemetry };
export const VISUAL_PACKAGING_SCHEMA_VERSION = 1 as const;
export const VISUAL_PACKAGING_RECIPE_VERSION = "visual-packaging-v1.0.0" as const;
export const VISUAL_PACKAGING_FORMATS = ["short_video", "static_post", "carousel"] as const;
export const VISUAL_PACKAGING_INTENTS = ["attention", "authority", "search", "conversion"] as const;
export const VISUAL_BEAT_PURPOSES = ["explain", "demonstrate", "prove", "contrast", "simplify", "humanize", "amplify_emotion"] as const;
export const VISUAL_PROOF_SOURCES = ["APPROVED_CONTENT", "APPROVED_OFFER", "OWNER_ASSET_REQUIRED", "ILLUSTRATIVE_ONLY"] as const;
export const VISUAL_CLAIM_ACTIONS = ["KEEP", "SOFTEN", "REMOVE", "OWNER_VERIFY"] as const;
export const AI_CLICHES = ["robot", "blue glowing brain", "futuristic hologram screen", "random coding footage", "fake analytics dashboard"] as const;

export type VisualPackagingFormat = (typeof VISUAL_PACKAGING_FORMATS)[number];
export type VisualPackagingIntent = (typeof VISUAL_PACKAGING_INTENTS)[number];
export type VisualBeatPurpose = (typeof VISUAL_BEAT_PURPOSES)[number];
export type VisualProofSource = (typeof VISUAL_PROOF_SOURCES)[number];
export type VisualClaimAction = (typeof VISUAL_CLAIM_ACTIONS)[number];

export type VisualPackagingRequestV1 = {
  entry: "from_content_create";
  sourceContentCreateId: number;
  format: VisualPackagingFormat;
  packagingIntent: VisualPackagingIntent;
  productionConstraints: string;
};

export type ProtectedClaimSummary = {
  claimId: string;
  exactClaimText: string;
  origin: ContentCreateClaimOrigin;
  class: ContentCreateClaimClass;
  evidenceState: ContentCreateEvidenceState;
  action: ContentCreateClaimAction;
  allowedWordingCeiling: string;
};

export type ApprovedContentCreateSnapshotV1 = Readonly<{
  id: number;
  sourceOfferId: number;
  platform: "tiktok";
  objective: SocialPostObjective;
  contentRole: ContentCreateContentRole;
  audience: string;
  coreThesis: string;
  coreMessage: string;
  desiredBeliefShift: { before: string; after: string };
  primaryEmotion: string;
  proofStrategy: { state: ContentCreateProofState; note: string };
  offerBridge: string;
  callToAction: string;
  draft: { hook: string; body: string; callToAction: string; hashtags: string[]; revision: number };
  claimLedger: ProtectedClaimSummary[];
  approvalContentHash: string;
  sourceContentHash: string;
}>;

export type VisualPackagingSharedV1 = {
  packagingIntent: VisualPackagingIntent;
  titleOptions: string[];
  championTitle: string;
  audienceSignal: string;
  audienceFit: string;
  expectationAccuracy: string;
  promiseCeiling: string;
};

export type VisualBeatV1 = {
  beatNumber: number;
  purpose: VisualBeatPurpose;
  visualDirection: string;
  onScreenText: string;
  durationHintSeconds: number | null;
  proofSource: VisualProofSource;
  claimAction: VisualClaimAction;
};

export type CoverDirectionV1 = {
  focalPoint: string;
  textOverlay: string;
  hierarchy: string;
  emotion: string;
  background: string;
  brandCue: string;
  mobileReadabilityCheck: string;
};

export type ShortVideoPlanV1 = {
  format: "short_video";
  coverDirection: CoverDirectionV1;
  firstFrame: VisualBeatV1;
  visualBeats: VisualBeatV1[];
  aRollDirection: string;
  bRollRule: string;
  visualProofPlan: string;
  captionAndSafeAreaNotes: string[];
};

export type StaticPostPlanV1 = {
  format: "static_post";
  canvasDirection: {
    focalPoint: string;
    textOverlay: string;
    hierarchy: string;
    emotion: string;
    background: string;
    brandCue: string;
    proofSource: VisualProofSource;
  };
  captionAlignment: string;
  mobileReadabilityCheck: string;
  accessibilityAltTextDirection: string;
};

export type CarouselSlideV1 = {
  slideNumber: number;
  purpose: VisualBeatPurpose;
  heading: string;
  bodyDirection: string;
  visualDirection: string;
  proofSource: VisualProofSource;
  claimAction: VisualClaimAction;
};

export type CarouselPlanV1 = {
  format: "carousel";
  coverDirection: CoverDirectionV1;
  slides: CarouselSlideV1[];
  progression: string;
  finalCtaAlignment: string;
  mobileReadabilityCheck: string;
};

export type VisualPackagingSafetyV1 = {
  promiseCeiling: string;
  unsupportedVisualClaims: Array<{ claim: string; reason: string; action: "REMOVE" | "OWNER_VERIFY" }>;
  aiClichesAvoided: string[];
  accessibilityNotes: string[];
};

export type VisualPackagingArtifactV1 = {
  schemaVersion: typeof VISUAL_PACKAGING_SCHEMA_VERSION;
  kind: "visual_packaging";
  status: "draft" | "approved";
  entry: "from_content_create";
  sourceContentCreateId: number;
  sourceSnapshot: ApprovedContentCreateSnapshotV1;
  packaging: VisualPackagingSharedV1;
  formatPlan: ShortVideoPlanV1 | StaticPostPlanV1 | CarouselPlanV1;
  safety: VisualPackagingSafetyV1;
  productionConstraints: string;
  revision: number;
  parentContentHash: string | null;
  approval: null | { actorId: string; approvedAt: string; contentHash: string; approvalScope: "visual_packaging_plan" };
  recipeVersion: typeof VISUAL_PACKAGING_RECIPE_VERSION;
  createdAt: string;
  updatedAt: string;
};

type JsonRecord = Record<string, unknown>;
const HASH_RE = /^[a-f0-9]{64}$/i;

function compact(value: string) { return value.trim().replace(/\s+/g, " "); }
function clip(value: string, max: number) {
  const text = compact(value);
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
function words(value: string, max: number) { return compact(value).split(/\s+/).filter(Boolean).slice(0, max).join(" "); }
function bounded(value: unknown, min: number, max: number) { return typeof value === "string" && value.trim().length >= min && value.length <= max; }
function requiredText(value: unknown, label: string, max: number) {
  if (!bounded(value, 1, max)) throw new Error(`${label} tidak sah.`);
  return (value as string).trim();
}
function optionalText(value: unknown, label: string, max: number) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.trim().length > max) throw new Error(`${label} tidak sah.`);
  return value.trim();
}
function enumValue<const T extends readonly string[]>(value: unknown, allowed: T, message: string): T[number] {
  if (typeof value !== "string" || !allowed.includes(value as T[number])) throw new Error(message);
  return value as T[number];
}
function record(value: unknown): JsonRecord | null { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null; }

export function parseVisualPackagingRequest(value: unknown): VisualPackagingRequestV1 {
  const input = record(value);
  if (!input) throw new Error("Data permintaan tidak sah.");
  if (input.entry !== "from_content_create") throw new Error("Jenis entri tidak disokong.");
  const sourceContentCreateId = Number(input.sourceContentCreateId ?? input.source_content_create_id);
  if (!Number.isSafeInteger(sourceContentCreateId) || sourceContentCreateId < 1) throw new Error("Content sumber tidak sah.");
  return {
    entry: "from_content_create",
    sourceContentCreateId,
    format: enumValue(input.format, VISUAL_PACKAGING_FORMATS, "Format visual tidak disokong."),
    packagingIntent: enumValue(input.packagingIntent ?? input.packaging_intent, VISUAL_PACKAGING_INTENTS, "Packaging intent tidak disokong."),
    productionConstraints: optionalText(input.productionConstraints ?? input.production_constraints, "Kekangan produksi", 500),
  };
}

export function buildApprovedContentCreateSnapshot(input: { id: number; artifact: ContentCreateArtifactV1 }): ApprovedContentCreateSnapshotV1 {
  if (!Number.isSafeInteger(input.id) || input.id < 1) throw new Error("Approved Content id tidak sah.");
  const validation = validateContentCreateArtifact(input.artifact);
  if (!validation.ok || input.artifact.kind !== "content_create" || input.artifact.status !== "approved" || input.artifact.platform !== "tiktok" || !input.artifact.approval) throw new Error("Approved TikTok Content diperlukan.");
  const sourceContentHash = sha256Hex(renderContentCreateDraft(input.artifact.draft));
  if (sourceContentHash !== input.artifact.approval.contentHash) throw new Error("Approval Content tidak sah.");
  const claims = input.artifact.claimLedger.map((claim) => Object.freeze({ ...claim }));
  return Object.freeze({
    id: input.id,
    sourceOfferId: input.artifact.sourceOfferId,
    platform: "tiktok",
    objective: input.artifact.objective,
    contentRole: input.artifact.strategy.contentRole,
    audience: clip(input.artifact.strategy.audience, 500),
    coreThesis: clip(input.artifact.strategy.coreThesis, 500),
    coreMessage: clip(input.artifact.strategy.coreMessage, 500),
    desiredBeliefShift: Object.freeze({ before: clip(input.artifact.strategy.desiredBeliefShift.before, 500), after: clip(input.artifact.strategy.desiredBeliefShift.after, 500) }),
    primaryEmotion: clip(input.artifact.strategy.primaryEmotion, 500),
    proofStrategy: Object.freeze({ ...input.artifact.strategy.proofStrategy }),
    offerBridge: clip(input.artifact.strategy.offerBridge, 500),
    callToAction: clip(input.artifact.strategy.callToAction, 500),
    draft: Object.freeze({ hook: clip(input.artifact.draft.hook, 500), body: input.artifact.draft.body.slice(0, 5000), callToAction: clip(input.artifact.draft.callToAction, 500), hashtags: Object.freeze([...input.artifact.draft.hashtags]) as unknown as string[], revision: input.artifact.draft.revision }),
    claimLedger: Object.freeze(claims) as unknown as ProtectedClaimSummary[],
    approvalContentHash: input.artifact.approval.contentHash,
    sourceContentHash,
  });
}

export function renderApprovedContentCreateSource(snapshot: ApprovedContentCreateSnapshotV1) {
  return [snapshot.draft.hook, snapshot.draft.body, snapshot.draft.callToAction, snapshot.draft.hashtags.join(" ")].filter(Boolean).join("\n\n");
}

function promiseCeiling(snapshot: ApprovedContentCreateSnapshotV1) {
  return clip(snapshot.claimLedger.find((claim) => claim.action === "KEEP")?.allowedWordingCeiling || snapshot.coreMessage, 500);
}

function titleOptions(snapshot: ApprovedContentCreateSnapshotV1, intent: VisualPackagingIntent) {
  const labels: Record<VisualPackagingIntent, string[]> = {
    attention: [snapshot.draft.hook, `Untuk ${snapshot.audience}: ${snapshot.coreThesis}`],
    authority: [snapshot.coreThesis, `Panduan jelas untuk ${snapshot.audience}`],
    search: [`Cara ${snapshot.coreMessage}`, snapshot.draft.hook],
    conversion: [snapshot.offerBridge, snapshot.draft.hook],
  };
  return labels[intent].map((item) => clip(item, 120)).filter(Boolean).slice(0, 3);
}

function cover(snapshot: ApprovedContentCreateSnapshotV1, title: string): CoverDirectionV1 {
  return {
    focalPoint: `Seorang pemilik bisnes menerangkan idea utama kepada ${snapshot.audience}; bukan pelanggan atau hasil rekaan.`,
    textOverlay: words(title, 6),
    hierarchy: "Satu headline besar, satu focal point, ruang kosong yang jelas.",
    emotion: clip(snapshot.primaryEmotion, 120),
    background: "Latar kerja sebenar yang neutral dan tidak menyerupai dashboard prestasi.",
    brandCue: "Gunakan cue neutral; jangan cipta logo, fon, warna atau aset jenama.",
    mobileReadabilityCheck: "Overlay maksimum enam perkataan dan terbaca pada skrin telefon tanpa zoom.",
  };
}

function beat(number: number, purpose: VisualBeatPurpose, visualDirection: string, onScreenText: string, proofSource: VisualProofSource = "APPROVED_CONTENT"): VisualBeatV1 {
  return { beatNumber: number, purpose, visualDirection: clip(visualDirection, 500), onScreenText: clip(onScreenText, 120), durationHintSeconds: number === 1 ? 3 : 5, proofSource, claimAction: "KEEP" };
}

function planFor(snapshot: ApprovedContentCreateSnapshotV1, format: VisualPackagingFormat, champion: string): VisualPackagingArtifactV1["formatPlan"] {
  const sharedCover = cover(snapshot, champion);
  if (format === "short_video") {
    const visualBeats = [
      beat(1, "amplify_emotion", `A-roll membuka terus dengan hook approved: ${snapshot.draft.hook}`, words(snapshot.draft.hook, 6)),
      beat(2, "explain", `A-roll menerangkan tesis approved kepada ${snapshot.audience}; gunakan teks kata kunci sahaja.`, words(snapshot.coreThesis, 6)),
      beat(3, "simplify", `Paparkan struktur ringkas yang menggambarkan mesej approved tanpa metrik, pelanggan atau hasil rekaan.`, "Langkah yang lebih jelas"),
      beat(4, "demonstrate", `Kembali ke A-roll untuk jambatan tawaran dan CTA approved: ${snapshot.callToAction}`, words(snapshot.callToAction, 6)),
    ];
    return {
      format: "short_video",
      coverDirection: sharedCover,
      firstFrame: visualBeats[0],
      visualBeats,
      aRollDirection: `Penyampai bercakap terus, tenang dan jelas kepada ${snapshot.audience}; kekalkan wording dalam Approved Content.`,
      bRollRule: "B-roll mesti menerangkan beat tertentu. Elak random stock footage, coding footage, dashboard, pelanggan atau transformasi rekaan.",
      visualProofPlan: "Gunakan APPROVED_CONTENT untuk idea sumber; jika bukti dunia sebenar diperlukan, tandakan OWNER_ASSET_REQUIRED dan jangan gambarkan ia sudah wujud.",
      captionAndSafeAreaNotes: ["Letak caption dalam safe area tengah-bawah tanpa menutup muka.", "Kekalkan satu idea ringkas pada setiap frame dan semak bacaan telefon."],
    };
  }
  if (format === "static_post") {
    return {
      format: "static_post",
      canvasDirection: { focalPoint: sharedCover.focalPoint, textOverlay: sharedCover.textOverlay, hierarchy: sharedCover.hierarchy, emotion: sharedCover.emotion, background: sharedCover.background, brandCue: sharedCover.brandCue, proofSource: "APPROVED_CONTENT" },
      captionAlignment: `Caption menyambung tesis approved dan CTA tanpa menaikkan promise: ${snapshot.callToAction}`,
      mobileReadabilityCheck: sharedCover.mobileReadabilityCheck,
      accessibilityAltTextDirection: "Terangkan subjek, aksi, overlay dan konteks secara literal; jangan menyatakan hasil yang tidak dipaparkan.",
    };
  }
  return {
    format: "carousel",
    coverDirection: sharedCover,
    slides: [
      { slideNumber: 1, purpose: "amplify_emotion", heading: words(champion, 6), bodyDirection: `Isyaratkan masalah untuk ${snapshot.audience}.`, visualDirection: sharedCover.focalPoint, proofSource: "APPROVED_CONTENT", claimAction: "KEEP" },
      { slideNumber: 2, purpose: "explain", heading: "Idea utama", bodyDirection: clip(snapshot.coreThesis, 300), visualDirection: "Gunakan satu rajah konsep ringkas tanpa data prestasi rekaan.", proofSource: "APPROVED_CONTENT", claimAction: "KEEP" },
      { slideNumber: 3, purpose: "simplify", heading: "Apa yang perlu jelas", bodyDirection: clip(snapshot.coreMessage, 300), visualDirection: "Pecahkan mesej kepada urutan visual yang mudah diimbas pada telefon.", proofSource: "APPROVED_CONTENT", claimAction: "KEEP" },
      { slideNumber: 4, purpose: "demonstrate", heading: "Langkah seterusnya", bodyDirection: clip(snapshot.callToAction, 300), visualDirection: "Tamat dengan CTA approved dan ruang visual yang tenang; jangan tambah urgency.", proofSource: "APPROVED_CONTENT", claimAction: "KEEP" },
    ],
    progression: "Hook audience → jelaskan tesis → mudahkan mesej → sambung kepada CTA approved.",
    finalCtaAlignment: `CTA akhir mesti kekal tepat: ${snapshot.callToAction}`,
    mobileReadabilityCheck: "Satu heading pendek dan satu idea pada setiap slide; teks utama terbaca tanpa zoom.",
  };
}

function unsupportedFromConstraints(value: string): VisualPackagingSafetyV1["unsupportedVisualClaims"] {
  const output: VisualPackagingSafetyV1["unsupportedVisualClaims"] = [];
  if (/dashboard|\d+\s*%|jualan\s+(?:naik|meningkat)/i.test(value)) output.push({ claim: "Dashboard atau hasil prestasi tanpa aset dan bukti approved", reason: "Bukti sebenar memerlukan OWNER_ASSET_REQUIRED; dashboard/statistik rekaan dilarang.", action: "REMOVE" });
  if (/pelanggan|testimoni|testimonial|quote/i.test(value)) output.push({ claim: "Pelanggan atau testimonial rekaan", reason: "Identiti, imej dan quote memerlukan OWNER_ASSET_REQUIRED; jangan cipta manusia atau endorsement.", action: "REMOVE" });
  if (/tinggal|slot|hari ini|urgency|scarcity/i.test(value)) output.push({ claim: "Urgency atau scarcity yang tidak disokong", reason: "Wording tidak wujud dalam Approved Content dan mesti dibuang.", action: "REMOVE" });
  if (/before.?after|transformasi|transformation/i.test(value)) output.push({ claim: "Transformasi sebenar tanpa aset", reason: "Owner assertion bukan bukti visual; tandakan OWNER_ASSET_REQUIRED sebelum penggunaan.", action: "OWNER_VERIFY" });
  return output;
}

export function buildDeterministicVisualPackaging(input: { request: VisualPackagingRequestV1; sourceSnapshot: ApprovedContentCreateSnapshotV1; now: Date }): VisualPackagingArtifactV1 {
  if (input.request.sourceContentCreateId !== input.sourceSnapshot.id) throw new Error("Content sumber tidak sepadan.");
  if (!HASH_RE.test(input.sourceSnapshot.sourceContentHash) || input.sourceSnapshot.approvalContentHash !== input.sourceSnapshot.sourceContentHash) throw new Error("Hash Approved Content tidak sah.");
  const timestamp = input.now.toISOString();
  const titles = titleOptions(input.sourceSnapshot, input.request.packagingIntent);
  const ceiling = promiseCeiling(input.sourceSnapshot);
  const artifact: VisualPackagingArtifactV1 = {
    schemaVersion: 1,
    kind: "visual_packaging",
    status: "draft",
    entry: "from_content_create",
    sourceContentCreateId: input.sourceSnapshot.id,
    sourceSnapshot: input.sourceSnapshot,
    packaging: {
      packagingIntent: input.request.packagingIntent,
      titleOptions: titles,
      championTitle: titles[0],
      audienceSignal: clip(`Untuk ${input.sourceSnapshot.audience}`, 300),
      audienceFit: clip(`Visual, bahasa dan contoh ditujukan khusus kepada ${input.sourceSnapshot.audience}; klik daripada audience lain bukan kejayaan.`, 500),
      expectationAccuracy: clip(`Title dan visual menjanjikan hanya penerangan yang selari dengan tesis approved: ${input.sourceSnapshot.coreThesis}`, 500),
      promiseCeiling: ceiling,
    },
    formatPlan: planFor(input.sourceSnapshot, input.request.format, titles[0]),
    safety: {
      promiseCeiling: ceiling,
      unsupportedVisualClaims: unsupportedFromConstraints(input.request.productionConstraints),
      aiClichesAvoided: [...AI_CLICHES],
      accessibilityNotes: ["Pastikan kontras dan saiz teks sesuai untuk telefon.", "Sediakan alt text atau caption literal tanpa menambah claim."],
    },
    productionConstraints: input.request.productionConstraints,
    revision: 1,
    parentContentHash: null,
    approval: null,
    recipeVersion: VISUAL_PACKAGING_RECIPE_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const validation = validateVisualPackagingArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}

function validStringArray(value: unknown, min: number, max: number, itemMax: number) {
  return Array.isArray(value) && value.length >= min && value.length <= max && value.every((item) => bounded(item, 1, itemMax));
}
function validProof(value: unknown) { return VISUAL_PROOF_SOURCES.includes(value as VisualProofSource); }
function validAction(value: unknown) { return VISUAL_CLAIM_ACTIONS.includes(value as VisualClaimAction); }
function validPurpose(value: unknown) { return VISUAL_BEAT_PURPOSES.includes(value as VisualBeatPurpose); }
function validateCover(value: unknown) {
  const item = record(value);
  return Boolean(item && ["focalPoint", "hierarchy", "emotion", "background", "brandCue", "mobileReadabilityCheck"].every((key) => bounded(item[key], 1, 500)) && bounded(item.textOverlay, 0, 120) && words(String(item.textOverlay ?? ""), 6) === compact(String(item.textOverlay ?? "")));
}
function validBeat(value: unknown, index: number) {
  const item = record(value);
  return Boolean(item && item.beatNumber === index + 1 && validPurpose(item.purpose) && bounded(item.visualDirection, 1, 500) && bounded(item.onScreenText, 0, 120) && (item.durationHintSeconds === null || (typeof item.durationHintSeconds === "number" && item.durationHintSeconds >= 1 && item.durationHintSeconds <= 15)) && validProof(item.proofSource) && validAction(item.claimAction));
}
function validateSource(value: unknown) {
  const item = record(value);
  if (!item || !Number.isSafeInteger(Number(item.id)) || Number(item.id) < 1 || item.platform !== "tiktok" || !HASH_RE.test(String(item.sourceContentHash)) || item.sourceContentHash !== item.approvalContentHash) return false;
  return ["audience", "coreThesis", "coreMessage", "primaryEmotion", "offerBridge", "callToAction"].every((key) => bounded(item[key], 1, 500)) && Array.isArray(item.claimLedger) && record(item.draft) !== null;
}

export function validateVisualPackagingArtifact(value: unknown): { ok: true; artifact: VisualPackagingArtifactV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const item = record(value);
  if (!item) return { ok: false, errors: ["Artifact mesti objek."] };
  if (item.schemaVersion !== 1 || item.kind !== "visual_packaging" || item.entry !== "from_content_create") errors.push("Kontrak artifact tidak sah.");
  if (!["draft", "approved"].includes(String(item.status))) errors.push("Status artifact tidak sah.");
  if (!Number.isSafeInteger(Number(item.sourceContentCreateId)) || Number(item.sourceContentCreateId) < 1 || !validateSource(item.sourceSnapshot) || Number((item.sourceSnapshot as JsonRecord | undefined)?.id) !== Number(item.sourceContentCreateId)) errors.push("Approved Content snapshot tidak sah.");
  const packaging = record(item.packaging);
  if (!packaging || !VISUAL_PACKAGING_INTENTS.includes(packaging.packagingIntent as VisualPackagingIntent) || !validStringArray(packaging.titleOptions, 1, 3, 120) || !Array.isArray(packaging.titleOptions) || !packaging.titleOptions.includes(packaging.championTitle) || !["audienceSignal", "audienceFit", "expectationAccuracy", "promiseCeiling"].every((key) => bounded(packaging[key], 1, 500))) errors.push("Packaging bersama tidak sah.");
  const plan = record(item.formatPlan);
  if (!plan || !VISUAL_PACKAGING_FORMATS.includes(plan.format as VisualPackagingFormat)) errors.push("Format plan tidak sah.");
  else if (plan.format === "short_video") {
    if (!validateCover(plan.coverDirection) || !Array.isArray(plan.visualBeats) || plan.visualBeats.length < 3 || plan.visualBeats.length > 5 || !plan.visualBeats.every(validBeat) || JSON.stringify(plan.firstFrame) !== JSON.stringify(plan.visualBeats[0]) || !["aRollDirection", "bRollRule", "visualProofPlan"].every((key) => bounded(plan[key], 1, 500)) || !validStringArray(plan.captionAndSafeAreaNotes, 1, 5, 500)) errors.push("Pelan short video tidak sah.");
  } else if (plan.format === "static_post") {
    const canvas = record(plan.canvasDirection);
    if (!canvas || !["focalPoint", "hierarchy", "emotion", "background", "brandCue"].every((key) => bounded(canvas[key], 1, 500)) || typeof canvas.textOverlay !== "string" || words(canvas.textOverlay, 6) !== compact(canvas.textOverlay) || !validProof(canvas.proofSource) || !bounded(plan.captionAlignment, 1, 500) || !bounded(plan.mobileReadabilityCheck, 1, 500) || !bounded(plan.accessibilityAltTextDirection, 1, 500)) errors.push("Pelan static post tidak sah.");
  } else {
    if (!validateCover(plan.coverDirection) || !Array.isArray(plan.slides) || plan.slides.length < 3 || plan.slides.length > 8 || !plan.slides.every((slide, index) => { const row = record(slide); return Boolean(row && row.slideNumber === index + 1 && validPurpose(row.purpose) && bounded(row.heading, 1, 80) && bounded(row.bodyDirection, 1, 300) && bounded(row.visualDirection, 1, 500) && validProof(row.proofSource) && validAction(row.claimAction)); }) || !bounded(plan.progression, 1, 500) || !bounded(plan.finalCtaAlignment, 1, 500) || !bounded(plan.mobileReadabilityCheck, 1, 500)) errors.push("Pelan carousel tidak sah.");
  }
  const safety = record(item.safety);
  if (!safety || !bounded(safety.promiseCeiling, 1, 500) || safety.promiseCeiling !== packaging?.promiseCeiling || !validStringArray(safety.aiClichesAvoided, 1, 10, 100) || !AI_CLICHES.every((cliche) => (safety.aiClichesAvoided as unknown[]).includes(cliche)) || !validStringArray(safety.accessibilityNotes, 1, 8, 500) || !Array.isArray(safety.unsupportedVisualClaims) || safety.unsupportedVisualClaims.some((entry) => { const row = record(entry); return !row || !bounded(row.claim, 1, 500) || !bounded(row.reason, 1, 500) || !["REMOVE", "OWNER_VERIFY"].includes(String(row.action)); })) errors.push("Safety visual tidak sah.");
  if (typeof item.productionConstraints !== "string" || item.productionConstraints.length > 500 || !Number.isSafeInteger(Number(item.revision)) || Number(item.revision) < 1 || (item.parentContentHash !== null && !HASH_RE.test(String(item.parentContentHash)))) errors.push("Revision atau constraints tidak sah.");
  if (item.status === "approved") { const approval = record(item.approval); if (!approval || !bounded(approval.actorId, 1, 200) || !bounded(approval.approvedAt, 1, 40) || !HASH_RE.test(String(approval.contentHash)) || approval.approvalScope !== "visual_packaging_plan") errors.push("Approval tidak sah."); }
  else if (item.approval !== null) errors.push("Draf tidak boleh mempunyai approval.");
  if (item.recipeVersion !== VISUAL_PACKAGING_RECIPE_VERSION || !bounded(item.createdAt, 1, 40) || !bounded(item.updatedAt, 1, 40)) errors.push("Metadata artifact tidak sah.");
  return errors.length ? { ok: false, errors } : { ok: true, artifact: item as unknown as VisualPackagingArtifactV1 };
}

function unsafeEdit(value: unknown) {
  return /jamin|guarantee|\d+\s*%|jualan\s+(?:naik|meningkat|meletup)|tinggal\s+\w+\s+slot|(?:tunjuk|papar|letak)\s+(?:fake\s+)?dashboard|quote\s+testimonial|before.?after|transformasi sebenar/i.test(JSON.stringify(value));
}

function editableText(value: unknown, fallback: string, max: number, allowEmpty = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim())) throw new Error("Teks visual plan tidak sah.");
  return value.trim();
}

function editedCover(candidate: unknown, existing: CoverDirectionV1): CoverDirectionV1 {
  const input = record(candidate) ?? {};
  return {
    focalPoint: editableText(input.focalPoint, existing.focalPoint, 500),
    textOverlay: editableText(input.textOverlay, existing.textOverlay, 120, true),
    hierarchy: editableText(input.hierarchy, existing.hierarchy, 500),
    emotion: editableText(input.emotion, existing.emotion, 500),
    background: editableText(input.background, existing.background, 500),
    brandCue: editableText(input.brandCue, existing.brandCue, 500),
    mobileReadabilityCheck: editableText(input.mobileReadabilityCheck, existing.mobileReadabilityCheck, 500),
  };
}

function reconstructEditedPlan(existing: VisualPackagingArtifactV1["formatPlan"], candidate: JsonRecord): VisualPackagingArtifactV1["formatPlan"] {
  if (candidate.format !== existing.format) throw new Error("Format visual plan tidak boleh diubah.");
  if (existing.format === "short_video") {
    const candidateBeats = Array.isArray(candidate.visualBeats) ? candidate.visualBeats : [];
    const visualBeats = existing.visualBeats.map((beat, index) => {
      const input = record(candidateBeats[index]) ?? {};
      const duration = input.durationHintSeconds === null || (typeof input.durationHintSeconds === "number" && input.durationHintSeconds >= 1 && input.durationHintSeconds <= 15) ? input.durationHintSeconds : beat.durationHintSeconds;
      return { ...beat, visualDirection: editableText(input.visualDirection, beat.visualDirection, 500), onScreenText: editableText(input.onScreenText, beat.onScreenText, 120, true), durationHintSeconds: duration };
    });
    const notes = Array.isArray(candidate.captionAndSafeAreaNotes) ? candidate.captionAndSafeAreaNotes.map((item, index) => editableText(item, existing.captionAndSafeAreaNotes[index] ?? "", 500)).slice(0, 5) : existing.captionAndSafeAreaNotes;
    return { ...existing, coverDirection: editedCover(candidate.coverDirection, existing.coverDirection), firstFrame: visualBeats[0], visualBeats, aRollDirection: editableText(candidate.aRollDirection, existing.aRollDirection, 500), bRollRule: editableText(candidate.bRollRule, existing.bRollRule, 500), visualProofPlan: editableText(candidate.visualProofPlan, existing.visualProofPlan, 500), captionAndSafeAreaNotes: notes };
  }
  if (existing.format === "static_post") {
    const canvas = record(candidate.canvasDirection) ?? {};
    return {
      ...existing,
      canvasDirection: {
        ...existing.canvasDirection,
        focalPoint: editableText(canvas.focalPoint, existing.canvasDirection.focalPoint, 500),
        textOverlay: editableText(canvas.textOverlay, existing.canvasDirection.textOverlay, 120, true),
        hierarchy: editableText(canvas.hierarchy, existing.canvasDirection.hierarchy, 500),
        emotion: editableText(canvas.emotion, existing.canvasDirection.emotion, 500),
        background: editableText(canvas.background, existing.canvasDirection.background, 500),
        brandCue: editableText(canvas.brandCue, existing.canvasDirection.brandCue, 500),
        proofSource: existing.canvasDirection.proofSource,
      },
      captionAlignment: editableText(candidate.captionAlignment, existing.captionAlignment, 500),
      mobileReadabilityCheck: editableText(candidate.mobileReadabilityCheck, existing.mobileReadabilityCheck, 500),
      accessibilityAltTextDirection: editableText(candidate.accessibilityAltTextDirection, existing.accessibilityAltTextDirection, 500),
    };
  }
  const candidateSlides = Array.isArray(candidate.slides) ? candidate.slides : [];
  const slides = existing.slides.map((slide, index) => {
    const input = record(candidateSlides[index]) ?? {};
    return { ...slide, heading: editableText(input.heading, slide.heading, 80), bodyDirection: editableText(input.bodyDirection, slide.bodyDirection, 300), visualDirection: editableText(input.visualDirection, slide.visualDirection, 500) };
  });
  return { ...existing, coverDirection: editedCover(candidate.coverDirection, existing.coverDirection), slides, progression: editableText(candidate.progression, existing.progression, 500), finalCtaAlignment: editableText(candidate.finalCtaAlignment, existing.finalCtaAlignment, 500), mobileReadabilityCheck: editableText(candidate.mobileReadabilityCheck, existing.mobileReadabilityCheck, 500) };
}

export function applyVisualPackagingEdits(existing: VisualPackagingArtifactV1, value: unknown, now: Date) {
  const input = record(value);
  if (!input || unsafeEdit({ packaging: input.packaging, formatPlan: input.formatPlan })) throw new Error("Perubahan mengandungi claim visual atau promise yang tidak disokong.");
  const packaging = record(input.packaging);
  const plan = record(input.formatPlan);
  if (!packaging || !plan || plan.format !== existing.formatPlan.format) throw new Error("Perubahan visual plan tidak sah.");
  const reopened = existing.status === "approved";
  const timestamp = now.toISOString();
  const titleOptions = Array.isArray(packaging.titleOptions) ? packaging.titleOptions.map((title, index) => editableText(title, existing.packaging.titleOptions[index] ?? "", 120)).slice(0, 3) : existing.packaging.titleOptions;
  const championTitle = editableText(packaging.championTitle, existing.packaging.championTitle, 120);
  const edited: VisualPackagingArtifactV1 = {
    ...existing,
    status: "draft",
    packaging: {
      ...existing.packaging,
      titleOptions,
      championTitle,
      audienceSignal: existing.packaging.audienceSignal,
      audienceFit: editableText(packaging.audienceFit, existing.packaging.audienceFit, 500),
      expectationAccuracy: editableText(packaging.expectationAccuracy, existing.packaging.expectationAccuracy, 500),
      packagingIntent: existing.packaging.packagingIntent,
      promiseCeiling: existing.packaging.promiseCeiling,
    },
    formatPlan: reconstructEditedPlan(existing.formatPlan, plan),
    safety: { ...existing.safety, promiseCeiling: existing.packaging.promiseCeiling },
    revision: reopened ? existing.revision + 1 : existing.revision,
    parentContentHash: reopened && existing.approval ? existing.approval.contentHash : existing.parentContentHash,
    approval: null,
    createdAt: reopened ? timestamp : existing.createdAt,
    updatedAt: timestamp,
  };
  const validation = validateVisualPackagingArtifact(edited);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return edited;
}

export function renderVisualPackagingPlan(artifact: VisualPackagingArtifactV1) {
  const lines = [
    `BINA VISUAL PLAN · ${artifact.formatPlan.format} · ${artifact.packaging.packagingIntent}`,
    `Champion: ${artifact.packaging.championTitle}`,
    `Title options:\n${artifact.packaging.titleOptions.map((title) => `• ${title}`).join("\n")}`,
    `Audience: ${artifact.packaging.audienceSignal}`,
    `Audience fit: ${artifact.packaging.audienceFit}`,
    `Expectation: ${artifact.packaging.expectationAccuracy}`,
    `Promise ceiling: ${artifact.packaging.promiseCeiling}`,
  ];
  if (artifact.formatPlan.format === "short_video") {
    lines.push(`Cover: ${JSON.stringify(artifact.formatPlan.coverDirection)}`, ...artifact.formatPlan.visualBeats.map((item) => `Beat ${item.beatNumber} · ${item.purpose} · ${item.proofSource} · ${item.claimAction}\n${item.visualDirection}\n${item.onScreenText}`), `A-roll: ${artifact.formatPlan.aRollDirection}`, `B-roll: ${artifact.formatPlan.bRollRule}`, `Proof: ${artifact.formatPlan.visualProofPlan}`, `Safe area: ${artifact.formatPlan.captionAndSafeAreaNotes.join(" | ")}`);
  } else if (artifact.formatPlan.format === "static_post") {
    lines.push(`Canvas: ${JSON.stringify(artifact.formatPlan.canvasDirection)}`, `Caption: ${artifact.formatPlan.captionAlignment}`, `Mobile: ${artifact.formatPlan.mobileReadabilityCheck}`, `Alt text: ${artifact.formatPlan.accessibilityAltTextDirection}`);
  } else {
    lines.push(`Cover: ${JSON.stringify(artifact.formatPlan.coverDirection)}`, ...artifact.formatPlan.slides.map((item) => `Slide ${item.slideNumber} · ${item.purpose} · ${item.proofSource} · ${item.claimAction}\n${item.heading}\n${item.bodyDirection}\n${item.visualDirection}`), `Progression: ${artifact.formatPlan.progression}`, `CTA: ${artifact.formatPlan.finalCtaAlignment}`, `Mobile: ${artifact.formatPlan.mobileReadabilityCheck}`);
  }
  lines.push(`Keselamatan visual:\n${artifact.safety.unsupportedVisualClaims.length ? artifact.safety.unsupportedVisualClaims.map((item) => `• ${item.action}: ${item.claim} — ${item.reason}`).join("\n") : "• Tiada claim visual tambahan."}`, `AI clichés dielak: ${artifact.safety.aiClichesAvoided.join(", ")}`, `Accessibility: ${artifact.safety.accessibilityNotes.join(" | ")}`);
  return lines.join("\n\n");
}

export function approveVisualPackagingArtifact(existing: VisualPackagingArtifactV1, actorId: string, now: Date) {
  if (existing.status !== "draft") throw new Error("Hanya DRAF boleh diluluskan.");
  const actor = requiredText(actorId, "Actor approval", 200);
  const timestamp = now.toISOString();
  const approved: VisualPackagingArtifactV1 = { ...existing, status: "approved", approval: { actorId: actor, approvedAt: timestamp, contentHash: sha256Hex(renderVisualPackagingPlan(existing)), approvalScope: "visual_packaging_plan" }, updatedAt: timestamp };
  const validation = validateVisualPackagingArtifact(approved);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return approved;
}

export function canUseVisualPackagingTier(tier: string | null | undefined) { return tier === "pro" || tier === "max"; }
