import { sha256Hex } from "../content-review/hash";
import {
  renderContentCreateDraft,
  validateContentCreateArtifact,
  type ContentCreateArtifactV1,
  type ContentCreateContentRole,
} from "../content-create/domain";
import type { GenerationTelemetry, SocialPostObjective, SocialPostPlatform } from "../native-social-post/domain";

export type { GenerationTelemetry };
export const PERFORMANCE_LEARNING_SCHEMA_VERSION = 1 as const;
export const PERFORMANCE_LEARNING_RECIPE_VERSION = "performance-learning-v1.0.0" as const;

/** The five fixed snapshot metrics. Nothing else may be asserted by the owner. */
export const PERFORMANCE_LEARNING_METRICS = ["impressions", "clicks", "saves", "shares", "leads"] as const;
export type PerformanceLearningMetricName = (typeof PERFORMANCE_LEARNING_METRICS)[number];
export type PerformanceLearningMetrics = Readonly<Record<PerformanceLearningMetricName, number>>;

export const PERFORMANCE_LEARNING_WINDOW_DAYS = [7, 14, 30] as const;
export type PerformanceLearningWindowDays = (typeof PERFORMANCE_LEARNING_WINDOW_DAYS)[number];

/**
 * Deterministic rubric labels. `insufficient_signal` is exclusive: when
 * impressions < 100 it is the ONLY possible diagnosis (spec §3).
 */
export const PERFORMANCE_LEARNING_BOTTLENECKS = ["low_reach", "weak_hook", "weak_engagement", "weak_conversion", "insufficient_signal"] as const;
export type PerformanceLearningBottleneck = (typeof PERFORMANCE_LEARNING_BOTTLENECKS)[number];

/** Confidence from a single owner-asserted snapshot can never be `high` (spec §4). */
export const PERFORMANCE_LEARNING_CONFIDENCES = ["low", "medium"] as const;
export type PerformanceLearningConfidence = (typeof PERFORMANCE_LEARNING_CONFIDENCES)[number];

export const SNAPSHOT_NOTE_MAX = 300;
export const IMPRESSIONS_CAP = 10_000_000;

/**
 * Deterministic rubric thresholds (documented, frozen for v1).
 *
 * Rationale: rates are owner-asserted ratios over a single window. These
 * cut-offs are deliberately conservative so a diagnosis is only emitted when
 * the gap between observed rate and threshold is large enough to be visible
 * despite small-sample noise. They are house constants — NOT external
 * benchmarks; no comparison with outside data ever happens (spec §3).
 *
 *  - insufficient_signal: impressions < 100 → the only diagnosis (guard first)
 *  - low_reach:           impressions < 500 → not enough distribution to judge
 *                         anything else, reach is the constraint
 *  - weak_hook:           CTR = clicks/impressions < 3% — the hook fails to
 *                         convert views into interest
 *  - weak_engagement:     (saves + shares)/impressions < 1% — content is seen
 *                         and clicked but not worth keeping or sharing
 *  - weak_conversion:     leads/clicks < 2% — clicks happen but the bridge to
 *                         the offer does not convert
 *
 * When ALL rates pass (no failure), one label is still required by contract;
 * the rate closest to its threshold (smallest rate/threshold ratio, fixed
 * tie-break order hook → engagement → conversion) is reported with `medium`
 * confidence, because it is the weakest link worth the next experiment.
 * Ties resolve in the fixed funnel order reach → hook → engagement →
 * conversion, so exactly one primary bottleneck is always returned.
 */
export const RUBRIC = {
  insufficientSignalImpressions: 100,
  lowReachImpressions: 500,
  weakHookCtr: 0.03,
  weakEngagementRate: 0.01,
  weakConversionLeadRate: 0.02,
} as const;

export type PerformanceLearningRequestV1 = {
  entry: "from_content_create";
  sourceContentCreateId: number;
  metrics: PerformanceLearningMetrics;
  platformWindowDays: PerformanceLearningWindowDays;
  snapshotNote: string;
};

/** Protected snapshot of the approved CE-4 source (any platform). */
export type ApprovedPerformanceSourceSnapshotV1 = Readonly<{
  id: number;
  sourceOfferId: number;
  platform: SocialPostPlatform;
  objective: SocialPostObjective;
  contentRole: ContentCreateContentRole;
  audience: string;
  coreThesis: string;
  coreMessage: string;
  callToAction: string;
  draftHook: string;
  draftBody: string;
  draftCallToAction: string;
  hashtags: string[];
  promiseCeiling: string;
  approvalContentHash: string;
  sourceContentHash: string;
}>;

export type DerivedRatesV1 = {
  ctrClicksPerImpressions: number;
  saveRatePerImpressions: number;
  shareRatePerImpressions: number;
  engagementRatePerImpressions: number;
  leadRatePerClick: number;
};

export type StrategyReferenceV1 = {
  platform: string;
  objective: string;
  contentRole: string;
  promiseCeiling: string;
};

export type DiagnosisV1 = {
  bottleneck: PerformanceLearningBottleneck;
  secondaryBottlenecks: [];
  confidence: PerformanceLearningConfidence;
  derivedRates: DerivedRatesV1;
  strategyReference: StrategyReferenceV1;
  hypothesisNote: string;
};

export type LearningV1 = {
  bottleneck: PerformanceLearningBottleneck;
  patternObserved: string;
  hypothesisNext: string;
  confidence: PerformanceLearningConfidence;
};

export type NextBestContentV1 = {
  format: string;
  intent: string;
  role: string;
  reason: string;
  generatorHint: string;
  promiseCeiling: string;
};

export type SnapshotFencingV1 = {
  untrusted: true;
  verified: false;
  flaggedPatterns: string[];
};

export type PerformanceLearningApprovalV1 = {
  actorId: string;
  approvedAt: string;
  contentHash: string;
  approvalScope: "performance_learning_report";
};

export type PerformanceLearningArtifactV1 = {
  schemaVersion: typeof PERFORMANCE_LEARNING_SCHEMA_VERSION;
  kind: "performance_learning";
  status: "draft" | "approved";
  entry: "from_content_create";
  sourceContentCreateId: number;
  sourceSnapshot: ApprovedPerformanceSourceSnapshotV1;
  /** Owner-asserted metrics. Immutable after generation (spec §6). */
  metrics: PerformanceLearningMetrics;
  platformWindowDays: PerformanceLearningWindowDays;
  snapshotNote: string;
  snapshotNoteFenced: boolean;
  snapshotFencing: SnapshotFencingV1;
  diagnosis: DiagnosisV1;
  learning: LearningV1;
  nextBestContent: NextBestContentV1;
  promiseCeiling: string;
  revision: number;
  parentContentHash: string | null;
  approval: PerformanceLearningApprovalV1 | null;
  recipeVersion: typeof PERFORMANCE_LEARNING_RECIPE_VERSION;
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
function bounded(value: unknown, min: number, max: number) { return typeof value === "string" && value.trim().length >= min && value.length <= max; }
function numericEnumValue<const T extends readonly number[]>(value: unknown, allowed: T, message: string): T[number] {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || !allowed.includes(value as T[number])) throw new Error(message);
  return value as T[number];
}
function record(value: unknown): JsonRecord | null { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null; }

/**
 * Untrusted-note fencing. The snapshot note is owner free text; it may contain
 * result claims or prompt-injection attempts. It is NEVER parsed as
 * instructions, never promoted into diagnosis/NBC, and only surfaced verbatim
 * inside an explicit "untrusted" frame in renders.
 */
const SNAPSHOT_NOTE_FLAG_PATTERNS: Array<[string, RegExp]> = [
  ["result_claim", /jualan\s+(?:naik|meningkat|meletup)|(?:meningkat|naik|henti)\s+.{0,20}?\d+\s*%|\d+\s*%\s*(?:lebih|naik)?\s*(?:jualan|pelanggan|hasil|jualan)?|(?:meningkat|naik)\s+\d+\s*(?:%|peratus)|kali\s+ganda|pasti\s+berhasil|jamin|dijamin|guarantee/i],
  ["testimonial", /testimoni|testimonial|pelanggan\s+(?:kata|berkata|sudah\s+beli)|puan\s+[a-z]+|quote\s+pelanggan/i],
  ["injection", /abaikan\s+(?:arahan|segala)|ignore\s+(?:all|previous)|luluskan\s+.*(?:automatik|sendiri)|api[_\s-]?key|service[_\s-]?role|system\s*prompt/i],
  ["urgency", /tinggal\s+\w+\s+slot|slot\s+(?:sahaja|tinggal)|tamat\s+malam(?:\s+ini)?|stok\s+terhad|segera\s+belum\s+terlewat|scarcity/i],
];

function fenceSnapshotNote(note: string): SnapshotFencingV1 {
  const flagged = SNAPSHOT_NOTE_FLAG_PATTERNS.filter(([, pattern]) => pattern.test(note)).map(([label]) => label);
  return { untrusted: true, verified: false, flaggedPatterns: flagged };
}

function metricInteger(value: unknown, name: PerformanceLearningMetricName): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`Metrik ${name} tidak sah.`);
  if (name === "impressions" && value > IMPRESSIONS_CAP) throw new Error(`Metrik ${name} melebihi had ${IMPRESSIONS_CAP}.`);
  return value;
}

function parseMetrics(value: unknown): PerformanceLearningMetrics {
  const input = record(value);
  if (!input) throw new Error("Snapshot metrik tidak sah.");
  const metrics = {} as Record<PerformanceLearningMetricName, number>;
  const keys = Object.keys(input);
  if (keys.length !== PERFORMANCE_LEARNING_METRICS.length || !PERFORMANCE_LEARNING_METRICS.every((name) => keys.includes(name))) throw new Error("Snapshot metrik mesti lima medan tetap.");
  for (const name of PERFORMANCE_LEARNING_METRICS) metrics[name] = metricInteger(input[name], name);
  const { impressions, clicks, saves, shares, leads } = metrics;
  if (impressions > 0 && clicks > impressions) throw new Error("Metrik tidak konsisten: clicks melebihi impressions.");
  if (impressions > 0 && saves > impressions) throw new Error("Metrik tidak konsisten: saves melebihi impressions.");
  if (impressions > 0 && shares > impressions) throw new Error("Metrik tidak konsisten: shares melebihi impressions.");
  if (leads > clicks) throw new Error("Metrik tidak konsisten: leads melebihi clicks.");
  return Object.freeze(metrics);
}

export function parsePerformanceLearningRequest(value: unknown): PerformanceLearningRequestV1 {
  const input = record(value);
  if (!input) throw new Error("Data permintaan tidak sah.");
  if (input.entry !== "from_content_create") throw new Error("Jenis entri tidak disokong.");
  const sourceContentCreateId = Number(input.sourceContentCreateId ?? input.source_content_create_id);
  if (!Number.isSafeInteger(sourceContentCreateId) || sourceContentCreateId < 1) throw new Error("Content sumber tidak sah.");
  const windowDays = numericEnumValue(input.platformWindowDays ?? input.platform_window_days, PERFORMANCE_LEARNING_WINDOW_DAYS, "Tetingkap platform tidak sah (7/14/30 hari).");
  const noteRaw = input.snapshotNote ?? input.snapshot_note;
  if (noteRaw !== undefined && noteRaw !== null && typeof noteRaw !== "string") throw new Error("Nota snapshot tidak sah.");
  const snapshotNote = noteRaw === undefined || noteRaw === null ? "" : noteRaw.trim();
  if (snapshotNote.length > SNAPSHOT_NOTE_MAX) throw new Error(`Nota snapshot melebihi ${SNAPSHOT_NOTE_MAX} aksara.`);
  return {
    entry: "from_content_create",
    sourceContentCreateId,
    metrics: parseMetrics(input.metrics),
    platformWindowDays: windowDays,
    snapshotNote,
  };
}

function sourcePromiseCeiling(artifact: ContentCreateArtifactV1) {
  // Mirror CE-5 promise ceiling derivation: strongest KEEP claim wording
  // ceiling, else the strategy core message. Never invented.
  return clip(artifact.claimLedger.find((claim) => claim.action === "KEEP")?.allowedWordingCeiling || artifact.strategy.coreMessage, 500);
}

export function buildApprovedPerformanceSourceSnapshot(input: { id: number; artifact: ContentCreateArtifactV1 }): ApprovedPerformanceSourceSnapshotV1 {
  if (!Number.isSafeInteger(input.id) || input.id < 1) throw new Error("Approved Content id tidak sah.");
  const validation = validateContentCreateArtifact(input.artifact);
  if (!validation.ok || input.artifact.kind !== "content_create" || input.artifact.status !== "approved" || !input.artifact.approval) throw new Error("Approved Content diperlukan.");
  const sourceContentHash = sha256Hex(renderContentCreateDraft(input.artifact.draft));
  if (sourceContentHash !== input.artifact.approval.contentHash) throw new Error("Approval Content tidak sah.");
  return Object.freeze({
    id: input.id,
    sourceOfferId: input.artifact.sourceOfferId,
    platform: input.artifact.platform,
    objective: input.artifact.objective,
    contentRole: input.artifact.strategy.contentRole,
    audience: clip(input.artifact.strategy.audience, 500),
    coreThesis: clip(input.artifact.strategy.coreThesis, 500),
    coreMessage: clip(input.artifact.strategy.coreMessage, 500),
    callToAction: clip(input.artifact.strategy.callToAction, 500),
    draftHook: clip(input.artifact.draft.hook, 500),
    draftBody: input.artifact.draft.body.slice(0, 5000),
    draftCallToAction: clip(input.artifact.draft.callToAction, 500),
    hashtags: Object.freeze([...input.artifact.draft.hashtags]) as unknown as string[],
    promiseCeiling: sourcePromiseCeiling(input.artifact),
    approvalContentHash: input.artifact.approval.contentHash,
    sourceContentHash,
  });
}

export function renderPerformanceSourceText(snapshot: ApprovedPerformanceSourceSnapshotV1) {
  return [snapshot.draftHook, snapshot.draftBody, snapshot.draftCallToAction, snapshot.hashtags.join(" ")].filter(Boolean).join("\n\n");
}

function rate(numerator: number, denominator: number) { return denominator > 0 ? numerator / denominator : 0; }
function percent(value: number) { return `${(value * 100).toFixed(2)}%`; }

function deriveRates(metrics: PerformanceLearningMetrics): DerivedRatesV1 {
  return {
    ctrClicksPerImpressions: rate(metrics.clicks, metrics.impressions),
    saveRatePerImpressions: rate(metrics.saves, metrics.impressions),
    shareRatePerImpressions: rate(metrics.shares, metrics.impressions),
    engagementRatePerImpressions: rate(metrics.saves + metrics.shares, metrics.impressions),
    leadRatePerClick: rate(metrics.leads, metrics.clicks),
  };
}

/**
 * Deterministic diagnosis. Order matters (documented in RUBRIC): guard →
 * reach → hook → engagement → conversion. Exactly one primary bottleneck is
 * ever returned; `secondaryBottlenecks` is always empty by contract.
 */
function diagnose(metrics: PerformanceLearningMetrics): { bottleneck: PerformanceLearningBottleneck; confidence: PerformanceLearningConfidence; hypothesisNote: string } {
  const rates = deriveRates(metrics);
  if (metrics.impressions < RUBRIC.insufficientSignalImpressions) {
    // Exclusive guard: no other diagnosis may be emitted below 100 impressions.
    return { bottleneck: "insufficient_signal", confidence: "low", hypothesisNote: "" };
  }
  if (metrics.impressions < RUBRIC.lowReachImpressions) {
    return { bottleneck: "low_reach", confidence: "low", hypothesisNote: `Jangkauan ${metrics.impressions} impr semasa ${percent(rates.ctrClicksPerImpressions)} CTR; pastikan posting konsisten sebelum menilai elemen lain.` };
  }
  if (rates.ctrClicksPerImpressions < RUBRIC.weakHookCtr) {
    return { bottleneck: "weak_hook", confidence: "low", hypothesisNote: `CTR ${percent(rates.ctrClicksPerImpressions)} di bawah ambang ${percent(RUBRIC.weakHookCtr)}; uji semula hook 3 saat pertama.` };
  }
  if (rates.engagementRatePerImpressions < RUBRIC.weakEngagementRate) {
    return { bottleneck: "weak_engagement", confidence: "low", hypothesisNote: `Save + share ${percent(rates.engagementRatePerImpressions)} di bawah ambang ${percent(RUBRIC.weakEngagementRate)}; tambah nilai yang layak disimpan.` };
  }
  if (rates.leadRatePerClick < RUBRIC.weakConversionLeadRate) {
    return { bottleneck: "weak_conversion", confidence: "low", hypothesisNote: `Kadar lead ${percent(rates.leadRatePerClick)} setiap klik di bawah ambang ${percent(RUBRIC.weakConversionLeadRate)}; semak keselarasan CTA dengan tawaran.` };
  }
  // All rates pass the conservative v1 thresholds: report the weakest link
  // (rate closest to its threshold) with `medium` confidence. A single
  // healthy owner-asserted snapshot still cannot justify `high`.
  const ratios: Array<[PerformanceLearningBottleneck, number]> = [
    ["weak_hook", rates.ctrClicksPerImpressions / RUBRIC.weakHookCtr],
    ["weak_engagement", rates.engagementRatePerImpressions / RUBRIC.weakEngagementRate],
    ["weak_conversion", rates.leadRatePerClick / RUBRIC.weakConversionLeadRate],
  ];
  const weakest = ratios.reduce((best, current) => (current[1] < best[1] ? current : best), ratios[0])[0];
  return { bottleneck: weakest, confidence: "medium", hypothesisNote: `Semua kadar melewati ambang konservatif v1 (CTR ${percent(rates.ctrClicksPerImpressions)}, engagement ${percent(rates.engagementRatePerImpressions)}, lead ${percent(rates.leadRatePerClick)}); ${weakest === "weak_hook" ? "CTR" : weakest === "weak_engagement" ? "engagement" : "kadar lead"} paling hampir dengan ambang — sambut eksperimen seterusnya di sana.` };
}

/** Literal observation text: raw snapshot counts only, never derived percentages. */
function patternObservedText(metrics: PerformanceLearningMetrics, windowDays: number) {
  return `Dalam ${windowDays} hari: ${metrics.impressions} impressions, ${metrics.clicks} clicks, ${metrics.saves} saves, ${metrics.shares} shares, ${metrics.leads} leads.`;
}

/**
 * Exactly one hypothesis per artifact. The hypothesis is always an experiment
 * suggestion tied to the diagnosed bottleneck; it never asserts outcomes.
 */
function hypothesisFor(bottleneck: PerformanceLearningBottleneck, snapshot: ApprovedPerformanceSourceSnapshotV1, rates: DerivedRatesV1): string {
  switch (bottleneck) {
    case "low_reach":
      return `Eksperimen tunggal seterusnya: jadualkan semula content yang sama pada 2 masa tayang berbeza untuk ${snapshot.audience}, bandingkan impressions selepas 7 hari.`;
    case "weak_hook":
      return `Eksperimen tunggal seterusnya: tulis 3 variasi hook 3 saat pertama yang menyatakan masalah ${snapshot.audience} secara spesifik (CTR sekarang ${percent(rates.ctrClicksPerImpressions)}), simpan body yang sama.`;
    case "weak_engagement":
      return `Eksperimen tunggal seterusnya: tambah satu senarai semak atau langkah bernombor yang layak disimpan oleh ${snapshot.audience}, kekal dalam promise ceiling sumber.`;
    case "weak_conversion":
      return `Eksperimen tunggal seterusnya: selaraskan CTA dengan butiran tawaran sebenar (${clip(snapshot.callToAction, 120)}), uji satu frasa jambatan sahaja.`;
    case "insufficient_signal":
      return "Belum cukup isyarat untuk hipotesis. Kumpulkan lebih banyak impressions (minima 100) dalam tetingkap baharu sebelum diagnosis.";
  }
}

/** Text-only Next Best Content. No new claims; ceiling inherited from source. */
function nextBestContent(bottleneck: PerformanceLearningBottleneck, snapshot: ApprovedPerformanceSourceSnapshotV1): NextBestContentV1 {
  const table: Record<PerformanceLearningBottleneck, Omit<NextBestContentV1, "promiseCeiling">> = {
    low_reach: {
      format: "Short video pada masa tayang baharu",
      intent: "awareness",
      role: "attract",
      reason: "low_reach: jangkauan belum cukup untuk menilai hook; perluaskan distribusi dahulu pada audience yang sama.",
      generatorHint: "Hint: guna penjana Bina Content untuk menulis variasi baharu — tiada auto-jana di sini.",
    },
    weak_hook: {
      format: "Short video dengan hook baharu",
      intent: snapshot.objective === "awareness" ? "awareness" : "engagement",
      role: "attract",
      reason: "weak_hook: 3 saat pertama tidak menukar views kepada klik; uji sudut masalah yang lebih spesifik.",
      generatorHint: "Hint: guna penjana Bina Content untuk menulis variasi hook — tiada auto-jana di sini.",
    },
    weak_engagement: {
      format: "Carousel senarai semak",
      intent: "education",
      role: "educate",
      reason: "weak_engagement: content dilihat tetapi tidak disimpan; format bernilai-simpan lebih sesuai untuk audience ini.",
      generatorHint: "Hint: guna penjana Bina Content untuk mengarang senarai semak — tiada auto-jana di sini.",
    },
    weak_conversion: {
      format: "Static post dengan jambatan tawaran",
      intent: "sales",
      role: "convert",
      reason: "weak_conversion: klik tidak menjadi lead; selaraskan mesej dengan butiran tawaran sebenar.",
      generatorHint: "Hint: guna penjana Bina Content untuk menulis jambatan tawaran — tiada auto-jana di sini.",
    },
    insufficient_signal: {
      format: "Ulang siar content sedia ada",
      intent: "awareness",
      role: "attract",
      reason: "insufficient_signal: data belum cukup; fokus pada jangkauan sebelum menilai elemen lain.",
      generatorHint: "Hint: guna penjana Bina Content apabila isyarat cukup — tiada auto-jana di sini.",
    },
  };
  return { ...table[bottleneck], promiseCeiling: snapshot.promiseCeiling };
}

export function buildDeterministicPerformanceLearning(input: { request: PerformanceLearningRequestV1; sourceSnapshot: ApprovedPerformanceSourceSnapshotV1; now: Date }): PerformanceLearningArtifactV1 {
  if (input.request.sourceContentCreateId !== input.sourceSnapshot.id) throw new Error("Content sumber tidak sepadan.");
  if (!HASH_RE.test(input.sourceSnapshot.sourceContentHash) || input.sourceSnapshot.approvalContentHash !== input.sourceSnapshot.sourceContentHash) throw new Error("Hash Approved Content tidak sah.");
  const timestamp = input.now.toISOString();
  const rates = deriveRates(input.request.metrics);
  const { bottleneck, confidence, hypothesisNote } = diagnose(input.request.metrics);
  const fencing = fenceSnapshotNote(input.request.snapshotNote);
  const artifact: PerformanceLearningArtifactV1 = {
    schemaVersion: PERFORMANCE_LEARNING_SCHEMA_VERSION,
    kind: "performance_learning",
    status: "draft",
    entry: "from_content_create",
    sourceContentCreateId: input.sourceSnapshot.id,
    sourceSnapshot: input.sourceSnapshot,
    metrics: input.request.metrics,
    platformWindowDays: input.request.platformWindowDays,
    snapshotNote: input.request.snapshotNote,
    snapshotNoteFenced: fencing.flaggedPatterns.length > 0,
    snapshotFencing: fencing,
    diagnosis: {
      bottleneck,
      secondaryBottlenecks: [],
      confidence,
      derivedRates: rates,
      strategyReference: {
        platform: input.sourceSnapshot.platform,
        objective: input.sourceSnapshot.objective,
        contentRole: input.sourceSnapshot.contentRole,
        promiseCeiling: input.sourceSnapshot.promiseCeiling,
      },
      hypothesisNote,
    },
    learning: {
      bottleneck,
      patternObserved: patternObservedText(input.request.metrics, input.request.platformWindowDays),
      hypothesisNext: hypothesisFor(bottleneck, input.sourceSnapshot, rates),
      confidence,
    },
    nextBestContent: nextBestContent(bottleneck, input.sourceSnapshot),
    promiseCeiling: input.sourceSnapshot.promiseCeiling,
    revision: 1,
    parentContentHash: null,
    approval: null,
    recipeVersion: PERFORMANCE_LEARNING_RECIPE_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const validation = validatePerformanceLearningArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}

function validMetricValue(value: unknown) { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= IMPRESSIONS_CAP; }

function validateMetrics(value: unknown): value is PerformanceLearningMetrics {
  const item = record(value);
  if (!item) return false;
  return PERFORMANCE_LEARNING_METRICS.every((name) => validMetricValue(item[name]));
}

function validateSourceSnapshot(value: unknown): boolean {
  const item = record(value);
  if (!item || !Number.isSafeInteger(Number(item.id)) || Number(item.id) < 1) return false;
  if (!HASH_RE.test(String(item.sourceContentHash)) || item.sourceContentHash !== item.approvalContentHash) return false;
  return ["platform", "objective", "contentRole", "audience", "coreThesis", "coreMessage", "callToAction", "draftHook", "draftBody", "draftCallToAction", "promiseCeiling"].every((key) => bounded(item[key], 1, 5000));
}

function validateDiagnosis(value: unknown, errors: string[], artifact: JsonRecord): void {
  const item = record(value);
  if (!item) { errors.push("Diagnosis tidak sah."); return; }
  if (!PERFORMANCE_LEARNING_BOTTLENECKS.includes(item.bottleneck as PerformanceLearningBottleneck)) errors.push("Bottleneck diagnosis tidak sah.");
  if (!Array.isArray(item.secondaryBottlenecks) || item.secondaryBottlenecks.length !== 0) errors.push("Diagnosis sekunder tidak dibenarkan; satu bottleneck utama sahaja.");
  if (!PERFORMANCE_LEARNING_CONFIDENCES.includes(item.confidence as PerformanceLearningConfidence)) errors.push("Keyakinan diagnosis tidak sah.");
  if (item.confidence === "high") errors.push("Keyakinan tidak boleh high daripada satu snapshot.");
  const rates = record(item.derivedRates);
  if (!rates || !["ctrClicksPerImpressions", "saveRatePerImpressions", "shareRatePerImpressions", "engagementRatePerImpressions", "leadRatePerClick"].every((key) => typeof rates[key] === "number" && Number.isFinite(rates[key]) && rates[key] >= 0 && rates[key] <= 2)) errors.push("Derived rates tidak sah.");
  const reference = record(item.strategyReference);
  if (!reference || !["platform", "objective", "contentRole", "promiseCeiling"].every((key) => bounded(reference[key], 1, 500))) errors.push("Rujukan strategi tidak sah.");
  if (typeof item.hypothesisNote !== "string" || item.hypothesisNote.length > 500) errors.push("Nota hipotesis tidak sah.");
  // insufficient_signal exclusivity: hypothesisNote must be empty (guard only)
  if (item.bottleneck === "insufficient_signal" && item.hypothesisNote !== "") errors.push("insufficient_signal tidak boleh mempunyai nota hipotesis.");
  // Rates must be derivable from the frozen snapshot (no invented numbers)
  const metrics = record(artifact.metrics);
  if (metrics && rates) {
    const ctr = Number(rates.ctrClicksPerImpressions);
    const engagement = Number(rates.engagementRatePerImpressions);
    const lead = Number(rates.leadRatePerClick);
    const impressions = Number(metrics.impressions);
    const clicks = Number(metrics.clicks);
    const saves = Number(metrics.saves);
    const shares = Number(metrics.shares);
    const leads = Number(metrics.leads);
    if (Math.abs(ctr - (impressions > 0 ? clicks / impressions : 0)) > 1e-9
      || Math.abs(engagement - (impressions > 0 ? (saves + shares) / impressions : 0)) > 1e-9
      || Math.abs(lead - (clicks > 0 ? leads / clicks : 0)) > 1e-9) errors.push("Derived rates tidak sepadan dengan metrik snapshot.");
  }
}

function validateLearning(value: unknown, errors: string[], diagnosis: JsonRecord | null): void {
  const item = record(value);
  if (!item) { errors.push("Learning tidak sah."); return; }
  if (!PERFORMANCE_LEARNING_BOTTLENECKS.includes(item.bottleneck as PerformanceLearningBottleneck)) errors.push("Bottleneck learning tidak sah.");
  if (diagnosis && item.bottleneck !== diagnosis.bottleneck) errors.push("Learning dan diagnosis mesti bottleneck yang sama.");
  if (!bounded(item.patternObserved, 1, 1000) || !bounded(item.hypothesisNext, 1, 1000)) errors.push("Teks learning tidak sah.");
  if (!PERFORMANCE_LEARNING_CONFIDENCES.includes(item.confidence as PerformanceLearningConfidence) || item.confidence === "high") errors.push("Keyakinan learning tidak sah.");
  // exactly one hypothesis: patternObserved and hypothesisNext are single literals
  const learningKeys = Object.keys(item).sort();
  if (JSON.stringify(learningKeys) !== JSON.stringify(["bottleneck", "confidence", "hypothesisNext", "patternObserved"])) errors.push("Struktur learning tidak sah (satu hipotesis sahaja).");
}

const UNSAFE_NBC = /jamin|guarantee|\d+\s*%|jualan\s+(?:naik|meningkat|meletup)|testimoni|testimonial|harga baharu|diskaun|tinggal|slot|segera|terhad|kali ganda/i;

function validateNextBestContent(value: unknown, errors: string[], promiseCeiling: string): void {
  const item = record(value);
  if (!item) { errors.push("Next Best Content tidak sah."); return; }
  if (!["format", "intent", "role", "reason", "generatorHint", "promiseCeiling"].every((key) => bounded(item[key], 1, 500))) errors.push("Medan Next Best Content tidak sah.");
  if (item.promiseCeiling !== promiseCeiling) errors.push("Promise ceiling NBC mesti mewarisi sumber.");
  const text = JSON.stringify(item);
  if (UNSAFE_NBC.test(text)) errors.push("NBC tidak boleh mengandungi claim baharu, harga, urgency atau testimonial.");
  if (/http|href/i.test(String(item.generatorHint))) errors.push("Generator hint mesti teks sahaja.");
}

export function validatePerformanceLearningArtifact(value: unknown): { ok: true; artifact: PerformanceLearningArtifactV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const item = record(value);
  if (!item) return { ok: false, errors: ["Artifact mesti objek."] };
  if (item.schemaVersion !== PERFORMANCE_LEARNING_SCHEMA_VERSION || item.kind !== "performance_learning" || item.entry !== "from_content_create") errors.push("Kontrak artifact tidak sah.");
  if (!["draft", "approved"].includes(String(item.status))) errors.push("Status artifact tidak sah.");
  if (!Number.isSafeInteger(Number(item.sourceContentCreateId)) || Number(item.sourceContentCreateId) < 1 || !validateSourceSnapshot(item.sourceSnapshot) || Number((item.sourceSnapshot as JsonRecord | undefined)?.id) !== Number(item.sourceContentCreateId)) errors.push("Approved Content snapshot tidak sah.");
  if (!validateMetrics(item.metrics)) errors.push("Metrik snapshot tidak sah atau tidak lengkap.");
  else {
    const metrics = item.metrics as PerformanceLearningMetrics;
    if ((metrics.impressions > 0 && (metrics.clicks > metrics.impressions || metrics.saves > metrics.impressions || metrics.shares > metrics.impressions)) || metrics.leads > metrics.clicks) errors.push("Metrik snapshot tidak konsisten.");
  }
  if (!PERFORMANCE_LEARNING_WINDOW_DAYS.includes(item.platformWindowDays as PerformanceLearningWindowDays)) errors.push("Tetingkap platform tidak sah.");
  if (typeof item.snapshotNote !== "string" || item.snapshotNote.length > SNAPSHOT_NOTE_MAX) errors.push("Nota snapshot tidak sah.");
  const fencing = record(item.snapshotFencing);
  if (!fencing || fencing.untrusted !== true || fencing.verified !== false || !Array.isArray(fencing.flaggedPatterns) || fencing.flaggedPatterns.length > SNAPSHOT_NOTE_FLAG_PATTERNS.length) errors.push("Fencing nota snapshot tidak sah.");
  else if ((fencing.flaggedPatterns.length > 0) !== Boolean(item.snapshotNoteFenced)) errors.push("Penanda fencing nota tidak konsisten.");
  else if (item.snapshotNote && !fencing.flaggedPatterns.every((label) => SNAPSHOT_NOTE_FLAG_PATTERNS.some(([name]) => name === label))) errors.push("Corak fencing tidak dikenali.");
  else if (item.snapshotNote && fencing.flaggedPatterns.length !== SNAPSHOT_NOTE_FLAG_PATTERNS.filter(([, pattern]) => pattern.test(String(item.snapshotNote))).length) errors.push("Fencing tidak sepadan dengan nota.");
  const diagnosis = record(item.diagnosis);
  validateDiagnosis(item.diagnosis, errors, item);
  validateLearning(item.learning, errors, diagnosis);
  if (!bounded(item.promiseCeiling, 1, 500) || (diagnosis && item.promiseCeiling !== (record(diagnosis.strategyReference) as JsonRecord | null)?.promiseCeiling)) errors.push("Promise ceiling tidak sah atau tidak sepadan.");
  validateNextBestContent(item.nextBestContent, errors, String(item.promiseCeiling ?? ""));
  // Cross-check diagnosis against frozen metrics (deterministic rubric re-run)
  if (!errors.length && validateMetrics(item.metrics)) {
    const replay = diagnose(item.metrics as PerformanceLearningMetrics);
    if (replay.bottleneck !== (item.diagnosis as JsonRecord | undefined)?.bottleneck || replay.confidence !== (item.diagnosis as JsonRecord | undefined)?.confidence) errors.push("Diagnosis tidak deterministik dengan metrik.");
    const learning = record(item.learning);
    if (learning && replay.bottleneck !== learning.bottleneck) errors.push("Learning tidak selari dengan rubrik.");
    const nbc = record(item.nextBestContent);
    if (nbc && replay.bottleneck === "low_reach" && !String(nbc.reason).startsWith("low_reach")) errors.push("NBC tidak selari dengan rubrik.");
    if (nbc && replay.bottleneck === "weak_engagement" && !String(nbc.reason).startsWith("weak_engagement")) errors.push("NBC tidak selari dengan rubrik.");
    if (nbc && replay.bottleneck === "weak_conversion" && !String(nbc.reason).startsWith("weak_conversion")) errors.push("NBC tidak selari dengan rubrik.");
    if (nbc && replay.bottleneck === "insufficient_signal" && !String(nbc.reason).startsWith("insufficient_signal")) errors.push("NBC tidak selari dengan rubrik.");
  }
  if (!Number.isSafeInteger(Number(item.revision)) || Number(item.revision) < 1 || (item.parentContentHash !== null && !HASH_RE.test(String(item.parentContentHash)))) errors.push("Revision tidak sah.");
  if (item.status === "approved") {
    const approval = record(item.approval);
    if (!approval || !bounded(approval.actorId, 1, 200) || !bounded(approval.approvedAt, 1, 40) || !HASH_RE.test(String(approval.contentHash)) || approval.approvalScope !== "performance_learning_report") errors.push("Approval tidak sah.");
  } else if (item.approval !== null) errors.push("Draf tidak boleh mempunyai approval.");
  if (item.recipeVersion !== PERFORMANCE_LEARNING_RECIPE_VERSION || !bounded(item.createdAt, 1, 40) || !bounded(item.updatedAt, 1, 40)) errors.push("Metadata artifact tidak sah.");
  return errors.length ? { ok: false, errors } : { ok: true, artifact: item as unknown as PerformanceLearningArtifactV1 };
}

/**
 * Pre-approval edits: ONLY `snapshotNote` may change. Metrics are immutable
 * after generation; any attempt to mutate them (or any other protected
 * field) is rejected. On an approved artifact this creates a reopened DRAFT
 * revision carrying the parent approval hash.
 */
export function applyPerformanceLearningEdits(existing: PerformanceLearningArtifactV1, value: unknown, now: Date) {
  const input = record(value);
  if (!input) throw new Error("Perubahan artifact tidak sah.");
  if (input.metrics !== undefined) throw new Error("Metrik snapshot tidak boleh diubah selepas generasi (immutable).");
  if (input.platformWindowDays !== undefined && input.platformWindowDays !== existing.platformWindowDays) throw new Error("Tetingkap platform tidak boleh diubah.");
  if (input.sourceSnapshot !== undefined || input.status !== undefined || input.revision !== undefined || input.approval !== undefined || input.diagnosis !== undefined || input.learning !== undefined || input.nextBestContent !== undefined || input.promiseCeiling !== undefined) throw new Error("Medan protected tidak boleh diubah.");
  const noteRaw = input.snapshotNote;
  if (noteRaw !== undefined && (typeof noteRaw !== "string" || noteRaw.trim().length > SNAPSHOT_NOTE_MAX)) throw new Error("Nota snapshot tidak sah.");
  const snapshotNote = noteRaw === undefined ? existing.snapshotNote : noteRaw.trim();
  const reopened = existing.status === "approved";
  const timestamp = now.toISOString();
  const edited: PerformanceLearningArtifactV1 = {
    ...existing,
    status: "draft",
    snapshotNote,
    snapshotNoteFenced: fenceSnapshotNote(snapshotNote).flaggedPatterns.length > 0,
    snapshotFencing: fenceSnapshotNote(snapshotNote),
    revision: reopened ? existing.revision + 1 : existing.revision,
    parentContentHash: reopened && existing.approval ? existing.approval.contentHash : existing.parentContentHash,
    approval: null,
    createdAt: reopened ? timestamp : existing.createdAt,
    updatedAt: timestamp,
  };
  const validation = validatePerformanceLearningArtifact(edited);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return edited;
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => [key, stableJsonValue(nested)]));
}

/** Stable sorted-key JSON serialization (CE-5 lesson: JSONB-safe from day one). */
export function stableJson(value: unknown) { return JSON.stringify(stableJsonValue(value)); }

function renderPerformanceLearningReportWith(artifact: PerformanceLearningArtifactV1, serializeStructured: (value: unknown) => string) {
  const { metrics, diagnosis, learning, nextBestContent } = artifact;
  const lines = [
    `REKOD PRESTASI + PEMBELAJARAN · ${artifact.sourceSnapshot.platform} · tetingkap ${artifact.platformWindowDays} hari`,
    `Sumber: Approved Content #${artifact.sourceContentCreateId} (R${artifact.revision}${artifact.parentContentHash ? ", reopen" : ""})`,
    `Snapshot metrik (owner-asserted): ${serializeStructured(metrics)}`,
    `Kadar terbitan: ${serializeStructured(diagnosis.derivedRates)}`,
    `Diagnosis: ${diagnosis.bottleneck} · keyakinan ${diagnosis.confidence} (rubrik deterministic v1; tiada perbandingan luar)`,
    `Rujukan strategi sumber: ${serializeStructured(diagnosis.strategyReference)}`,
    diagnosis.hypothesisNote ? `Nota hipotesis: ${diagnosis.hypothesisNote}` : "Nota hipotesis: — (insufficient_signal; tiada diagnosis lain dibenarkan)",
    `Pemerhatian: ${learning.patternObserved}`,
    `Hipotesis seterusnya (satu sahaja): ${learning.hypothesisNext}`,
    `Next Best Content: ${serializeStructured(nextBestContent)}`,
    `Promise ceiling: ${artifact.promiseCeiling}`,
    artifact.snapshotNote
      ? `Nota pemilik (tidak dipercayai, difens${artifact.snapshotFencing.flaggedPatterns.length ? `, corak: ${artifact.snapshotFencing.flaggedPatterns.join(", ")}` : ""}): ${artifact.snapshotNote}`
      : "Nota pemilik: —",
    `Kesimpulan: snapshot owner-asserted bukan bukti tersahkan; diagnosis setakat tetingkap ${artifact.platformWindowDays} hari sahaja.`,
  ];
  return lines.join("\n\n");
}

export function renderPerformanceLearningReport(artifact: PerformanceLearningArtifactV1) {
  return renderPerformanceLearningReportWith(artifact, stableJson);
}

export function approvePerformanceLearningArtifact(existing: PerformanceLearningArtifactV1, actorId: string, now: Date) {
  if (existing.status !== "draft") throw new Error("Hanya DRAF boleh diluluskan.");
  const actor = actorId.trim();
  if (!actor) throw new Error("Actor approval diperlukan.");
  const timestamp = now.toISOString();
  const approved: PerformanceLearningArtifactV1 = { ...existing, status: "approved", approval: { actorId: actor, approvedAt: timestamp, contentHash: sha256Hex(renderPerformanceLearningReport(existing)), approvalScope: "performance_learning_report" }, updatedAt: timestamp };
  const validation = validatePerformanceLearningArtifact(approved);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return approved;
}

export function canUsePerformanceLearningTier(tier: string | null | undefined) { return tier === "pro" || tier === "max"; }
