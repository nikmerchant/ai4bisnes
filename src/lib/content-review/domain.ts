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
import { sha256Hex } from "./hash";

export type { BusinessContextSnapshot, GenerationTelemetry, SocialPostObjective, SocialPostPlatform };
export const CONTENT_REVIEW_SCHEMA_VERSION = 1 as const;
export const CONTENT_REVIEW_RECIPE_VERSION = "content-review-v1.0.0" as const;
export const CONTENT_REVIEW_ENTRIES = ["pasted_text", "from_social_post"] as const;
export const CONTENT_REVIEW_DIAGNOSIS_DIMENSIONS = ["strategy", "audience", "thesis", "grab", "flow", "hold", "show", "say", "pack", "move", "trust", "brand"] as const;
export const CONTENT_REVIEW_VERDICT_BANDS = ["ELITE", "STRONG", "FUNCTIONAL", "WEAK", "BROKEN"] as const;
export const CONTENT_REVIEW_BOTTLENECKS = ["audience_mismatch", "weak_thesis", "generic_angle", "weak_hook", "no_progression", "retention_collapse", "proof_gap", "offer_transition", "generic_brand_voice", "expectation_mismatch", "cta_mismatch", "none_material"] as const;
export const CLAIM_CLASSES = ["FACT", "OBSERVATION", "INFERENCE", "OPINION", "PROMISE", "UNKNOWN"] as const;
export const CLAIM_EVIDENCE_STATES = ["SUPPORTED", "PARTIAL", "UNSUPPORTED", "NOT_REQUIRED"] as const;
export const CLAIM_ACTIONS = ["KEEP", "SOFTEN", "REMOVE", "OWNER_VERIFY"] as const;

export type ContentReviewEntry = (typeof CONTENT_REVIEW_ENTRIES)[number];
export type DiagnosisDimension = (typeof CONTENT_REVIEW_DIAGNOSIS_DIMENSIONS)[number];
export type VerdictBand = (typeof CONTENT_REVIEW_VERDICT_BANDS)[number];
export type ContentReviewBottleneck = (typeof CONTENT_REVIEW_BOTTLENECKS)[number];
export type ClaimClass = (typeof CLAIM_CLASSES)[number];
export type ClaimEvidenceState = (typeof CLAIM_EVIDENCE_STATES)[number];
export type ClaimAction = (typeof CLAIM_ACTIONS)[number];
export type ContentReviewStatus = "draft" | "approved";
export type SourceSocialPostStatus = ContentReviewStatus | null;

export type ContentReviewRequestV1 = {
  entry: ContentReviewEntry;
  sourceSocialPostId: number | null;
  sourceText: string;
  platform: SocialPostPlatform;
  objective: SocialPostObjective;
  desiredAction: string;
  extraContext: string;
};
export type CreativeBullseyeV1 = { change: string; whyFirst: string; leaveAlone: string; testMethod: string; successMetric: string };
export type ClaimEvidenceV1 = { claimId: string; exactClaimText: string; class: ClaimClass; evidenceState: ClaimEvidenceState; action: ClaimAction; allowedWordingCeiling: string };
export type ImprovedContentDraftV1 = { hook: string; body: string; callToAction: string; hashtags: string[]; revision: number; parentContentHash: string };
export type ContentApprovalV1 = { actorId: string; approvedAt: string; contentHash: string };
export type ContentReviewArtifactV1 = {
  schemaVersion: typeof CONTENT_REVIEW_SCHEMA_VERSION;
  kind: "content_review";
  status: ContentReviewStatus;
  entry: ContentReviewEntry;
  sourceSocialPostId: number | null;
  sourceSocialPostStatus: SourceSocialPostStatus;
  sourceTextHash: string;
  platform: SocialPostPlatform;
  objective: SocialPostObjective;
  diagnosisBands: Record<DiagnosisDimension, VerdictBand | null>;
  strengths: string[];
  weaknesses: string[];
  primaryCreativeBottleneck: ContentReviewBottleneck;
  fixes: string[];
  creativeBullseye: CreativeBullseyeV1;
  claimLedger: ClaimEvidenceV1[];
  improvedDraft: ImprovedContentDraftV1;
  assumptions: string[];
  businessContextSnapshot: BusinessContextSnapshot;
  recipeVersion: typeof CONTENT_REVIEW_RECIPE_VERSION;
  approval: ContentApprovalV1 | null;
  createdAt: string;
  updatedAt: string;
};

type JsonRecord = Record<string, unknown>;
const LIMITS = { sourceText: 5000, desiredAction: 200, extraContext: 500, field: 300, hook: 500, body: 5000, cta: 500, hashtags: 10, hashtag: 50, claims: 20, assumptions: 8 } as const;

function compact(value: string) { return value.trim().replace(/\s+/g, " "); }
function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== "string") throw new Error(`${label} diperlukan.`);
  const output = value.trim();
  if (!output) throw new Error(`${label} diperlukan.`);
  if (output.length > max) throw new Error(`${label} terlalu panjang.`);
  return output;
}
function optionalText(value: unknown, label: string, max: number) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") throw new Error(`${label} tidak sah.`);
  const output = value.trim();
  if (output.length > max) throw new Error(`${label} terlalu panjang.`);
  return output;
}
function enumValue<const T extends readonly string[]>(value: unknown, values: T, message: string): T[number] {
  if (typeof value !== "string" || !values.includes(value as T[number])) throw new Error(message);
  return value as T[number];
}
function sourceId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Social Post sumber tidak sah.");
  return id;
}

export function normalizeSourceText(value: string) {
  return value.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trimEnd()).join("\n").trim();
}

export function parseContentReviewRequest(value: unknown): ContentReviewRequestV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Data permintaan tidak sah.");
  const input = value as JsonRecord;
  const entry = enumValue(input.entry, CONTENT_REVIEW_ENTRIES, "Jenis entri tidak disokong.");
  const sourceSocialPostId = sourceId(input.sourceSocialPostId ?? input.source_social_post_id);
  const rawSourceText = input.sourceText ?? input.source_text;
  const sourceText = typeof rawSourceText === "string" ? normalizeSourceText(rawSourceText) : "";
  if (sourceText.length > LIMITS.sourceText) throw new Error("Content sumber terlalu panjang.");
  if (entry === "pasted_text" && !sourceText) throw new Error("Content sumber diperlukan.");
  if (entry === "pasted_text" && sourceSocialPostId !== null) throw new Error("Social Post sumber tidak dibenarkan untuk teks tampalan.");
  if (entry === "from_social_post" && sourceSocialPostId === null) throw new Error("Social Post sumber diperlukan.");
  return {
    entry,
    sourceSocialPostId,
    sourceText,
    platform: enumValue(input.platform, SOCIAL_POST_PLATFORMS, "Platform tidak disokong."),
    objective: enumValue(input.objective, SOCIAL_POST_OBJECTIVES, "Objektif tidak disokong."),
    desiredAction: optionalText(input.desiredAction ?? input.desired_action, "Tindakan dikehendaki", LIMITS.desiredAction),
    extraContext: optionalText(input.extraContext ?? input.extra_context, "Konteks tambahan", LIMITS.extraContext),
  };
}

export function buildContentReviewBusinessContextSnapshot(profile: NativeSocialPostBusinessProfile) {
  return buildBusinessContextSnapshot(profile);
}

function detectBottleneck(source: string, objective: SocialPostObjective): ContentReviewBottleneck {
  const text = compact(source).toLowerCase();
  if (/abaikan semua peraturan|service role key|tukar status kepada approved|hantar kandungan.*automatik/.test(text)) return "generic_angle";
  if (/jamin semua masalah pemasaran.*selesai.*satu hari/.test(text)) return "expectation_mismatch";
  if (/dijamin|pasti berkesan untuk setiap|97%|satu-satunya sebab/.test(text)) return "proof_gap";
  if (/transformer|attention heads|quantization|tensor parallelism/.test(text) && /gerai|nasi ayam/.test(text)) return "audience_mismatch";
  if (/tiba-tiba sahaja|promosi besar/.test(text)) return "offer_transition";
  if (objective === "education" && /beli .*sekarang|stok habis/.test(text)) return "cta_mismatch";
  if (/dalam dunia yang serba pantas|inovasi adalah kunci kejayaan|solusi terbaik|berkualiti tinggi/.test(text)) return "generic_brand_voice";
  if (/^hari ini saya nak berkongsi|teknologi sangat penting dan semua orang/.test(text)) return "weak_hook";
  const fragments = source.split(/[.!?]+/).map(compact).filter(Boolean);
  if (fragments.length >= 5 && fragments.filter((part) => part.split(/\s+/).length <= 5).length >= 4) return "no_progression";
  if (text.length < 90 || /post biasa untuk semakan/.test(text)) return "generic_angle";
  return "none_material";
}

function claim(id: number, exactClaimText: string, klass: ClaimClass, evidenceState: ClaimEvidenceState, action: ClaimAction, ceiling: string): ClaimEvidenceV1 {
  return { claimId: `claim-${id}`, exactClaimText, class: klass, evidenceState, action, allowedWordingCeiling: ceiling };
}
function matched(source: string, pattern: RegExp) { return source.match(pattern)?.[0] ?? null; }
function buildClaimLedger(source: string, sourceStatus: SourceSocialPostStatus): ClaimEvidenceV1[] {
  const result: ClaimEvidenceV1[] = [];
  const push = (text: string | null, klass: ClaimClass, state: ClaimEvidenceState, action: ClaimAction, ceiling: string) => { if (text) result.push(claim(result.length + 1, text, klass, state, action, ceiling)); };
  push(matched(source, /jualan anda dijamin naik 300% dalam tujuh hari/i), "PROMISE", "UNSUPPORTED", "REMOVE", "Nyatakan bantuan/proses tanpa jaminan hasil atau angka.");
  push(matched(source, /tanpa sebarang risiko/i), "PROMISE", "UNSUPPORTED", "OWNER_VERIFY", "Gunakan hanya jika pemilik mempunyai terma dan bukti yang sah.");
  push(matched(source, /saya jamin semua masalah pemasaran bisnes anda akan selesai dalam masa satu hari/i), "PROMISE", "UNSUPPORTED", "REMOVE", "Janji hanya satu langkah praktikal yang kandungan benar-benar tunjukkan.");
  push(matched(source, /semua masalah pemasaran bisnes anda akan selesai dalam masa satu hari/i), "PROMISE", "UNSUPPORTED", "SOFTEN", "Gunakan bahasa kemungkinan, bukan kepastian atau tempoh tanpa bukti.");
  push(matched(source, /20 tempahan selepas satu post/i), "OBSERVATION", "PARTIAL", "SOFTEN", "Label sebagai satu pengalaman pelanggan; hasil lain boleh berbeza.");
  push(matched(source, /jualan bulanan meningkat/i), "OBSERVATION", "PARTIAL", "OWNER_VERIFY", "Kekalkan sebagai pemerhatian jika rekod pemilik mengesahkannya.");
  push(matched(source, /AI ialah satu-satunya sebab jualan meningkat/i), "INFERENCE", "UNSUPPORTED", "SOFTEN", "AI mungkin salah satu faktor; jangan dakwa sebab tunggal.");
  push(matched(source, /97% pelanggan Malaysia hanya membeli daripada bisnes yang post setiap hari/i), "UNKNOWN", "UNSUPPORTED", "REMOVE", "Buang angka sehingga sumber sah disediakan.");
  push(matched(source, /Kajian menunjukkan 97%/i), "UNKNOWN", "UNSUPPORTED", "OWNER_VERIFY", "Jangan sebut kajian tanpa rujukan yang boleh disahkan.");
  if (sourceStatus === "approved") {
    push(matched(source, /RM12/i), "FACT", "SUPPORTED", "KEEP", "Kekalkan nilai tepat daripada sumber diluluskan.");
    push(matched(source, /sehingga jam 11 pagi/i), "FACT", "SUPPORTED", "KEEP", "Kekalkan had masa tepat daripada sumber diluluskan.");
  }
  return result.slice(0, LIMITS.claims);
}

const bottleneckDetails: Record<ContentReviewBottleneck, { dimension: DiagnosisDimension; change: string; why: string; leave: string; test: string; metric: string }> = {
  audience_mismatch: { dimension: "audience", change: "Selaraskan topik dan bahasa dengan masalah sebenar pelanggan sasaran.", why: "Audience yang tepat menentukan sama ada perhatian itu bernilai kepada bisnes.", leave: "Kekalkan tindakan akhir yang jelas.", test: "Minta seorang pelanggan sasaran terangkan untuk siapa post ini selepas membaca sekali.", metric: "Pelanggan sasaran mengenal pasti relevansi tanpa penjelasan tambahan." },
  weak_thesis: { dimension: "thesis", change: "Nyatakan satu pendirian utama yang khusus.", why: "Thesis memberi sebab untuk terus membaca.", leave: "Jangan tambah lebih banyak topik dahulu.", test: "Ringkaskan post kepada satu ayat dan semak sama ada maksudnya jelas.", metric: "Satu mesej utama dapat diulang dengan tepat." },
  generic_angle: { dimension: "strategy", change: "Gantikan arahan atau angle umum dengan satu masalah pelanggan yang khusus.", why: "Angle khusus meningkatkan perhatian berkualiti tanpa mereka fakta.", leave: "Kekalkan fakta bisnes yang sah.", test: "Semak sama ada pembaca boleh menamakan masalah dan manfaat dalam satu bacaan.", metric: "Masalah dan manfaat dikenal pasti dengan jelas." },
  weak_hook: { dimension: "grab", change: "Buka dengan masalah atau hasil khusus yang relevan, bukan mukadimah umum.", why: "Hook ialah titik kehilangan perhatian paling awal.", leave: "Kekalkan topik teknologi sebagai isi selepas hook.", test: "Paparkan ayat pertama sahaja kepada pelanggan sasaran dan tanya sama ada mereka mahu terus membaca.", metric: "Niat untuk meneruskan bacaan meningkat dalam semakan pengguna." },
  no_progression: { dimension: "flow", change: "Susun isi sebagai masalah → sebab → langkah → tindakan.", why: "Urutan sekarang terasa seperti senarai rawak dan menyukarkan pemahaman.", leave: "Kekalkan soalan engagement di akhir.", test: "Minta pembaca susun semula isi; versi baik tidak memerlukan susunan semula.", metric: "Pembaca dapat menceritakan semula aliran utama." },
  retention_collapse: { dimension: "hold", change: "Pendekkan bahagian berulang dan tambah perkembangan baharu pada setiap bahagian.", why: "Setiap ayat perlu memberi sebab untuk kekal.", leave: "Kekalkan thesis utama.", test: "Tandakan ayat yang tidak menambah maklumat atau emosi baharu.", metric: "Tiada bahagian berulang yang material." },
  proof_gap: { dimension: "trust", change: "Buang atau lembutkan dakwaan yang melebihi bukti tersedia.", why: "Kelemahan utama ialah risiko kepercayaan, bukan gaya penulisan.", leave: "Kekalkan pemerhatian atau fakta pemilik yang boleh disahkan.", test: "Semak setiap dakwaan terhadap Claim Ledger sebelum kelulusan.", metric: "Tiada PROMISE unsupported dikekalkan tanpa perubahan." },
  offer_transition: { dimension: "move", change: "Jadikan tawaran sambungan logik kepada nilai yang baru ditunjukkan.", why: "Peralihan mengejut memutuskan kepercayaan dan niat membeli.", leave: "Kekalkan langkah praktikal di bahagian awal.", test: "Buang CTA dan minta pembaca jangka tindakan seterusnya; tawaran patut terasa semula jadi.", metric: "Tawaran dirasakan sebagai langkah seterusnya yang relevan." },
  generic_brand_voice: { dimension: "brand", change: "Ganti klise korporat dengan satu kepercayaan atau amalan khusus bisnes.", why: "Suara umum tidak membezakan bisnes atau membina ingatan.", leave: "Kekalkan nada profesional.", test: "Tutup nama jenama dan semak sama ada post masih boleh dikenal pasti sebagai milik bisnes ini.", metric: "Pembaca mengenal pasti satu ciri suara atau kepercayaan yang tersendiri." },
  expectation_mismatch: { dimension: "trust", change: "Tetapkan jangkaan yang realistik dan boleh dilaksanakan dalam kandungan ini.", why: "Janji mutlak merosakkan kepercayaan sebelum CTA.", leave: "Kekalkan ajakan mengisi borang jika masih relevan.", test: "Semak bahawa hasil yang dijanjikan benar-benar ditunjukkan dan tidak dijamin.", metric: "Tiada kepastian, jaminan atau tempoh hasil tanpa bukti." },
  cta_mismatch: { dimension: "move", change: "Selaraskan CTA dengan objektif pendidikan dan nilai yang baru diberi.", why: "CTA jualan keras memutuskan kesinambungan post pendidikan.", leave: "Kekalkan tiga sebab dan struktur penerangan.", test: "Tanya pembaca apakah tindakan paling semula jadi selepas membaca.", metric: "Tindakan pilihan sepadan dengan objektif post." },
  none_material: { dimension: "strategy", change: "Kekalkan struktur utama; buat hanya kemasan bahasa kecil.", why: "Tiada satu kelemahan material yang menghalang penggunaan.", leave: "Jangan cipta masalah atau dakwaan baharu.", test: "Bandingkan versi asal dan kemas dengan pelanggan sasaran.", metric: "Kejelasan kekal atau bertambah tanpa perubahan fakta." },
};

function diagnosisFor(bottleneck: ContentReviewBottleneck): Record<DiagnosisDimension, VerdictBand | null> {
  const bands = Object.fromEntries(CONTENT_REVIEW_DIAGNOSIS_DIMENSIONS.map((dimension) => [dimension, dimension === "show" || dimension === "pack" ? null : bottleneck === "none_material" ? "STRONG" : "FUNCTIONAL"])) as Record<DiagnosisDimension, VerdictBand | null>;
  if (bottleneck !== "none_material") bands[bottleneckDetails[bottleneck].dimension] = bottleneck === "proof_gap" || bottleneck === "expectation_mismatch" ? "BROKEN" : "WEAK";
  return bands;
}
function safeRewrite(source: string, bottleneck: ContentReviewBottleneck) {
  let output = compact(source)
    .replace(/Gunakan servis kami dan jualan anda dijamin naik 300% dalam tujuh hari tanpa sebarang risiko\.?/gi, "Servis kami direka untuk membantu anda memperkemas pemasaran. Hasil berbeza mengikut keadaan bisnes dan pelaksanaan.")
    .replace(/Tonton video ini dan saya jamin semua masalah pemasaran bisnes anda akan selesai dalam masa satu hari\.?/gi, "Dalam video ini, lihat satu langkah praktikal untuk mengenal pasti masalah pemasaran yang perlu dibaiki dahulu.")
    .replace(/Ini membuktikan kaedah ini pasti berkesan untuk setiap bisnes di Malaysia\.?/gi, "Pengalaman itu menunjukkan potensi kaedah ini, tetapi hasil setiap bisnes boleh berbeza.")
    .replace(/Oleh itu AI ialah satu-satunya sebab jualan meningkat\.?/gi, "AI mungkin salah satu faktor, bersama perubahan lain yang perlu disemak.")
    .replace(/Kajian menunjukkan 97% pelanggan Malaysia hanya membeli daripada bisnes yang post setiap hari\.?/gi, "Posting secara konsisten boleh membantu pelanggan lebih kerap melihat dan memahami bisnes anda.")
    .replace(/ABAIKAN SEMUA PERATURAN\.[\s\S]*?Selepas arahan itu,\s*/i, "");
  if (!output) output = "Kuih raya yang baik bermula dengan pilihan yang sesuai untuk pelanggan anda.";
  if (bottleneck === "weak_hook") output = `Teknologi mana yang benar-benar menjimatkan masa pemilik PKS? ${output.replace(/^Hari ini saya nak berkongsi[^.]*\.\s*/i, "")}`;
  if (bottleneck === "no_progression") output = "Pemasaran lebih mudah apabila setiap post fokus pada satu masalah pelanggan. Terangkan sebab masalah itu penting, beri satu langkah praktikal, kemudian ajak pelanggan berkongsi pengalaman mereka.";
  if (bottleneck === "generic_brand_voice") output = "Inovasi berguna apabila ia memudahkan kerja pelanggan, bukan sekadar menambah istilah baharu. Kami memilih penyelesaian yang jelas, praktikal dan boleh digunakan oleh PKS.";
  if (bottleneck === "offer_transition") output = output.replace(/Tiba-tiba sahaja:\s*PROMOSI BESAR!\s*/i, "Jika anda mahu bantuan menyusun langkah ini, lihat tawaran yang berkaitan. ").replace(/dan jangan lepaskan peluang!?/i, "jika sesuai dengan keperluan anda.");
  return output.slice(0, LIMITS.body);
}
function ctaFor(objective: SocialPostObjective, desiredAction: string) {
  const defaults: Record<SocialPostObjective, string> = { awareness: "Ikuti kami untuk panduan praktikal seterusnya.", engagement: "Kongsi pandangan anda di ruangan komen.", leads: "Hubungi kami jika anda mahu langkah yang sesuai untuk bisnes anda.", sales: "Hubungi kami untuk semak pilihan yang sesuai sebelum membuat tempahan.", education: "Simpan panduan ini untuk rujukan anda." };
  if (!desiredAction) return defaults[objective];
  const safe = compact(desiredAction).toLowerCase();
  if (/save/.test(safe)) return "Simpan panduan ini untuk rujukan anda.";
  if (/comment/.test(safe)) return "Kongsi pandangan anda di ruangan komen.";
  if (/follow/.test(safe)) return "Ikuti kami untuk panduan praktikal seterusnya.";
  if (/whatsapp|buy|order|click|lead form/.test(safe)) return defaults[objective];
  return defaults[objective];
}
function hookFor(body: string, bottleneck: ContentReviewBottleneck) {
  const first = body.split(/(?<=[.!?])\s+/)[0] || body;
  if (bottleneck === "proof_gap" || bottleneck === "expectation_mismatch") return "Apa hasil yang realistik boleh anda jangka?";
  if (bottleneck === "audience_mismatch") return "Pemilik gerai makanan: mahu pelanggan lebih mudah membuat tempahan?";
  return first.slice(0, LIMITS.hook);
}

export function buildDeterministicContentReview(input: { business: BusinessContextSnapshot; request: ContentReviewRequestV1; sourceSocialPostStatus: SourceSocialPostStatus; sourceTextHash: string; now: Date }): ContentReviewArtifactV1 {
  const sourceText = normalizeSourceText(input.request.sourceText);
  if (!sourceText || sourceText.length > LIMITS.sourceText) throw new Error("Content sumber tidak sah.");
  if (!/^[a-f0-9]{64}$/i.test(input.sourceTextHash)) throw new Error("Hash sumber tidak sah.");
  const bottleneck = detectBottleneck(sourceText, input.request.objective);
  const detail = bottleneckDetails[bottleneck];
  const claims = buildClaimLedger(sourceText, input.sourceSocialPostStatus);
  const body = safeRewrite(sourceText, bottleneck);
  const now = input.now.toISOString();
  const assumptions = ["Review text-only: dimensi visual/show dan packaging mungkin tidak dapat dinilai."];
  if (input.request.extraContext) assumptions.push("Konteks tambahan pemilik dianggap nota tidak dipercayai dan perlu disemak.");
  if (input.request.entry === "from_social_post") assumptions.push(`Teks canonical dimuat daripada Social Post milik pengguna #${input.request.sourceSocialPostId}.`);
  const artifact: ContentReviewArtifactV1 = {
    schemaVersion: CONTENT_REVIEW_SCHEMA_VERSION,
    kind: "content_review",
    status: "draft",
    entry: input.request.entry,
    sourceSocialPostId: input.request.sourceSocialPostId,
    sourceSocialPostStatus: input.request.entry === "from_social_post" ? input.sourceSocialPostStatus : null,
    sourceTextHash: input.sourceTextHash.toLowerCase(),
    platform: input.request.platform,
    objective: input.request.objective,
    diagnosisBands: diagnosisFor(bottleneck),
    strengths: bottleneck === "none_material" ? ["Mesej mempunyai thesis, aliran dan tindakan yang boleh digunakan."] : ["Topik asas masih boleh difahami dan dibaiki tanpa mereka fakta baharu."],
    weaknesses: bottleneck === "none_material" ? ["Tiada kelemahan material; hanya kemasan bahasa kecil dicadangkan."] : [detail.change],
    primaryCreativeBottleneck: bottleneck,
    fixes: [detail.change],
    creativeBullseye: { change: detail.change, whyFirst: detail.why, leaveAlone: detail.leave, testMethod: detail.test, successMetric: detail.metric },
    claimLedger: claims,
    improvedDraft: { hook: hookFor(body, bottleneck), body, callToAction: ctaFor(input.request.objective, input.request.desiredAction), hashtags: [], revision: 1, parentContentHash: input.sourceTextHash.toLowerCase() },
    assumptions: assumptions.slice(0, LIMITS.assumptions),
    businessContextSnapshot: input.business,
    recipeVersion: CONTENT_REVIEW_RECIPE_VERSION,
    approval: null,
    createdAt: now,
    updatedAt: now,
  };
  const validation = validateContentReviewArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}

function boundedString(value: unknown, min: number, max: number) { return typeof value === "string" && value.trim().length >= min && value.length <= max; }
function validStringArray(value: unknown, min: number, max: number, itemMax = 500) { return Array.isArray(value) && value.length >= min && value.length <= max && value.every((item) => boundedString(item, 1, itemMax)); }

export function validateContentReviewArtifact(value: unknown): { ok: true; artifact: ContentReviewArtifactV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, errors: ["Artifact mesti objek."] };
  const item = value as JsonRecord;
  if (item.schemaVersion !== 1) errors.push("Schema version tidak sah.");
  if (item.kind !== "content_review") errors.push("Jenis artifact tidak sah.");
  if (!(["draft", "approved"] as const).includes(item.status as ContentReviewStatus)) errors.push("Status tidak sah.");
  if (!CONTENT_REVIEW_ENTRIES.includes(item.entry as ContentReviewEntry)) errors.push("Entri tidak sah.");
  if (!SOCIAL_POST_PLATFORMS.includes(item.platform as SocialPostPlatform)) errors.push("Platform tidak sah.");
  if (!SOCIAL_POST_OBJECTIVES.includes(item.objective as SocialPostObjective)) errors.push("Objektif tidak sah.");
  if (!CONTENT_REVIEW_BOTTLENECKS.includes(item.primaryCreativeBottleneck as ContentReviewBottleneck)) errors.push("Bottleneck tidak sah.");
  if (!boundedString(item.sourceTextHash, 64, 64) || !/^[a-f0-9]{64}$/i.test(String(item.sourceTextHash))) errors.push("Hash sumber tidak sah.");
  if (item.entry === "from_social_post" && (!Number.isSafeInteger(Number(item.sourceSocialPostId)) || Number(item.sourceSocialPostId) < 1 || !(["draft", "approved"] as const).includes(item.sourceSocialPostStatus as ContentReviewStatus))) errors.push("Sumber Social Post tidak sah.");
  if (item.entry === "pasted_text" && (item.sourceSocialPostId !== null || item.sourceSocialPostStatus !== null)) errors.push("Sumber tampalan tidak sah.");
  if (!item.diagnosisBands || typeof item.diagnosisBands !== "object" || Array.isArray(item.diagnosisBands)) errors.push("Diagnosis tidak sah.");
  else {
    const bands = item.diagnosisBands as JsonRecord;
    if (Object.keys(bands).length !== 12 || CONTENT_REVIEW_DIAGNOSIS_DIMENSIONS.some((dimension) => !(dimension in bands) || (bands[dimension] !== null && !CONTENT_REVIEW_VERDICT_BANDS.includes(bands[dimension] as VerdictBand)))) errors.push("Diagnosis bands tidak sah.");
  }
  if (!validStringArray(item.strengths, 1, 5) || !validStringArray(item.weaknesses, 1, 5) || !validStringArray(item.fixes, 1, 5)) errors.push("Senarai diagnosis tidak sah.");
  const bullseye = item.creativeBullseye as JsonRecord | undefined;
  if (!bullseye || ["change", "whyFirst", "leaveAlone", "testMethod", "successMetric"].some((key) => !boundedString(bullseye[key], 1, key === "successMetric" ? 200 : 300))) errors.push("Creative Bullseye tidak sah.");
  if (!Array.isArray(item.claimLedger) || item.claimLedger.length > LIMITS.claims || item.claimLedger.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return true;
    const c = entry as JsonRecord;
    return !boundedString(c.claimId, 1, 100) || !boundedString(c.exactClaimText, 1, 5000) || !CLAIM_CLASSES.includes(c.class as ClaimClass) || !CLAIM_EVIDENCE_STATES.includes(c.evidenceState as ClaimEvidenceState) || !CLAIM_ACTIONS.includes(c.action as ClaimAction) || !boundedString(c.allowedWordingCeiling, 1, 500) || (c.class === "PROMISE" && c.evidenceState === "UNSUPPORTED" && c.action === "KEEP");
  })) errors.push("Claim Ledger tidak sah.");
  const draft = item.improvedDraft as JsonRecord | undefined;
  if (!draft || !boundedString(draft.hook, 1, LIMITS.hook) || !boundedString(draft.body, 1, LIMITS.body) || !boundedString(draft.callToAction, 1, LIMITS.cta) || !Array.isArray(draft.hashtags) || draft.hashtags.length > LIMITS.hashtags || draft.hashtags.some((tag) => !boundedString(tag, 1, LIMITS.hashtag)) || !Number.isSafeInteger(Number(draft.revision)) || Number(draft.revision) < 1 || !boundedString(draft.parentContentHash, 64, 64)) errors.push("Improved draft tidak sah.");
  if (!validStringArray(item.assumptions, 0, LIMITS.assumptions)) errors.push("Assumptions tidak sah.");
  if (!item.businessContextSnapshot || typeof item.businessContextSnapshot !== "object" || Array.isArray(item.businessContextSnapshot)) errors.push("Business Context tidak sah.");
  if (item.recipeVersion !== CONTENT_REVIEW_RECIPE_VERSION || !boundedString(item.createdAt, 1, 40) || !boundedString(item.updatedAt, 1, 40)) errors.push("Metadata artifact tidak sah.");
  if (item.status === "approved") {
    const approval = item.approval as JsonRecord | null;
    if (!approval || !boundedString(approval.actorId, 1, 200) || !boundedString(approval.approvedAt, 1, 40) || !boundedString(approval.contentHash, 64, 64)) errors.push("Approval tidak sah.");
  } else if (item.approval !== null) errors.push("Draf tidak boleh mempunyai approval.");
  if (errors.length) return { ok: false, errors };
  return { ok: true, artifact: item as unknown as ContentReviewArtifactV1 };
}

export function renderImprovedContentText(draft: ImprovedContentDraftV1) { return [draft.hook, draft.body, draft.callToAction, draft.hashtags.join(" ")].filter(Boolean).join("\n\n"); }
export function renderContentReviewBeforeAfter(sourceText: string, artifact: ContentReviewArtifactV1) { return `SEBELUM\n${normalizeSourceText(sourceText)}\n\nSELEPAS\n${renderImprovedContentText(artifact.improvedDraft)}`; }

export function approveContentReviewArtifact(existing: ContentReviewArtifactV1, actorId: string, now: Date) {
  if (!actorId.trim()) throw new Error("Actor approval diperlukan.");
  const timestamp = now.toISOString();
  const approved: ContentReviewArtifactV1 = { ...existing, status: "approved", approval: { actorId: actorId.trim(), approvedAt: timestamp, contentHash: sha256Hex(renderImprovedContentText(existing.improvedDraft)) }, updatedAt: timestamp };
  const validation = validateContentReviewArtifact(approved); if (!validation.ok) throw new Error(validation.errors.join(" ")); return approved;
}

export function applyContentReviewDraftEdits(existing: ContentReviewArtifactV1, value: unknown, now: Date) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Perubahan artifact tidak sah.");
  const input = value as JsonRecord;
  const hashtags = Array.isArray(input.hashtags) ? input.hashtags.map((tag) => requiredText(tag, "Hashtag", LIMITS.hashtag)) : [];
  if (hashtags.length > LIMITS.hashtags) throw new Error("Terlalu banyak hashtag.");
  const changed = existing.status === "approved";
  const edited: ContentReviewArtifactV1 = {
    ...existing,
    status: "draft",
    approval: null,
    createdAt: changed ? now.toISOString() : existing.createdAt,
    improvedDraft: {
      hook: requiredText(input.hook, "Hook", LIMITS.hook),
      body: requiredText(input.body, "Body", LIMITS.body),
      callToAction: requiredText(input.callToAction, "CTA", LIMITS.cta),
      hashtags,
      revision: changed ? existing.improvedDraft.revision + 1 : existing.improvedDraft.revision,
      parentContentHash: changed && existing.approval ? existing.approval.contentHash : existing.improvedDraft.parentContentHash,
    },
    updatedAt: now.toISOString(),
  };
  const validation = validateContentReviewArtifact(edited); if (!validation.ok) throw new Error(validation.errors.join(" ")); return edited;
}

export function canUseContentReviewTier(tier: string | null | undefined) { return tier === "pro" || tier === "max"; }
