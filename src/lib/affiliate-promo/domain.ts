import { postCheckAffiliatePromo, AFFILIATE_DISCLOSURE } from "./claims.ts";
import { sha256Hex } from "../content-review/hash.ts";

export const AFFILIATE_PROMO_RECIPE_VERSION = "affiliate-promo-v1.0.0" as const;

export const AFFILIATE_PROMO_PLATFORMS = ["tiktok", "facebook", "instagram"] as const;
export const AFFILIATE_PROMO_ANGLES = ["blank_page", "generic_ai", "prompt_320", "auto_isi", "kalendar_30hari", "jimat_konsultan", "usahawan_biasa"] as const;
export const AFFILIATE_PROMO_NICHES = ["fnb", "retail", "ecommerce", "servis", "kontraktor", "umum"] as const;
export const AFFILIATE_PROMO_TONES = ["mesra", "profesional", "lucu", "bernas"] as const;

export type AffiliatePromoPlatform = (typeof AFFILIATE_PROMO_PLATFORMS)[number];
export type AffiliatePromoAngle = (typeof AFFILIATE_PROMO_ANGLES)[number];
export type AffiliatePromoNiche = (typeof AFFILIATE_PROMO_NICHES)[number];
export type AffiliatePromoTone = (typeof AFFILIATE_PROMO_TONES)[number];

export const AFFILIATE_PROMO_LIMITS = { personalNote: 200, hashtags: 15, text: 2_000, variants: 2 } as const;

export type AffiliatePromoRequest = {
  platform: AffiliatePromoPlatform;
  angle: AffiliatePromoAngle;
  niche: AffiliatePromoNiche;
  tone: AffiliatePromoTone;
  referralCode: string;
  personalNote: string | null;
};

function enumValue<T extends readonly string[]>(values: T, input: unknown, label: string): T[number] {
  if (typeof input !== "string" || !(values as readonly string[]).includes(input)) throw new Error(`${label}_invalid`);
  return input as T[number];
}

function boundedText(input: unknown, label: string, max: number, required = false): string {
  if (input === undefined || input === null) { if (required) throw new Error(`${label}_required`); return ""; }
  if (typeof input !== "string") throw new Error(`${label}_invalid`);
  const trimmed = input.trim();
  if (required && !trimmed) throw new Error(`${label}_required`);
  if (trimmed.length > max) throw new Error(`${label}_too_long`);
  return trimmed;
}

export function parseAffiliatePromoRequest(input: unknown): AffiliatePromoRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("request_invalid");
  const record = input as Record<string, unknown>;
  const referralCode = boundedText(record.referralCode, "referral_code", 24, true);
  if (!/^[A-Za-z0-9]{4,24}$/.test(referralCode)) throw new Error("referral_code_invalid");
  const personalNoteRaw = record.personalNote === undefined ? null : boundedText(record.personalNote, "personal_note", AFFILIATE_PROMO_LIMITS.personalNote);
  return {
    platform: enumValue(AFFILIATE_PROMO_PLATFORMS, record.platform, "platform"),
    angle: enumValue(AFFILIATE_PROMO_ANGLES, record.angle, "angle"),
    niche: enumValue(AFFILIATE_PROMO_NICHES, record.niche, "niche"),
    tone: enumValue(AFFILIATE_PROMO_TONES, record.tone, "tone"),
    referralCode,
    personalNote: personalNoteRaw === "" ? null : personalNoteRaw,
  };
}

export type AffiliatePromoVariant = {
  hook: string;
  body: string;
  callToAction: string;
  hashtags: string[];
  audioSuggestion?: string;
};

export type AffiliatePromoApproval = { actorId: string; approvedAt: string; contentHash: string };

export type AffiliatePromoArtifact = {
  kind: "affiliate_promo";
  schemaVersion: 1;
  platform: AffiliatePromoPlatform;
  angle: AffiliatePromoAngle;
  niche: AffiliatePromoNiche;
  tone: AffiliatePromoTone;
  variants: AffiliatePromoVariant[];
  referralLink: string;
  disclosure: string;
  compliance: { referralPass: boolean; disclosurePass: boolean; forbiddenPass: boolean; checkedAt: string };
  personalNote: string | null;
  assumptions: string[];
  status: "draft" | "approved";
  revision: number;
  parentContentHash: string | null;
  approval: AffiliatePromoApproval | null;
  recipeVersion: typeof AFFILIATE_PROMO_RECIPE_VERSION;
  createdAt: string;
  updatedAt: string;
};

const ANGLE_COPY: Record<AffiliatePromoAngle, { problem: string; solution: string; proof: string }> = {
  blank_page: { problem: "nak tanya AI pun tak tahu nak mula", solution: "prompt siap guna — tinggal pilih sahaja", proof: "320 prompt Bahasa Melayu ikut industri" },
  generic_ai: { problem: "jawapan AI generic, tak faham konteks bisnes tempatan", solution: "profil bisnes isi sekali, AI guna konteks anda", proof: "auto-isi profil — isi sekali guna selamanya" },
  prompt_320: { problem: "cari prompt sesuai untuk industri sendiri pening", solution: "pustaka prompt BM khusus untuk PKS Malaysia", proof: "320 prompt merentas 10 kategori industri" },
  auto_isi: { problem: "setiap kali nak guna AI kena ulang maklumat kedai", solution: "Business Profile auto-isi setiap sesi", proof: "isi sekali, guna selamanya" },
  kalendar_30hari: { problem: "tak tahu nak post apa esok, lusa, minggu depan", solution: "Content Calendar + Marketing Plan 30 Hari", proof: "kandungan 30 hari dirancang, bukan teka-teki" },
  jimat_konsultan: { problem: "upah konsultan marketing RM5,000 ke RM15,000", solution: "pendamping AI berbayar bajet kecil setiap bulan", proof: "ada tier PERCUMA untuk mula cuba tanpa risiko" },
  usahawan_biasa: { problem: "rasa AI bukan untuk orang biasa macam saya", solution: "direka khusus untuk usahawan Malaysia, BM-first", proof: "usahawan tanpa latar teknikal pun boleh mula hari ini" },
};

const NICHE_EXAMPLE: Record<AffiliatePromoNiche, string> = {
  fnb: "kedai makan",
  retail: "kedai runcit",
  ecommerce: "jual online",
  servis: "perkhidmatan",
  kontraktor: "kontraktor",
  umum: "PKS",
};

const TONE_STYLE: Record<AffiliatePromoTone, { opener: string; closer: string }> = {
  mesra: { opener: "Tahukah anda", closer: "Jom cuba!" },
  profesional: { opener: "Perkara yang ramai usahawan hadapi", closer: "Mulakan hari ini." },
  lucu: { opener: "Cerita benar", closer: "Menarik, kan?" },
  bernas: { opener: "Fakta ringkas:", closer: "Tindakan sekarang." },
};

const PLATFORM_HASHTAGS: Record<AffiliatePromoPlatform, string[]> = {
  tiktok: ["#AI4Bisnes", "#PKSMalaysia", "#UsahawanMalaysia", "#AITanpaKod", "#BisnesOnline"],
  facebook: ["#AI4Bisnes", "#PKSMalaysia", "#PemasaranDigital"],
  instagram: ["#AI4Bisnes", "#PKSMalaysia", "#UsahawanMalaysia", "#PemasaranDigital", "#AIBisnes", "#BisnesOnline", "#StartupMalaysia", "#UsahawanBumiputra", "#SideHustle", "#DigitalMarketing", "#TeknologiMalaysia"],
};

function hookA(angle: AffiliatePromoAngle, tone: AffiliatePromoTone, niche: AffiliatePromoNiche): string {
  const copy = ANGLE_COPY[angle];
  return `${TONE_STYLE[tone].opener}: ramai pemilik ${NICHE_EXAMPLE[niche]} ${copy.problem}.`;
}

function hookB(angle: AffiliatePromoAngle, niche: AffiliatePromoNiche): string {
  const copy = ANGLE_COPY[angle];
  return `${copy.problem}? Jika anda mengurus ${NICHE_EXAMPLE[niche]}, ini untuk anda.`;
}

function bodyFor(request: AffiliatePromoRequest, variant: "A" | "B"): string {
  const copy = ANGLE_COPY[request.angle];
  const niche = NICHE_EXAMPLE[request.niche];
  const opener = variant === "A" ? `Sebab itu saya nak kongsi AI4Bisnes — ${copy.solution}.` : `AI4Bisnes buat kerja lebih mudah: ${copy.solution}.`;
  return `${opener} Sesuai untuk pemilik ${niche} yang mahu guna AI dalam kerja harian. Apa yang jelas: ${copy.proof}. Semua dalam Bahasa Melayu, ikut konteks bisnes Malaysia.`;
}

function ctaFor(request: AffiliatePromoRequest): string {
  return `${TONE_STYLE[request.tone].closer} Daftar percuma di pautan bio/link — tier PERCUMA ada untuk mula cuba.`;
}

export function buildDeterministicAffiliatePromo(input: { request: AffiliatePromoRequest; now: Date }): AffiliatePromoArtifact {
  const { request, now } = input;
  const timestamp = now.toISOString();
  const hashtags = PLATFORM_HASHTAGS[request.platform].slice(0, AFFILIATE_PROMO_LIMITS.hashtags);
  const variants: AffiliatePromoVariant[] = [
    { hook: hookA(request.angle, request.tone, request.niche), body: bodyFor(request, "A"), callToAction: ctaFor(request), hashtags, ...(request.platform === "tiktok" ? { audioSuggestion: "Audio trending bertema bisnes/produktiviti — pilih yang sedang viral di kawasan anda" } : {}) },
    { hook: hookB(request.angle, request.niche), body: bodyFor(request, "B"), callToAction: ctaFor(request), hashtags, ...(request.platform === "tiktok" ? { audioSuggestion: "Audio cerita/voiceover BM — gaya bercerita santai" } : {}) },
  ];
  const referralLink = `https://ai4bisnes.com/?ref=${request.referralCode}`;
  const disclosure = AFFILIATE_DISCLOSURE;
  const compliance = postCheckAffiliatePromo(renderText(variants, referralLink, disclosure), referralLink, now);
  if (!compliance.referralPass || !compliance.disclosurePass || !compliance.forbiddenPass) throw new Error("deterministic_template_compliance_failed");
  const assumptions = ["Gaya ayat mengikut template deterministic v1; tiada model AI dipanggil"];
  if (request.personalNote) assumptions.push("Nota peribadi disimpan tetapi tidak dicampur ke dalam ayat promosi");
  return {
    kind: "affiliate_promo", schemaVersion: 1,
    platform: request.platform, angle: request.angle, niche: request.niche, tone: request.tone,
    variants, referralLink, disclosure, compliance,
    personalNote: request.personalNote, assumptions,
    status: "draft", revision: 1, parentContentHash: null, approval: null,
    recipeVersion: AFFILIATE_PROMO_RECIPE_VERSION,
    createdAt: timestamp, updatedAt: timestamp,
  };
}

function renderText(variants: AffiliatePromoVariant[], referralLink: string, disclosure: string): string {
  return variants.map((variant) => `${variant.hook}\n${variant.body}\n${variant.callToAction}\n${referralLink}\n${variant.hashtags.join(" ")}\n${disclosure}`).join("\n\n");
}

export function renderAffiliatePromoText(artifact: AffiliatePromoArtifact): string {
  return renderText(artifact.variants, artifact.referralLink, artifact.disclosure);
}

type JsonRecord = Record<string, unknown>;
const HASH_RE = /^[a-f0-9]{64}$/i;
const REFERRAL_LINK_RE = /^https:\/\/ai4bisnes\.com\/\?ref=([A-Za-z0-9]{4,24})$/;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function parseVariant(value: unknown): AffiliatePromoVariant | null {
  if (!isRecord(value)) return null;
  const hook = typeof value.hook === "string" ? value.hook.trim() : "";
  const body = typeof value.body === "string" ? value.body.trim() : "";
  const callToAction = typeof value.callToAction === "string" ? value.callToAction.trim() : "";
  if (hook.length < 10 || hook.length > AFFILIATE_PROMO_LIMITS.text || body.length < 40 || body.length > AFFILIATE_PROMO_LIMITS.text || callToAction.length < 8 || callToAction.length > AFFILIATE_PROMO_LIMITS.text) return null;
  if (!Array.isArray(value.hashtags) || value.hashtags.length < 1 || value.hashtags.length > AFFILIATE_PROMO_LIMITS.hashtags) return null;
  const hashtags = value.hashtags.map((item) => typeof item === "string" ? item.trim() : "");
  if (hashtags.some((item) => !/^#[\p{L}\p{N}_]{1,49}$/u.test(item))) return null;
  if (value.audioSuggestion !== undefined && (typeof value.audioSuggestion !== "string" || !value.audioSuggestion.trim() || value.audioSuggestion.trim().length > AFFILIATE_PROMO_LIMITS.text)) return null;
  return { hook, body, callToAction, hashtags, ...(typeof value.audioSuggestion === "string" ? { audioSuggestion: value.audioSuggestion.trim() } : {}) };
}

export type AffiliatePromoValidation = { ok: true; artifact: AffiliatePromoArtifact } | { ok: false };

/** Strict storage-boundary parser. Any malformed or internally inconsistent row fails closed. */
export function validateAffiliatePromoArtifact(value: unknown): AffiliatePromoValidation {
  if (!isRecord(value) || value.kind !== "affiliate_promo" || value.schemaVersion !== 1 || value.recipeVersion !== AFFILIATE_PROMO_RECIPE_VERSION) return { ok: false };
  if (!(AFFILIATE_PROMO_PLATFORMS as readonly unknown[]).includes(value.platform) || !(AFFILIATE_PROMO_ANGLES as readonly unknown[]).includes(value.angle) || !(AFFILIATE_PROMO_NICHES as readonly unknown[]).includes(value.niche) || !(AFFILIATE_PROMO_TONES as readonly unknown[]).includes(value.tone)) return { ok: false };
  if (!Array.isArray(value.variants) || value.variants.length !== AFFILIATE_PROMO_LIMITS.variants) return { ok: false };
  const variants = value.variants.map(parseVariant);
  if (variants.some((item) => item === null)) return { ok: false };
  if (typeof value.referralLink !== "string" || !REFERRAL_LINK_RE.test(value.referralLink) || value.disclosure !== AFFILIATE_DISCLOSURE) return { ok: false };
  if (value.personalNote !== null && (typeof value.personalNote !== "string" || value.personalNote.length > AFFILIATE_PROMO_LIMITS.personalNote)) return { ok: false };
  if (!Array.isArray(value.assumptions) || value.assumptions.length > 5 || value.assumptions.some((item) => typeof item !== "string" || !item.trim() || item.length > AFFILIATE_PROMO_LIMITS.text)) return { ok: false };
  if ((value.status !== "draft" && value.status !== "approved") || !Number.isSafeInteger(value.revision) || Number(value.revision) < 1) return { ok: false };
  if (value.parentContentHash !== null && (typeof value.parentContentHash !== "string" || !HASH_RE.test(value.parentContentHash))) return { ok: false };
  if (!validTimestamp(value.createdAt) || !validTimestamp(value.updatedAt) || !isRecord(value.compliance) || !validTimestamp(value.compliance.checkedAt)) return { ok: false };
  if (value.compliance.referralPass !== true || value.compliance.disclosurePass !== true || value.compliance.forbiddenPass !== true) return { ok: false };
  if (value.status === "draft" && value.approval !== null) return { ok: false };
  if (value.status === "approved") {
    if (!isRecord(value.approval) || typeof value.approval.actorId !== "string" || !value.approval.actorId.trim() || value.approval.actorId.length > 128 || !validTimestamp(value.approval.approvedAt) || typeof value.approval.contentHash !== "string" || !HASH_RE.test(value.approval.contentHash)) return { ok: false };
  }
  const artifact = { ...value, variants } as AffiliatePromoArtifact;
  const rendered = renderAffiliatePromoText(artifact);
  const compliance = postCheckAffiliatePromo(rendered, artifact.referralLink, new Date(artifact.compliance.checkedAt));
  if (!compliance.referralPass || !compliance.disclosurePass || !compliance.forbiddenPass) return { ok: false };
  if (artifact.status === "approved" && artifact.approval?.contentHash !== sha256Hex(rendered)) return { ok: false };
  return { ok: true, artifact };
}

export function applyAffiliatePromoEdits(artifact: AffiliatePromoArtifact, edits: { variants?: unknown }, now: Date): AffiliatePromoArtifact {
  const current = validateAffiliatePromoArtifact(artifact);
  if (!current.ok) throw new Error("affiliate_promo_artifact_invalid");
  if (!Array.isArray(edits.variants) || edits.variants.length !== AFFILIATE_PROMO_LIMITS.variants) throw new Error("affiliate_promo_variants_invalid");
  const variants = edits.variants.map(parseVariant);
  if (variants.some((item) => item === null)) throw new Error("affiliate_promo_variants_invalid");
  const timestamp = now.toISOString();
  const reopened = artifact.status === "approved";
  const next = {
    ...artifact,
    variants: variants as AffiliatePromoVariant[],
    status: "draft" as const,
    revision: reopened ? artifact.revision + 1 : artifact.revision,
    parentContentHash: reopened ? artifact.approval!.contentHash : artifact.parentContentHash,
    approval: null,
    compliance: postCheckAffiliatePromo(renderText(variants as AffiliatePromoVariant[], artifact.referralLink, artifact.disclosure), artifact.referralLink, now),
    createdAt: reopened ? timestamp : artifact.createdAt,
    updatedAt: timestamp,
  };
  const validation = validateAffiliatePromoArtifact(next);
  if (!validation.ok) throw new Error("affiliate_promo_edit_compliance_failed");
  return validation.artifact;
}

export function approveAffiliatePromoArtifact(artifact: AffiliatePromoArtifact, actorId: string, now: Date): AffiliatePromoArtifact {
  const validation = validateAffiliatePromoArtifact(artifact);
  if (!validation.ok || artifact.status !== "draft" || artifact.approval !== null) throw new Error("affiliate_promo_draft_required");
  const cleanActor = actorId.trim();
  if (!cleanActor || cleanActor.length > 128) throw new Error("affiliate_promo_actor_invalid");
  const approvedAt = now.toISOString();
  const approved: AffiliatePromoArtifact = {
    ...validation.artifact,
    status: "approved",
    approval: { actorId: cleanActor, approvedAt, contentHash: sha256Hex(renderAffiliatePromoText(validation.artifact)) },
    updatedAt: approvedAt,
  };
  const approvedValidation = validateAffiliatePromoArtifact(approved);
  if (!approvedValidation.ok) throw new Error("affiliate_promo_approval_invalid");
  return approvedValidation.artifact;
}
