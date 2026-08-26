export const SOCIAL_POST_SCHEMA_VERSION = 1 as const;
export const SOCIAL_POST_RECIPE_VERSION = "social-post-v1.0.0";

export const SOCIAL_POST_PLATFORMS = ["facebook", "instagram", "tiktok", "linkedin"] as const;
export const SOCIAL_POST_OBJECTIVES = ["awareness", "engagement", "leads", "sales", "education"] as const;
export const SOCIAL_POST_ANGLES = [
  "problem_solution",
  "story",
  "education",
  "social_proof",
  "promotion",
  "behind_scenes",
] as const;

export type SocialPostPlatform = (typeof SOCIAL_POST_PLATFORMS)[number];
export type SocialPostObjective = (typeof SOCIAL_POST_OBJECTIVES)[number];
export type SocialPostAngle = (typeof SOCIAL_POST_ANGLES)[number];
export type SocialPostStatus = "draft" | "approved";

export type NativeSocialPostRequest = {
  platform: SocialPostPlatform;
  objective: SocialPostObjective;
  angle: SocialPostAngle;
  topic: string;
  offer: string;
  extraInstruction: string;
};

export type NativeSocialPostBusinessProfile = {
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

export type BusinessContextSnapshot = Readonly<NativeSocialPostBusinessProfile>;

export type SocialPostArtifact = {
  schemaVersion: typeof SOCIAL_POST_SCHEMA_VERSION;
  kind: "social_post";
  status: SocialPostStatus;
  platform: SocialPostPlatform;
  objective: SocialPostObjective;
  angle: SocialPostAngle;
  topic: string;
  hook: string;
  body: string;
  callToAction: string;
  hashtags: string[];
  tone: string;
  assumptions: string[];
  businessContext: BusinessContextSnapshot;
  recipeVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type GenerationTelemetry = {
  provider: string;
  model: string;
  mode: "deterministic_local" | "provider" | "deterministic_fallback";
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostRm: number | null;
};

type JsonRecord = Record<string, unknown>;

const LIMITS = {
  topic: 200,
  offer: 300,
  extraInstruction: 300,
  artifactText: 2000,
  hashtagCount: 10,
  hashtagLength: 50,
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

export function parseNativeSocialPostRequest(value: unknown): NativeSocialPostRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Data permintaan tidak sah.");
  }
  const input = value as JsonRecord;
  return {
    platform: enumValue(input.platform, SOCIAL_POST_PLATFORMS, "Platform tidak disokong."),
    objective: enumValue(input.objective, SOCIAL_POST_OBJECTIVES, "Objektif tidak disokong."),
    angle: enumValue(input.angle, SOCIAL_POST_ANGLES, "Angle tidak disokong."),
    topic: requiredText(input.topic, "Topik", LIMITS.topic),
    offer: optionalText(input.offer, "Tawaran", LIMITS.offer),
    extraInstruction: optionalText(input.extraInstruction, "Arahan tambahan", LIMITS.extraInstruction),
  };
}

export function buildBusinessContextSnapshot(
  profile: NativeSocialPostBusinessProfile
): BusinessContextSnapshot {
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

function slugToken(value: string, fallback: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return normalized || fallback;
}

function deterministicHook(input: {
  business: BusinessContextSnapshot;
  request: NativeSocialPostRequest;
}) {
  const { business, request } = input;
  const subject = request.offer || request.topic;
  const hooks: Record<SocialPostAngle, string> = {
    problem_solution: `${business.targetCustomer}, masih mencari cara lebih mudah untuk ${request.topic.toLowerCase()}?`,
    story: `Di ${business.businessName}, semuanya bermula dengan satu matlamat: ${request.topic.toLowerCase()}.`,
    education: `Tiga perkara penting yang anda perlu tahu tentang ${request.topic.toLowerCase()}.`,
    social_proof: `Mengapa pelanggan memilih ${business.businessName} untuk ${business.products.toLowerCase()}?`,
    promotion: `${subject} — khas untuk pelanggan ${business.businessName}.`,
    behind_scenes: `Di sebalik ${business.businessName}: begini kami menyediakan ${business.products.toLowerCase()}.`,
  };
  return hooks[request.angle];
}

function deterministicCta(request: NativeSocialPostRequest) {
  const ctas: Record<SocialPostObjective, string> = {
    awareness: "Ikuti kami untuk lebih banyak tip dan perkembangan terkini.",
    engagement: "Kongsikan pendapat anda di ruangan komen.",
    leads: "Hantar mesej kepada kami untuk mendapatkan maklumat lanjut.",
    sales: "Hubungi kami hari ini untuk membuat tempahan.",
    education: "Simpan post ini supaya mudah dirujuk kemudian.",
  };
  return ctas[request.objective];
}

export function buildDeterministicSocialPost(input: {
  business: BusinessContextSnapshot;
  request: NativeSocialPostRequest;
  now: Date;
}): SocialPostArtifact {
  const { business, request } = input;
  const offerSentence = request.offer ? ` Tawaran semasa: ${request.offer}.` : "";
  const uspSentence = business.usp ? ` Kelebihan kami: ${business.usp}.` : "";
  const assumptions: string[] = [];
  if (!business.usp) assumptions.push("USP tidak diisi; output menggunakan maklumat produk yang tersedia.");
  if (!request.offer) assumptions.push("Tawaran khusus tidak diberikan.");

  const timestamp = input.now.toISOString();
  const artifact: SocialPostArtifact = {
    schemaVersion: SOCIAL_POST_SCHEMA_VERSION,
    kind: "social_post",
    status: "draft",
    platform: request.platform,
    objective: request.objective,
    angle: request.angle,
    topic: request.topic,
    hook: deterministicHook(input),
    body: `${business.businessName} menyediakan ${business.products} untuk ${business.targetCustomer} di ${business.location}.${uspSentence}${offerSentence}`,
    callToAction: deterministicCta(request),
    hashtags: [
      `#${slugToken(business.businessName, "BisnesMalaysia")}`,
      `#${slugToken(business.category, "PKSMalaysia")}`,
      `#${slugToken(request.topic, "TipBisnes")}`,
      "#PKSMalaysia",
    ].filter((value, index, array) => array.indexOf(value) === index),
    tone: business.toneOfVoice,
    assumptions,
    businessContext: business,
    recipeVersion: SOCIAL_POST_RECIPE_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const validation = validateSocialPostArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}

function isStringWithin(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

export function validateSocialPostArtifact(value: unknown):
  | { ok: true; artifact: SocialPostArtifact }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["Artifact mesti objek."] };
  }
  const item = value as JsonRecord;
  if (item.schemaVersion !== SOCIAL_POST_SCHEMA_VERSION) errors.push("Schema version tidak sah.");
  if (item.kind !== "social_post") errors.push("Jenis artifact tidak sah.");
  if (!(["draft", "approved"] as const).includes(item.status as SocialPostStatus)) errors.push("Status artifact tidak sah.");
  if (!SOCIAL_POST_PLATFORMS.includes(item.platform as SocialPostPlatform)) errors.push("Platform artifact tidak sah.");
  if (!SOCIAL_POST_OBJECTIVES.includes(item.objective as SocialPostObjective)) errors.push("Objektif artifact tidak sah.");
  if (!SOCIAL_POST_ANGLES.includes(item.angle as SocialPostAngle)) errors.push("Angle artifact tidak sah.");
  for (const key of ["topic", "hook", "body", "callToAction", "tone", "recipeVersion", "createdAt", "updatedAt"] as const) {
    if (!isStringWithin(item[key], 1, LIMITS.artifactText)) errors.push(`${key} tidak sah.`);
  }
  if (!Array.isArray(item.hashtags) || item.hashtags.length < 1 || item.hashtags.length > LIMITS.hashtagCount) {
    errors.push("Hashtag tidak sah.");
  } else if (item.hashtags.some((tag) => !isStringWithin(tag, 2, LIMITS.hashtagLength) || !(tag as string).startsWith("#"))) {
    errors.push("Format hashtag tidak sah.");
  }
  if (!Array.isArray(item.assumptions) || item.assumptions.some((entry) => !isStringWithin(entry, 1, 500))) {
    errors.push("Assumption tidak sah.");
  }
  let businessContext: BusinessContextSnapshot | null = null;
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
  if (errors.length || !businessContext) return { ok: false, errors };
  return {
    ok: true,
    artifact: {
      schemaVersion: SOCIAL_POST_SCHEMA_VERSION,
      kind: "social_post",
      status: item.status as SocialPostStatus,
      platform: item.platform as SocialPostPlatform,
      objective: item.objective as SocialPostObjective,
      angle: item.angle as SocialPostAngle,
      topic: String(item.topic),
      hook: String(item.hook),
      body: String(item.body),
      callToAction: String(item.callToAction),
      hashtags: [...(item.hashtags as string[])],
      tone: String(item.tone),
      assumptions: [...(item.assumptions as string[])],
      businessContext,
      recipeVersion: String(item.recipeVersion),
      createdAt: String(item.createdAt),
      updatedAt: String(item.updatedAt),
    },
  };
}

export function renderSocialPostText(artifact: SocialPostArtifact) {
  return [artifact.hook, artifact.body, artifact.callToAction, artifact.hashtags.join(" ")]
    .filter(Boolean)
    .join("\n\n");
}

export function applySocialPostEdits(
  existing: SocialPostArtifact,
  value: unknown,
  now: Date
): SocialPostArtifact {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Perubahan artifact tidak sah.");
  }
  const input = value as JsonRecord;
  const status = input.status === "approved" ? "approved" : input.status === "draft" ? "draft" : null;
  if (!status) throw new Error("Status artifact tidak sah.");
  if (!Array.isArray(input.hashtags) || input.hashtags.length < 1 || input.hashtags.length > LIMITS.hashtagCount) {
    throw new Error("Hashtag artifact tidak sah.");
  }
  const edited: SocialPostArtifact = {
    ...existing,
    status,
    hook: requiredText(input.hook, "Hook", 500),
    body: requiredText(input.body, "Body", LIMITS.artifactText),
    callToAction: requiredText(input.callToAction, "CTA", 500),
    hashtags: input.hashtags.map((entry) => {
      const tag = requiredText(entry, "Hashtag", LIMITS.hashtagLength);
      if (!tag.startsWith("#")) throw new Error("Format hashtag tidak sah.");
      return tag;
    }),
    updatedAt: now.toISOString(),
  };
  const validation = validateSocialPostArtifact(edited);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return edited;
}

export function sanitizeGenerationTelemetry(value: JsonRecord): GenerationTelemetry {
  const safeMode = ["deterministic_local", "provider", "deterministic_fallback"].includes(String(value.mode))
    ? (String(value.mode) as GenerationTelemetry["mode"])
    : "deterministic_fallback";
  const boundedNumber = (input: unknown, max: number) =>
    Number.isFinite(Number(input)) ? Math.max(0, Math.min(max, Number(input))) : 0;
  const estimated = value.estimatedCostRm;
  return {
    provider: text(value.provider, 80) || "unknown",
    model: text(value.model, 120) || "unknown",
    mode: safeMode,
    latencyMs: Math.round(boundedNumber(value.latencyMs, 300_000)),
    inputTokens: Math.round(boundedNumber(value.inputTokens, 1_000_000)),
    outputTokens: Math.round(boundedNumber(value.outputTokens, 1_000_000)),
    estimatedCostRm: estimated === null || estimated === undefined
      ? null
      : Math.round(boundedNumber(estimated, 10_000) * 1_000_000) / 1_000_000,
  };
}

export function toGeneratedOutputEnvelope(input: {
  requestId: string;
  request: NativeSocialPostRequest;
  artifact: SocialPostArtifact;
  telemetry: GenerationTelemetry;
}) {
  return {
    task_slug: "native-social-post",
    task_title: "Native Social Post",
    inputs: {
      schema_version: SOCIAL_POST_SCHEMA_VERSION,
      request_id: input.requestId,
      request: input.request,
      artifact: input.artifact,
      generation: input.telemetry,
    },
    prompt_text: renderSocialPostText(input.artifact),
  };
}

export function canUseNativeSocialPostTier(tier: string | null | undefined) {
  return tier === "pro" || tier === "max";
}
