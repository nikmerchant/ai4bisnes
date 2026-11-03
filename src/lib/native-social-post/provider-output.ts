import {
  SOCIAL_POST_SCHEMA_VERSION,
  validateSocialPostArtifact,
  type BusinessContextSnapshot,
  type NativeSocialPostRequest,
  type SocialPostArtifact,
} from "./domain.ts";

export const SOCIAL_POST_PROVIDER_RECIPE_VERSION = "social-post-v1.1.0";

function stripCodeFence(raw: string) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function boundedText(value: unknown, label: string, max: number) {
  if (typeof value !== "string") throw new Error(`${label} provider tidak sah.`);
  const output = value.trim().replace(/\s+/g, " ");
  if (!output || output.length > max) throw new Error(`${label} provider tidak sah.`);
  return output;
}

function hashtags(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    throw new Error("Hashtag provider tidak sah.");
  }
  return value.map((entry) => {
    const output = boundedText(entry, "Hashtag", 50);
    if (!output.startsWith("#")) throw new Error("Hashtag provider tidak sah.");
    return output;
  });
}

function assumptions(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) throw new Error("Assumption provider tidak sah.");
  return value.map((entry) => boundedText(entry, "Assumption", 500));
}

function assertTrustedClaim(claim: string, trusted: string) {
  const compact = (value: string) => value.toLocaleLowerCase("ms-MY").replace(/\s+/g, "");
  if (!compact(trusted).includes(compact(claim))) {
    throw new Error("Output provider mengandungi fakta tidak disahkan.");
  }
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `60${digits.slice(1)}` : digits;
}

function trustedPhones(value: string) {
  return new Set([...value.matchAll(/(?:\+?60|0)(?:[\s-]?\d){8,10}/g)].map((match) => normalizePhone(match[0])));
}

function assertGroundedCopy(output: string, trusted: string) {
  if (/\b(?:arahan sistem|sistem prompt|prompt injection|injeksi prompt|model ai|polisi model|input tidak dipercayai|abaikan (?:arahan|peraturan))\b/i.test(output)) {
    throw new Error("Output provider mendedahkan keselamatan dalaman.");
  }
  if (/\b(?:link|pautan)\s+(?:di\s+)?bio\b/i.test(output) && !/\bbio\b/i.test(trusted)) {
    throw new Error("Output provider mengandungi fakta tidak disahkan.");
  }
  for (const match of output.matchAll(/https?:\/\/[^\s<>"')\]}]+|www\.[^\s<>"')\]}]+/gi)) {
    assertTrustedClaim(match[0].replace(/[.,!?;:]+$/, ""), trusted);
  }
  for (const match of output.matchAll(/\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}(?:\/[^\s<>"')\]}]+)?/gi)) {
    assertTrustedClaim(match[0].replace(/[.,!?;:]+$/, ""), trusted);
  }
  for (const match of output.matchAll(/@[a-z0-9._]{2,}/gi)) assertTrustedClaim(match[0].replace(/[.,!?;:]+$/, ""), trusted);
  const allowedPhones = trustedPhones(trusted);
  for (const match of output.matchAll(/(?:\+?60|0)(?:[\s-]?\d){8,10}/g)) {
    if (!allowedPhones.has(normalizePhone(match[0]))) {
      throw new Error("Output provider mengandungi fakta tidak disahkan.");
    }
  }
  for (const pattern of [
    /\bRM\s*\d[\d.,]*/gi,
    /\b\d[\d.,]*\s*(?:%|peratus|pelanggan|tempahan|jualan|unit|tahun|bulan|hari)\b/gi,
    /\b(?:ratusan|ribuan|jutaan)\s+(?:pelanggan|tempahan|jualan|unit)\b/gi,
  ]) {
    for (const match of output.matchAll(pattern)) assertTrustedClaim(match[0].replace(/[.,!?;:]+$/, ""), trusted);
  }
}

export function parseProviderSocialPostArtifact(input: {
  raw: string;
  business: BusinessContextSnapshot;
  request: NativeSocialPostRequest;
  now: Date;
}): SocialPostArtifact {
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(stripCodeFence(input.raw));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not object");
    parsed = value as Record<string, unknown>;
  } catch {
    throw new Error("Output provider bukan JSON yang sah.");
  }

  const timestamp = input.now.toISOString();
  const artifact: SocialPostArtifact = {
    schemaVersion: SOCIAL_POST_SCHEMA_VERSION,
    kind: "social_post",
    status: "draft",
    platform: input.request.platform,
    objective: input.request.objective,
    angle: input.request.angle,
    topic: input.request.topic,
    hook: boundedText(parsed.hook, "Hook", 160),
    body: boundedText(parsed.body, "Body", 1200),
    callToAction: boundedText(parsed.callToAction, "CTA", 240),
    hashtags: hashtags(parsed.hashtags),
    tone: boundedText(parsed.tone, "Tone", 120),
    assumptions: assumptions(parsed.assumptions),
    businessContext: input.business,
    recipeVersion: SOCIAL_POST_PROVIDER_RECIPE_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  assertGroundedCopy(
    [
      artifact.hook,
      artifact.body,
      artifact.callToAction,
      artifact.hashtags.map((tag) => tag.replace(/^#/, "").replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/(\d)([A-Za-z])/g, "$1 $2")).join(" "),
    ].join("\n"),
    JSON.stringify({ business: input.business, request: input.request }),
  );

  const validation = validateSocialPostArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}
