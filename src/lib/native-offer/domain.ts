export { sanitizeGenerationTelemetry } from "../native-social-post/domain";
export type { GenerationTelemetry } from "../native-social-post/domain";

export const OFFER_SCHEMA_VERSION = 1 as const;
export const OFFER_RECIPE_VERSION = "offer-v1.0.0";

export const OFFER_TYPES = [
  "promotion",
  "bundle",
  "guarantee",
  "value_stack",
  "seasonal",
] as const;
export const OFFER_ENTRIES = ["standalone", "from_social_post"] as const;
export const OFFER_GOALS = ["sales", "leads", "repeat_purchase"] as const;

export type OfferType = (typeof OFFER_TYPES)[number];
export type OfferEntry = (typeof OFFER_ENTRIES)[number];
export type OfferGoal = (typeof OFFER_GOALS)[number];
export type OfferStatus = "draft" | "approved";

export type NativeOfferRequest = {
  entry: OfferEntry;
  sourcePostId: number | null;
  offerType: OfferType;
  product: string;
  goal: OfferGoal;
  validUntil: string;
  extraNote: string;
  audience: string;
  priceGuidance: string;
};

export type NativeOfferBusinessProfile = {
  businessName: string;
  category: string;
  products: string;
  targetCustomer: string;
  location: string;
  usp: string;
  toneOfVoice: string;
  priceRange: string;
  platforms: string;
};

export type OfferBusinessContextSnapshot = Readonly<NativeOfferBusinessProfile>;

export type OfferSourcePostSnapshot = Readonly<{
  id: number;
  topic: string;
  hook: string;
  body: string;
  callToAction: string;
}>;

export type OfferArtifact = {
  schemaVersion: typeof OFFER_SCHEMA_VERSION;
  kind: "offer";
  status: OfferStatus;
  entry: OfferEntry;
  sourcePostId: number | null;
  offerType: OfferType;
  product: string;
  goal: OfferGoal;
  audience: string;
  headline: string;
  promise: string;
  valueStack: string[];
  priceNote: string;
  terms: string[];
  riskReversal: string;
  urgencyNote: string;
  callToAction: string;
  assumptions: string[];
  businessContext: OfferBusinessContextSnapshot;
  recipeVersion: string;
  createdAt: string;
  updatedAt: string;
};

type JsonRecord = Record<string, unknown>;

const LIMITS = {
  product: 200,
  audience: 200,
  priceGuidance: 200,
  extraNote: 300,
  artifactText: 2000,
  valueStackCount: 5,
  termsCount: 8,
  componentLength: 300,
} as const;

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max + 1);
}

function requiredText(value: unknown, label: string, max: number) {
  const output = text(value, max);
  if (!output) throw new Error(`${label} diperlukan.`);
  if (output.length > max) throw new Error(`${label} terlalu panjang.`);
  return output;
}

function optionalText(value: unknown, label: string, max: number) {
  const output = text(value, max);
  if (output.length > max) throw new Error(`${label} terlalu panjang.`);
  return output;
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  errorMessage: string
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value as T[number])) {
    throw new Error(errorMessage);
  }
  return value as T[number];
}

export function parseNativeOfferRequest(value: unknown): NativeOfferRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Data permintaan tidak sah.");
  }
  const input = value as JsonRecord;
  const entry = enumValue(input.entry, OFFER_ENTRIES, "Jenis entri tidak disokong.");
  const rawSourcePostId = input.source_post_id;
  let sourcePostId: number | null = null;
  if (rawSourcePostId !== null && rawSourcePostId !== undefined && rawSourcePostId !== "") {
    const parsedId = Number(rawSourcePostId);
    if (!Number.isSafeInteger(parsedId) || parsedId < 1) throw new Error("Social Post sumber tidak sah.");
    sourcePostId = parsedId;
  }
  if (entry === "from_social_post" && sourcePostId === null) throw new Error("Social Post sumber diperlukan.");
  if (entry === "standalone" && sourcePostId !== null) throw new Error("Social Post sumber tidak dibenarkan untuk entri standalone.");

  const validUntil = optionalText(input.valid_until, "Tarikh sah", 10);
  if (validUntil) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) throw new Error("Tarikh sah mesti format YYYY-MM-DD.");
    const parsedDate = new Date(`${validUntil}T00:00:00.000Z`);
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== validUntil) {
      throw new Error("Tarikh sah tidak sah.");
    }
  }
  return {
    entry,
    sourcePostId,
    offerType: enumValue(input.offer_type, OFFER_TYPES, "Jenis tawaran tidak disokong."),
    product: requiredText(input.product, "Produk", LIMITS.product),
    goal: enumValue(input.goal, OFFER_GOALS, "Matlamat tawaran tidak disokong."),
    validUntil,
    extraNote: optionalText(input.extra_note, "Nota tambahan", LIMITS.extraNote),
    audience: optionalText(input.audience, "Audience", LIMITS.audience),
    priceGuidance: optionalText(input.priceGuidance, "Panduan harga", LIMITS.priceGuidance),
  };
}

export function buildOfferBusinessContextSnapshot(
  profile: NativeOfferBusinessProfile
): OfferBusinessContextSnapshot {
  return Object.freeze({
    businessName: text(profile.businessName, 160) || "Bisnes saya",
    category: text(profile.category, 120),
    products: text(profile.products, 500) || "Produk atau servis",
    targetCustomer: text(profile.targetCustomer, 300) || "Pelanggan sasaran",
    location: text(profile.location, 160) || "Malaysia",
    usp: text(profile.usp, 300),
    toneOfVoice: text(profile.toneOfVoice, 120) || "mesra dan profesional",
    priceRange: text(profile.priceRange, 120),
    platforms: text(profile.platforms, 200),
  });
}

function offerName(input: {
  business: OfferBusinessContextSnapshot;
  request: NativeOfferRequest;
}) {
  const { business, request } = input;
  const names: Record<OfferType, string> = {
    promotion: `Promosi ${request.product} — ${business.businessName}`,
    bundle: `Pakej ${request.product} Jimat`,
    guarantee: `Cadangan Jaminan ${request.product} — ${business.businessName}`,
    value_stack: `Pakej Bernilai Tinggi: ${request.product}`,
    seasonal: `Tawaran Musim: ${request.product}`,
  };
  return names[request.offerType];
}

function clip(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function deterministicComponents(input: {
  business: OfferBusinessContextSnapshot;
  request: NativeOfferRequest;
}) {
  const { business, request } = input;
  const audience = clip(request.audience || business.targetCustomer, 200);
  const product = clip(request.product, 120);
  const businessName = clip(business.businessName, 80);
  const usp = business.usp ? clip(business.usp, 220) : "";
  const core: Record<OfferType, string[]> = {
    promotion: [
      `Tawaran promosi ${product} untuk ${audience}.`,
      usp ? `Kelebihan utama: ${usp}.` : `Disediakan oleh ${businessName}.`,
      `Cara tempahan yang jelas melalui ${businessName}.`,
    ],
    bundle: [
      `Item utama: ${product}.`,
      `Cadangan item sokongan yang melengkapkan penggunaan (sahkan ketersediaan).`,
      `Cadangan panduan ringkas penggunaan untuk ${audience}.`,
    ],
    guarantee: [
      `Cadangan struktur jaminan kualiti untuk ${product} (perlu disahkan pemilik).`,
      `Cadangan proses bantuan selepas pembelian untuk ${audience}.`,
      `Item utama: ${product}.`,
    ],
    value_stack: [
      `Item utama: ${product}.`,
      `Cadangan nilai tambah servis atau personalisasi daripada ${businessName}.`,
      `Cadangan tip penggunaan khas untuk ${audience}.`,
      `Cadangan saluran pertanyaan selepas pembelian.`,
    ],
    seasonal: [
      `${product} bertemakan musim/perayaan semasa.`,
      `Cadangan pembungkusan atau penyajian istimewa (sahkan ketersediaan).`,
      `Cadangan mesej bermusim untuk ${audience}.`,
    ],
  };
  return core[request.offerType].map((item) => clip(item, LIMITS.componentLength)).slice(0, LIMITS.valueStackCount);
}

function deterministicCta(request: NativeOfferRequest, business: OfferBusinessContextSnapshot) {
  const ctas: Record<OfferGoal, string> = {
    sales: `Hubungi ${business.businessName} untuk membuat tempahan.`,
    leads: `Hubungi ${business.businessName} untuk mendapatkan maklumat lanjut.`,
    repeat_purchase: `Hubungi ${business.businessName} untuk membuat pesanan semula.`,
  };
  return ctas[request.goal];
}

export function buildDeterministicOffer(input: {
  business: OfferBusinessContextSnapshot;
  request: NativeOfferRequest;
  sourcePost?: OfferSourcePostSnapshot | null;
  now: Date;
}): OfferArtifact {
  const { business, request } = input;
  const audience = request.audience || business.targetCustomer;
  const assumptions: string[] = [];
  if (!request.priceGuidance) assumptions.push(business.priceRange
    ? "Harga khusus tidak diberikan; julat harga daripada Business Context digunakan."
    : "Panduan harga tidak diberikan; teks harga generik digunakan.");
  if (!business.usp) assumptions.push("USP tidak diisi; komponen nilai menggunakan maklumat produk tersedia.");
  if (!request.audience) assumptions.push("Audience khusus tidak diberikan; pelanggan sasaran daripada Business Context digunakan.");
  if (input.sourcePost) assumptions.push(`Tawaran dibina daripada Social Post #${input.sourcePost.id}: ${input.sourcePost.topic}.`);
  if (["bundle", "guarantee", "value_stack", "seasonal"].includes(request.offerType)) {
    assumptions.push("Komponen tawaran ialah cadangan; sahkan ketersediaan dan polisi sebelum digunakan.");
  }
  if (request.offerType === "seasonal" || request.offerType === "promotion") {
    if (!request.validUntil) assumptions.push("Urgency tidak ditambah; masukkan tarikh sah sebenar jika diperlukan.");
  }
  if (request.offerType === "guarantee") assumptions.push("Risk reversal tidak dijana; pemilik perlu memasukkan polisi jaminan sebenar sebelum meluluskan.");

  const priceNote = request.priceGuidance || business.priceRange || "Harga dinyatakan semasa tempahan";
  const terms = request.validUntil ? [`Sah hingga ${request.validUntil}.`] : [];
  const timestamp = input.now.toISOString();
  const artifact: OfferArtifact = {
    schemaVersion: OFFER_SCHEMA_VERSION,
    kind: "offer",
    status: "draft",
    entry: request.entry,
    sourcePostId: request.sourcePostId,
    offerType: request.offerType,
    product: request.product,
    goal: request.goal,
    audience,
    headline: clip(offerName(input), 300),
    promise: clip(`Untuk ${audience} yang mencari ${request.product.toLowerCase()}, ${business.businessName} menawarkan pilihan yang jelas dan mudah difahami.`, LIMITS.artifactText),
    valueStack: deterministicComponents(input),
    priceNote,
    terms,
    riskReversal: "",
    urgencyNote: request.validUntil ? `Tawaran ini sah hingga ${request.validUntil}.` : "",
    callToAction: deterministicCta(request, business),
    assumptions,
    businessContext: business,
    recipeVersion: OFFER_RECIPE_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const validation = validateOfferArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}

function isStringWithin(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

function validateStringList(value: unknown, label: string, min: number, max: number) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    return { ok: false as const, list: null, error: `${label} tidak sah.` };
  }
  const list: string[] = [];
  for (const entry of value) {
    if (!isStringWithin(entry, 1, LIMITS.componentLength)) {
      return { ok: false as const, list: null, error: `${label} tidak sah.` };
    }
    list.push(String(entry));
  }
  return { ok: true as const, list, error: null };
}

export function validateOfferArtifact(value: unknown):
  | { ok: true; artifact: OfferArtifact }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["Artifact mesti objek."] };
  }
  const item = value as JsonRecord;
  if (item.schemaVersion !== OFFER_SCHEMA_VERSION) errors.push("Schema version tidak sah.");
  if (item.kind !== "offer") errors.push("Jenis artifact tidak sah.");
  if (!(["draft", "approved"] as const).includes(item.status as OfferStatus)) errors.push("Status artifact tidak sah.");
  if (!OFFER_ENTRIES.includes(item.entry as OfferEntry)) errors.push("Jenis entri artifact tidak sah.");
  if (!OFFER_GOALS.includes(item.goal as OfferGoal)) errors.push("Matlamat artifact tidak sah.");
  if (!OFFER_TYPES.includes(item.offerType as OfferType)) errors.push("Jenis tawaran artifact tidak sah.");
  const sourcePostId = item.sourcePostId === null ? null : Number(item.sourcePostId);
  if (item.entry === "from_social_post" && (!Number.isSafeInteger(sourcePostId) || Number(sourcePostId) < 1)) {
    errors.push("Social Post sumber artifact tidak sah.");
  }
  if (item.entry === "standalone" && sourcePostId !== null) errors.push("Social Post sumber tidak dibenarkan.");
  for (const key of ["product", "audience", "headline", "promise", "priceNote", "callToAction", "recipeVersion", "createdAt", "updatedAt"] as const) {
    if (!isStringWithin(item[key], 1, LIMITS.artifactText)) errors.push(`${key} tidak sah.`);
  }
  if (typeof item.riskReversal !== "string" || item.riskReversal.length > LIMITS.artifactText) {
    errors.push("Risk reversal tidak sah.");
  }
  if (typeof item.urgencyNote !== "string" || item.urgencyNote.length > LIMITS.artifactText) {
    errors.push("Urgency tidak sah.");
  }
  const valueStack = validateStringList(item.valueStack, "Value stack", 3, LIMITS.valueStackCount);
  if (!valueStack.ok) errors.push(valueStack.error!);
  const terms = validateStringList(item.terms, "Syarat", 0, LIMITS.termsCount);
  if (!terms.ok) errors.push(terms.error!);
  if (!Array.isArray(item.assumptions) || item.assumptions.some((entry) => !isStringWithin(entry, 1, 500))) {
    errors.push("Assumption tidak sah.");
  }
  let businessContext: OfferBusinessContextSnapshot | null = null;
  if (!item.businessContext || typeof item.businessContext !== "object" || Array.isArray(item.businessContext)) {
    errors.push("Business Context tidak sah.");
  } else {
    const context = item.businessContext as JsonRecord;
    const contextFields = ["businessName", "category", "products", "targetCustomer", "location", "usp", "toneOfVoice", "priceRange", "platforms"] as const;
    if (contextFields.some((key) => typeof context[key] !== "string" || String(context[key]).length > 500)) {
      errors.push("Business Context tidak sah.");
    } else {
      businessContext = Object.freeze({
        businessName: String(context.businessName),
        category: String(context.category),
        products: String(context.products),
        targetCustomer: String(context.targetCustomer),
        location: String(context.location),
        usp: String(context.usp),
        toneOfVoice: String(context.toneOfVoice),
        priceRange: String(context.priceRange),
        platforms: String(context.platforms),
      });
    }
  }
  if (errors.length || !businessContext || !valueStack.ok || !terms.ok) return { ok: false, errors };
  return {
    ok: true,
    artifact: {
      schemaVersion: OFFER_SCHEMA_VERSION,
      kind: "offer",
      status: item.status as OfferStatus,
      entry: item.entry as OfferEntry,
      sourcePostId,
      offerType: item.offerType as OfferType,
      product: String(item.product),
      goal: item.goal as OfferGoal,
      audience: String(item.audience),
      headline: String(item.headline),
      promise: String(item.promise),
      valueStack: valueStack.list!,
      priceNote: String(item.priceNote),
      terms: terms.list!,
      riskReversal: String(item.riskReversal),
      urgencyNote: String(item.urgencyNote),
      callToAction: String(item.callToAction),
      assumptions: [...(item.assumptions as string[])],
      businessContext,
      recipeVersion: String(item.recipeVersion),
      createdAt: String(item.createdAt),
      updatedAt: String(item.updatedAt),
    },
  };
}

export function renderOfferText(artifact: OfferArtifact) {
  const sections = [
    artifact.headline,
    artifact.promise,
    `Apa yang anda dapat:\n${artifact.valueStack.map((c) => `• ${c}`).join("\n")}`,
    artifact.terms.length ? `Syarat:\n${artifact.terms.map((c) => `• ${c}`).join("\n")}` : "",
    artifact.riskReversal,
    artifact.urgencyNote,
    `Harga: ${artifact.priceNote}`,
    artifact.callToAction,
  ];
  return sections.filter(Boolean).join("\n\n");
}

export function applyOfferEdits(
  existing: OfferArtifact,
  value: unknown,
  now: Date
): OfferArtifact {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Perubahan artifact tidak sah.");
  }
  const input = value as JsonRecord;
  const status = input.status === "approved" ? "approved" : input.status === "draft" ? "draft" : null;
  if (!status) throw new Error("Status artifact tidak sah.");
  const valueStack = validateStringList(input.valueStack, "Value stack", 3, LIMITS.valueStackCount);
  if (!valueStack.ok) throw new Error(valueStack.error!);
  const terms = validateStringList(input.terms, "Syarat", 0, LIMITS.termsCount);
  if (!terms.ok) throw new Error(terms.error!);

  const edited: OfferArtifact = {
    ...existing,
    status,
    headline: requiredText(input.headline, "Headline", 300),
    promise: requiredText(input.promise, "Promise", LIMITS.artifactText),
    valueStack: valueStack.list!,
    priceNote: requiredText(input.priceNote, "Harga", 300),
    terms: terms.list!,
    riskReversal: optionalText(input.riskReversal, "Risk reversal", LIMITS.artifactText),
    callToAction: requiredText(input.callToAction, "CTA", 500),
    updatedAt: now.toISOString(),
  };
  const validation = validateOfferArtifact(edited);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return edited;
}

export function canUseNativeOfferTier(tier: string | null | undefined) {
  return tier === "pro" || tier === "max";
}
