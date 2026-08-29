import {
  buildDeterministicWhatsAppDraft,
  validateWhatsAppDraftArtifact,
  type WhatsAppBusinessContextSnapshot,
  type NativeWhatsAppRequest,
  type WhatsAppDraftArtifact,
  type WhatsAppSourceOfferSnapshot,
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

function assumptions(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 6) throw new Error("Assumption provider tidak sah.");
  return value.map((entry) => boundedText(entry, "Assumption", 500));
}

export function parseProviderWhatsAppDraft(input: {
  raw: string;
  business: WhatsAppBusinessContextSnapshot;
  request: NativeWhatsAppRequest;
  sourceOffer?: WhatsAppSourceOfferSnapshot | null;
  now: Date;
}): WhatsAppDraftArtifact {
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(stripCodeFence(input.raw));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not object");
    parsed = value as Record<string, unknown>;
  } catch {
    throw new Error("Output provider bukan JSON yang sah.");
  }

  const baseline = buildDeterministicWhatsAppDraft({
    business: input.business,
    request: input.request,
    sourceOffer: input.sourceOffer,
    now: input.now,
  });
  const artifact: WhatsAppDraftArtifact = {
    ...baseline,
    greeting: boundedText(parsed.greeting, "Sapaan", 400),
    acknowledgment: boundedText(parsed.acknowledgment, "Pengesahan", 500),
    body: boundedText(parsed.body, "Badan mesej", 1200),
    nextStep: boundedText(parsed.nextStep, "Langkah seterusnya", 400),
    assumptions: [
      ...baseline.assumptions,
      "Teks provider ialah cadangan; semak fakta sebelum meluluskan.",
      ...assumptions(parsed.assumptions),
    ].slice(0, 6),
  };

  const validation = validateWhatsAppDraftArtifact(artifact);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return artifact;
}
