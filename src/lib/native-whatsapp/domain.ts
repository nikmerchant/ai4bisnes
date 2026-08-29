export { sanitizeGenerationTelemetry } from "../native-social-post/domain";
export type { GenerationTelemetry } from "../native-social-post/domain";

export const WHATSAPP_DRAFT_SCHEMA_VERSION = 1 as const;
export const WHATSAPP_DRAFT_RECIPE_VERSION = "whatsapp-reply-v1.0.0";

export const WHATSAPP_REPLY_INTENTS = [
  "answer_inquiry",
  "send_offer",
  "follow_up",
  "booking_confirm",
] as const;
export const WHATSAPP_ENTRIES = ["standalone", "from_offer"] as const;

export type WhatsAppReplyIntent = (typeof WHATSAPP_REPLY_INTENTS)[number];
export type WhatsAppEntry = (typeof WHATSAPP_ENTRIES)[number];
export type WhatsAppDraftStatus = "draft" | "approved";

export type NativeWhatsAppRequest = {
  entry: WhatsAppEntry;
  sourceOfferId: number | null;
  replyIntent: WhatsAppReplyIntent;
  customerMessage: string;
  customerName: string;
  extraNote: string;
};

export type WhatsAppBusinessContextSnapshot = Readonly<{
  businessName: string;
  products: string;
  targetCustomer: string;
  toneOfVoice: string;
  priceRange: string;
}>;

export type WhatsAppSourceOfferSnapshot = Readonly<{
  id: number;
  headline: string;
  priceNote: string;
  valueStack: string[];
  validUntilNote: string;
}>;

export type WhatsAppDraftArtifact = {
  schemaVersion: typeof WHATSAPP_DRAFT_SCHEMA_VERSION;
  kind: "whatsapp_reply_draft";
  status: WhatsAppDraftStatus;
  entry: WhatsAppEntry;
  sourceOfferId: number | null;
  replyIntent: WhatsAppReplyIntent;
  customerName: string;
  greeting: string;
  acknowledgment: string;
  body: string;
  nextStep: string;
  signOff: string;
  assumptions: string[];
  businessContext: WhatsAppBusinessContextSnapshot;
  recipeVersion: string;
  createdAt: string;
  updatedAt: string;
};

type JsonRecord = Record<string, unknown>;

const LIMITS = {
  customerMessage: 800,
  customerName: 80,
  extraNote: 300,
  artifactText: 1200,
  assumptionsCount: 6,
  valueStackTake: 3,
} as const;

function clip(value: string, max: number) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max + 1);
}

function requiredText(value: unknown, label: string, min: number, max: number) {
  const output = text(value, max);
  if (output.length < min) throw new Error(`${label} diperlukan.`);
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

export function parseNativeWhatsAppRequest(value: unknown): NativeWhatsAppRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Data permintaan tidak sah.");
  }
  const input = value as JsonRecord;
  const entry = enumValue(input.entry, WHATSAPP_ENTRIES, "Jenis entri tidak disokong.");
  const rawSourceOfferId = input.source_offer_id;
  let sourceOfferId: number | null = null;
  if (rawSourceOfferId !== null && rawSourceOfferId !== undefined && rawSourceOfferId !== "") {
    const parsedId = Number(rawSourceOfferId);
    if (!Number.isSafeInteger(parsedId) || parsedId < 1) throw new Error("Offer sumber tidak sah.");
    sourceOfferId = parsedId;
  }
  if (entry === "from_offer" && sourceOfferId === null) throw new Error("Offer sumber diperlukan.");
  if (entry === "standalone" && sourceOfferId !== null) throw new Error("Offer sumber tidak dibenarkan untuk entri standalone.");
  return {
    entry,
    sourceOfferId,
    replyIntent: enumValue(input.reply_intent, WHATSAPP_REPLY_INTENTS, "Niat balasan tidak disokong."),
    customerMessage: requiredText(input.customer_message, "Mesej pelanggan", 1, LIMITS.customerMessage),
    customerName: optionalText(input.customer_name, "Nama pelanggan", LIMITS.customerName),
    extraNote: optionalText(input.extra_note, "Nota tambahan", LIMITS.extraNote),
  };
}

export function buildWhatsAppBusinessContextSnapshot(profile: {
  businessName: string;
  products: string;
  targetCustomer: string;
  toneOfVoice: string;
  priceRange: string;
}): WhatsAppBusinessContextSnapshot {
  return Object.freeze({
    businessName: clip(profile.businessName || "Bisnes saya", 80),
    products: clip(profile.products || "Produk atau servis", 120),
    targetCustomer: clip(profile.targetCustomer || "Pelanggan sasaran", 120),
    toneOfVoice: clip(profile.toneOfVoice || "mesra dan profesional", 60),
    priceRange: clip(profile.priceRange || "", 60),
  });
}

function greetingFor(request: NativeWhatsAppRequest, business: WhatsAppBusinessContextSnapshot) {
  const name = request.customerName ? clip(request.customerName, 60) : "";
  const base = name ? `Hai ${name}` : "Hai";
  return `${base}! Terima kasih kerana menghubungi ${business.businessName}.`;
}

function acknowledgmentFor(request: NativeWhatsAppRequest) {
  const summary = clip(request.customerMessage, 180);
  return `Saya terima mesej anda: "${summary}"`;
}

function bodyFor(input: {
  business: WhatsAppBusinessContextSnapshot;
  request: NativeWhatsAppRequest;
  sourceOffer: WhatsAppSourceOfferSnapshot | null;
}) {
  const { business, request, sourceOffer } = input;
  let baseBody: string;
  if (sourceOffer) {
    const items = sourceOffer.valueStack.slice(0, LIMITS.valueStackTake).map((v) => `• ${clip(v, 150)}`).join("\n");
    const validity = sourceOffer.validUntilNote ? `\n${clip(sourceOffer.validUntilNote, 160)}` : "";
    baseBody = `Berikut adalah tawaran kami yang sedang berjalan:\n\n${clip(sourceOffer.headline, 160)}\n${items}\nHarga: ${clip(sourceOffer.priceNote, 100)}${validity}\n\nJika ada apa-apa yang anda mahu tanya, saya sedia jelaskan.`;
  } else {
    const intents: Record<WhatsAppReplyIntent, string> = {
      answer_inquiry: `Untuk pertanyaan anda, produk utama kami ialah ${business.products}. ${business.priceRange ? `Julat harga: ${business.priceRange}.` : "Harga boleh saya kongsi mengikut keperluan anda."}`,
      send_offer: `Kami ada pilihan untuk ${business.targetCustomer.toLowerCase()} — ${business.products}. ${business.priceRange ? `Bermula ${business.priceRange}.` : ""}`.trim(),
      follow_up: `Mahu follow-up pertanyaan anda sebelum ini tentang ${business.products}. Masih berminat?`,
      booking_confirm: `Untuk tempahan ${business.products}, boleh saya sahkan butiran dengan anda sebelum kita teruskan.`,
    };
    baseBody = intents[request.replyIntent];
  }
  const ownerNote = request.extraNote ? `\n\nNota pemilik: ${clip(request.extraNote, 250)}` : "";
  return clip(`${baseBody}${ownerNote}`, LIMITS.artifactText);
}

function nextStepFor(request: NativeWhatsAppRequest, business: WhatsAppBusinessContextSnapshot) {
  const steps: Record<WhatsAppReplyIntent, string> = {
    answer_inquiry: "Ada lagi soalan? Balas mesej ini, saya bantu jawab.",
    send_offer: "Kalau berminat, balas YA dan saya hantar butiran penuh.",
    follow_up: "Balas mesej ini kalau anda mahu saya simpan tempahan.",
    booking_confirm: `Boleh sahkan tarikh/masa yang sesuai? ${business.businessName} akan uruskan selepas itu.`,
  };
  return clip(steps[request.replyIntent], 300);
}

export function buildDeterministicWhatsAppDraft(input: {
  business: WhatsAppBusinessContextSnapshot;
  request: NativeWhatsAppRequest;
  sourceOffer?: WhatsAppSourceOfferSnapshot | null;
  now: Date;
}): WhatsAppDraftArtifact {
  const { business, request } = input;
  const assumptions: string[] = [];
  if (input.sourceOffer) assumptions.push(`Balasan merujuk Offer diluluskan #${input.sourceOffer.id}.`);
  if (!request.customerName) assumptions.push("Nama pelanggan tidak diberikan; sapaan generik digunakan.");
  if (request.extraNote) assumptions.push("Nota tambahan pemilik dimasukkan sebagai fakta yang perlu disemak sebelum dihantar.");
  if (!input.sourceOffer && request.replyIntent === "send_offer") assumptions.push("Tiada Offer dirujuk; ringkasan generik produk digunakan — luluskan Offer dahulu untuk balasan lebih tepat.");
  assumptions.push("Draf ini belum dihantar; semak dan salin secara manual.");

  const timestamp = input.now.toISOString();
  const artifact: WhatsAppDraftArtifact = {
    schemaVersion: WHATSAPP_DRAFT_SCHEMA_VERSION,
    kind: "whatsapp_reply_draft",
    status: "draft",
    entry: request.entry,
    sourceOfferId: request.sourceOfferId,
    replyIntent: request.replyIntent,
    customerName: request.customerName,
    greeting: clip(greetingFor(request, business), 300),
    acknowledgment: clip(acknowledgmentFor(request), 400),
    body: bodyFor({ business, request, sourceOffer: input.sourceOffer ?? null }),
    nextStep: nextStepFor(request, business),
    signOff: clip(`- ${business.businessName}`, 100),
    assumptions: assumptions.slice(0, LIMITS.assumptionsCount),
    businessContext: business,
    recipeVersion: WHATSAPP_DRAFT_RECIPE_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const validation = validateWhatsAppDraftArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}

function isStringWithin(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

export function validateWhatsAppDraftArtifact(value: unknown):
  | { ok: true; artifact: WhatsAppDraftArtifact }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["Artifact mesti objek."] };
  }
  const item = value as JsonRecord;
  if (item.schemaVersion !== WHATSAPP_DRAFT_SCHEMA_VERSION) errors.push("Schema version tidak sah.");
  if (item.kind !== "whatsapp_reply_draft") errors.push("Jenis artifact tidak sah.");
  if (!(["draft", "approved"] as const).includes(item.status as WhatsAppDraftStatus)) errors.push("Status artifact tidak sah.");
  if (!WHATSAPP_ENTRIES.includes(item.entry as WhatsAppEntry)) errors.push("Jenis entri artifact tidak sah.");
  if (!WHATSAPP_REPLY_INTENTS.includes(item.replyIntent as WhatsAppReplyIntent)) errors.push("Niat balasan artifact tidak sah.");
  const sourceOfferId = item.sourceOfferId === null ? null : Number(item.sourceOfferId);
  if (item.entry === "from_offer" && (!Number.isSafeInteger(sourceOfferId) || Number(sourceOfferId) < 1)) {
    errors.push("Offer sumber artifact tidak sah.");
  }
  if (item.entry === "standalone" && sourceOfferId !== null) errors.push("Offer sumber tidak dibenarkan.");
  for (const key of ["greeting", "acknowledgment", "body", "nextStep", "signOff", "recipeVersion", "createdAt", "updatedAt"] as const) {
    if (!isStringWithin(item[key], 1, LIMITS.artifactText + 400)) errors.push(`${key} tidak sah.`);
  }
  if (!Array.isArray(item.assumptions) || item.assumptions.some((a) => !isStringWithin(a, 1, 500))) {
    errors.push("Assumption tidak sah.");
  }
  let businessContext: WhatsAppBusinessContextSnapshot | null = null;
  if (!item.businessContext || typeof item.businessContext !== "object" || Array.isArray(item.businessContext)) {
    errors.push("Business Context tidak sah.");
  } else {
    const ctx = item.businessContext as JsonRecord;
    if (["businessName", "products", "targetCustomer", "toneOfVoice", "priceRange"].some((k) => typeof ctx[k] !== "string")) {
      errors.push("Business Context tidak sah.");
    } else {
      businessContext = Object.freeze({
        businessName: String(ctx.businessName),
        products: String(ctx.products),
        targetCustomer: String(ctx.targetCustomer),
        toneOfVoice: String(ctx.toneOfVoice),
        priceRange: String(ctx.priceRange),
      });
    }
  }
  if (errors.length || !businessContext) return { ok: false, errors };
  return {
    ok: true,
    artifact: {
      schemaVersion: WHATSAPP_DRAFT_SCHEMA_VERSION,
      kind: "whatsapp_reply_draft",
      status: item.status as WhatsAppDraftStatus,
      entry: item.entry as WhatsAppEntry,
      sourceOfferId,
      replyIntent: item.replyIntent as WhatsAppReplyIntent,
      customerName: typeof item.customerName === "string" ? item.customerName.slice(0, LIMITS.customerName) : "",
      greeting: String(item.greeting),
      acknowledgment: String(item.acknowledgment),
      body: String(item.body),
      nextStep: String(item.nextStep),
      signOff: String(item.signOff),
      assumptions: [...(item.assumptions as string[])],
      businessContext,
      recipeVersion: String(item.recipeVersion),
      createdAt: String(item.createdAt),
      updatedAt: String(item.updatedAt),
    },
  };
}

export function renderWhatsAppDraftText(artifact: WhatsAppDraftArtifact) {
  return [artifact.greeting, artifact.acknowledgment, artifact.body, artifact.nextStep, artifact.signOff]
    .filter(Boolean)
    .join("\n\n");
}

export function applyWhatsAppDraftEdits(
  existing: WhatsAppDraftArtifact,
  value: unknown,
  now: Date
): WhatsAppDraftArtifact {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Perubahan artifact tidak sah.");
  }
  const input = value as JsonRecord;
  const status = input.status === "approved" ? "approved" : input.status === "draft" ? "draft" : null;
  if (!status) throw new Error("Status artifact tidak sah.");
  const edited: WhatsAppDraftArtifact = {
    ...existing,
    status,
    greeting: requiredText(input.greeting, "Sapaan", 1, 400),
    acknowledgment: requiredText(input.acknowledgment, "Pengesahan", 1, 500),
    body: requiredText(input.body, "Badan mesej", 1, LIMITS.artifactText),
    nextStep: requiredText(input.nextStep, "Langkah seterusnya", 1, 400),
    signOff: requiredText(input.signOff, "Tandatangan", 1, 120),
    updatedAt: now.toISOString(),
  };
  const validation = validateWhatsAppDraftArtifact(edited);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return edited;
}

export function canUseNativeWhatsAppTier(tier: string | null | undefined) {
  return tier === "pro" || tier === "max";
}
