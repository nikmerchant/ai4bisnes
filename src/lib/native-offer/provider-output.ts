import {
  buildDeterministicOffer,
  validateOfferArtifact,
  type OfferBusinessContextSnapshot,
  type NativeOfferRequest,
  type OfferArtifact,
  type OfferSourcePostSnapshot,
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

function componentList(value: unknown, label: string, min: number) {
  if (!Array.isArray(value) || value.length < min || value.length > 5) {
    throw new Error(`${label} provider tidak sah.`);
  }
  return value.map((entry) => boundedText(entry, label, 300));
}

function assumptions(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) throw new Error("Assumption provider tidak sah.");
  return value.map((entry) => boundedText(entry, "Assumption", 500));
}

export function parseProviderOfferArtifact(input: {
  raw: string;
  business: OfferBusinessContextSnapshot;
  request: NativeOfferRequest;
  sourcePost?: OfferSourcePostSnapshot | null;
  now: Date;
}): OfferArtifact {
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(stripCodeFence(input.raw));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not object");
    parsed = value as Record<string, unknown>;
  } catch {
    throw new Error("Output provider bukan JSON yang sah.");
  }

  const baseline = buildDeterministicOffer({ business: input.business, request: input.request, sourcePost: input.sourcePost, now: input.now });
  const artifact: OfferArtifact = {
    ...baseline,
    headline: boundedText(parsed.headline, "Headline", 300),
    promise: boundedText(parsed.promise, "Promise", 2000),
    valueStack: componentList(parsed.valueStack, "Value stack", 3),
    callToAction: boundedText(parsed.callToAction, "CTA", 500),
    assumptions: [
      ...baseline.assumptions,
      "Komponen nilai yang dijana provider ialah cadangan; sahkan setiap item sebelum meluluskan.",
      ...assumptions(parsed.assumptions),
    ],
  };

  const validation = validateOfferArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}
