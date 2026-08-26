import {
  SOCIAL_POST_RECIPE_VERSION,
  SOCIAL_POST_SCHEMA_VERSION,
  validateSocialPostArtifact,
  type BusinessContextSnapshot,
  type NativeSocialPostRequest,
  type SocialPostArtifact,
} from "./domain.ts";

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
    hook: boundedText(parsed.hook, "Hook", 500),
    body: boundedText(parsed.body, "Body", 2000),
    callToAction: boundedText(parsed.callToAction, "CTA", 500),
    hashtags: hashtags(parsed.hashtags),
    tone: boundedText(parsed.tone, "Tone", 120),
    assumptions: assumptions(parsed.assumptions),
    businessContext: input.business,
    recipeVersion: SOCIAL_POST_RECIPE_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const validation = validateSocialPostArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}
