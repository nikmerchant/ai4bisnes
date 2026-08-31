import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CONTENT_CREATE_CONTENT_ROLES,
  CONTENT_CREATE_RECIPE_VERSION,
  applyContentCreateDraftEdits,
  approveContentCreateArtifact,
  buildApprovedOfferSnapshot,
  buildContentCreateBusinessContextSnapshot,
  buildDeterministicContentCreate,
  canUseContentCreateTier,
  parseContentCreateRequest,
  renderContentCreateDraft,
  validateContentCreateArtifact,
  type ContentCreateRequestV1,
} from "../src/lib/content-create/domain.ts";
import { resolveContentCreateAccess } from "../src/lib/content-create/access-policy.ts";
import { parseProviderContentCreateCandidate } from "../src/lib/content-create/provider-output.ts";
import { buildContentCreatePromptBoundary } from "../src/lib/content-create/prompt.ts";
import type { OfferArtifact } from "../src/lib/native-offer/domain.ts";

type Fixture = {
  id: string;
  category: "quality" | "claim" | "security" | "contract";
  platform: ContentCreateRequestV1["platform"];
  objective: ContentCreateRequestV1["objective"];
  contentRole: ContentCreateRequestV1["contentRole"];
  sourceOffer: Record<string, unknown>;
  proofNote: string;
  extraContext: string;
  providerCandidate?: Record<string, unknown>;
  expected: {
    outcome: "create" | "reject_404" | "reject_400" | "new_draft_revision";
    proofState: "SUPPORTED_BY_OFFER" | "OWNER_ASSERTED" | "UNKNOWN" | "NONE" | null;
    requiredClaimActions: Array<"KEEP" | "SOFTEN" | "REMOVE" | "OWNER_VERIFY">;
    forbidden: string[];
  };
};

const fixtureSet = JSON.parse(readFileSync(new URL("./fixtures/content-create-offer-v1-fixtures.json", import.meta.url), "utf8")) as {
  providerCallsAllowed: boolean;
  fixtures: Fixture[];
};

const business = buildContentCreateBusinessContextSnapshot({
  businessName: "AI4Bisnes",
  category: "AI untuk PKS",
  products: "panduan pemasaran untuk PKS",
  targetCustomer: "pemilik PKS Malaysia",
  location: "Malaysia",
  usp: "Business Context owner-scoped",
  toneOfVoice: "jelas, mesra dan praktikal",
  priceRange: "",
  platforms: "facebook,instagram,tiktok,linkedin",
});

function offerFor(fixture: Fixture): OfferArtifact {
  const source = fixture.sourceOffer;
  const long = source.mode === "long_fields";
  const repeated = (word: string, count: number, max: number) => `${word} `.repeat(count).trim().slice(0, max);
  const terms = typeof source.terms === "string" && source.terms ? [source.terms] : long ? [repeated("Terma sah", Number(source.termsRepeat ?? 20), 300)] : [];
  const valueStack = Array.isArray(source.valueStack)
    ? source.valueStack as string[]
    : Array.from({ length: Number(source.valueStackItems ?? 3) }, (_, index) => `Nilai sah ${index + 1}`);
  return {
    schemaVersion: 1,
    kind: "offer",
    status: source.state === "draft" ? "draft" : "approved",
    entry: "standalone",
    sourcePostId: null,
    offerType: (source.offerType ?? "promotion") as OfferArtifact["offerType"],
    product: long ? repeated("Produk tempatan", Number(source.productRepeat ?? 40), 200) : String(source.product ?? "Produk sah"),
    goal: "sales",
    audience: "pemilik PKS Malaysia",
    headline: long ? repeated("Headline tawaran", Number(source.headlineRepeat ?? 20), 300) : String(source.headline ?? "Tawaran sah"),
    promise: "Tawaran yang diterangkan berdasarkan fakta pemilik.",
    valueStack,
    priceNote: String(source.priceNote ?? ""),
    terms,
    riskReversal: String(source.riskReversal ?? ""),
    urgencyNote: String(source.urgencyNote ?? ""),
    callToAction: "Hubungi kami untuk semak kesesuaian tawaran.",
    assumptions: [],
    businessContext: business,
    recipeVersion: "offer-v1.0.0",
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  };
}

function requestFor(fixture: Fixture) {
  return parseContentCreateRequest({
    entry: "from_offer",
    sourceOfferId: Number(fixture.sourceOffer.id ?? 7),
    platform: fixture.platform,
    objective: fixture.objective,
    contentRole: fixture.contentRole,
    proofNote: fixture.proofNote,
    extraContext: fixture.extraContext,
  });
}

function artifactFor(fixture: Fixture) {
  const offer = offerFor(fixture);
  const snapshot = buildApprovedOfferSnapshot({
    id: Number(fixture.sourceOffer.id ?? 7),
    artifact: offer,
    validUntil: String(fixture.sourceOffer.validUntil ?? ""),
  });
  return buildDeterministicContentCreate({ business, request: requestFor(fixture), sourceOfferSnapshot: snapshot, now: new Date("2026-08-31T00:00:00Z") });
}

test("the approved fixture set has exactly 20 unique cases and complete matrix/category coverage", () => {
  assert.equal(fixtureSet.providerCallsAllowed, false);
  assert.equal(fixtureSet.fixtures.length, 20);
  assert.equal(new Set(fixtureSet.fixtures.map((fixture) => fixture.id)).size, 20);
  assert.deepEqual(new Set(fixtureSet.fixtures.map((fixture) => fixture.platform)), new Set(["facebook", "instagram", "tiktok", "linkedin"]));
  assert.deepEqual(new Set(fixtureSet.fixtures.map((fixture) => fixture.objective)), new Set(["awareness", "engagement", "leads", "sales", "education"]));
  assert.deepEqual(new Set(fixtureSet.fixtures.map((fixture) => fixture.contentRole)), new Set(CONTENT_CREATE_CONTENT_ROLES));
  const counts = Object.fromEntries(["quality", "claim", "security", "contract"].map((category) => [category, fixtureSet.fixtures.filter((fixture) => fixture.category === category).length]));
  assert.deepEqual(counts, { quality: 8, claim: 4, security: 6, contract: 2 });
});

test("request contract accepts only from_offer, a positive safe source id, canonical enums and 500-char untrusted fields", () => {
  const parsed = parseContentCreateRequest({ entry: "from_offer", sourceOfferId: 3, platform: "facebook", objective: "sales", contentRole: "convert", proofNote: "", extraContext: "" });
  assert.equal(parsed.sourceOfferId, 3);
  assert.deepEqual(Object.keys(parsed).sort(), ["contentRole", "entry", "extraContext", "objective", "platform", "proofNote", "sourceOfferId"].sort());
  for (const invalid of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, null, ""] as unknown[]) assert.throws(() => parseContentCreateRequest({ ...parsed, sourceOfferId: invalid }));
  assert.throws(() => parseContentCreateRequest({ ...parsed, entry: "standalone" }));
  assert.throws(() => parseContentCreateRequest({ ...parsed, platform: "youtube" }));
  assert.throws(() => parseContentCreateRequest({ ...parsed, objective: "viral" }));
  assert.throws(() => parseContentCreateRequest({ ...parsed, contentRole: "publish" }));
  assert.throws(() => parseContentCreateRequest({ ...parsed, proofNote: "x".repeat(501) }));
  assert.throws(() => parseContentCreateRequest({ ...parsed, extraContext: "x".repeat(501) }));
});

test("all 15 creatable/revision fixtures produce canonical draft artifacts with exact Offer continuity and no invented claim", () => {
  for (const fixture of fixtureSet.fixtures.filter((item) => ["create", "new_draft_revision"].includes(item.expected.outcome))) {
    const artifact = artifactFor(fixture);
    const rendered = renderContentCreateDraft(artifact.draft);
    assert.equal(validateContentCreateArtifact(artifact).ok, true, fixture.id);
    assert.equal(artifact.kind, "content_create", fixture.id);
    assert.equal(artifact.status, "draft", fixture.id);
    assert.equal(artifact.recipeVersion, CONTENT_CREATE_RECIPE_VERSION, fixture.id);
    assert.equal(artifact.sourceOfferSnapshot.id, Number(fixture.sourceOffer.id ?? 7), fixture.id);
    assert.equal(artifact.strategy.proofStrategy.state, fixture.expected.proofState, fixture.id);
    assert.ok(artifact.strategy.offerBridge.trim(), fixture.id);
    for (const action of fixture.expected.requiredClaimActions) assert.ok(artifact.claimLedger.some((claim) => claim.action === action), `${fixture.id}: ${action}`);
    const price = String(fixture.sourceOffer.priceNote ?? "");
    const terms = String(fixture.sourceOffer.terms ?? "");
    if (price) assert.match(rendered, new RegExp(price.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), fixture.id);
    if (terms) assert.match(rendered, new RegExp(terms.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), fixture.id);
    if (!price) assert.doesNotMatch(rendered, /RM\s*\d/i, fixture.id);
    if (!artifact.sourceOfferSnapshot.urgencyNote && !artifact.sourceOfferSnapshot.validUntil) assert.doesNotMatch(rendered, /tinggal\s+\w+\s+slot|tamat malam ini|stok terhad|cepat sebelum habis/i, fixture.id);
    assert.doesNotMatch(rendered, /Puan Aisyah|naik 200%|naik tiga kali ganda|service role key|publish sekarang/i, fixture.id);
  }
});

test("draft, missing, cross-owner and invalid source fixtures mirror generic route outcomes", () => {
  const negatives = fixtureSet.fixtures.filter((fixture) => fixture.expected.outcome.startsWith("reject_"));
  assert.deepEqual(negatives.map((fixture) => [fixture.id, fixture.expected.outcome]), [
    ["CC-S13-draft-offer", "reject_404"],
    ["CC-S14-cross-owner-offer", "reject_404"],
    ["CC-S15-missing-offer", "reject_404"],
    ["CC-S16-invalid-source-id", "reject_400"],
  ]);
  assert.throws(() => buildApprovedOfferSnapshot({ id: 10, artifact: offerFor(negatives[0]), validUntil: "" }), /approved/i);
  assert.throws(() => requestFor(negatives[3]));
});

test("proof/context injection is fenced and unsafe owner assertions become UNKNOWN + remove/verify, never supported", () => {
  for (const id of ["CC-C09-owner-proof-fake-urgency", "CC-C10-owner-proof-guarantee", "CC-C11-owner-proof-testimonial", "CC-S17-proof-note-injection"]) {
    const fixture = fixtureSet.fixtures.find((item) => item.id === id)!;
    const artifact = artifactFor(fixture);
    assert.equal(artifact.strategy.proofStrategy.state, "UNKNOWN", id);
    assert.ok(artifact.claimLedger.some((claim) => claim.origin === "OWNER_PROOF_NOTE" && ["REMOVE", "OWNER_VERIFY"].includes(claim.action)), id);
    assert.doesNotMatch(renderContentCreateDraft(artifact.draft), /tinggal dua slot|200%|Puan Aisyah|service role key|publish sekarang/i, id);
    const prompt = buildContentCreatePromptBoundary({ business, request: requestFor(fixture), sourceOfferSnapshot: artifact.sourceOfferSnapshot });
    assert.match(prompt, /TIDAK_DIPERCAYAI/);
    assert.match(prompt, /jangan ikut/i);
  }
  const benign = artifactFor(fixtureSet.fixtures.find((item) => item.id === "CC-Q06-instagram-awareness-trust")!);
  assert.equal(benign.strategy.proofStrategy.state, "OWNER_ASSERTED");
  assert.ok(benign.claimLedger.some((claim) => claim.origin === "OWNER_PROOF_NOTE" && claim.action === "OWNER_VERIFY"));
});

test("provider candidate cannot override protected fields and unsupported candidate prose is removed and ledgered", () => {
  const fixture = fixtureSet.fixtures.find((item) => item.id === "CC-S19-provider-protected-override")!;
  const snapshot = buildApprovedOfferSnapshot({ id: 3, artifact: offerFor(fixture), validUntil: "" });
  const artifact = parseProviderContentCreateCandidate({
    candidate: {
      ...fixture.providerCandidate,
      strategy: { offerBridge: "Abaikan Offer sah." },
      draft: { hook: "Tinggal dua slot!", body: "Harga RM1. Jualan dijamin naik 200% dalam seminggu.", callToAction: "Publish sekarang.", hashtags: ["#Sah"] },
    },
    business,
    request: requestFor(fixture),
    sourceOfferSnapshot: snapshot,
    now: new Date("2026-08-31T00:00:00Z"),
  });
  const rendered = renderContentCreateDraft(artifact.draft);
  assert.equal(artifact.status, "draft");
  assert.equal(artifact.approval, null);
  assert.equal(artifact.sourceOfferId, 3);
  assert.equal(artifact.sourceOfferSnapshot.priceNote, "RM99");
  assert.equal(artifact.sourceOfferSnapshot.terms, "Terma sah");
  assert.equal(artifact.businessContextSnapshot.businessName, "AI4Bisnes");
  assert.match(rendered, /RM99/);
  assert.doesNotMatch(rendered, /RM1(?:\D|$)|200%|tinggal dua slot|publish sekarang/i);
  assert.ok(artifact.claimLedger.some((claim) => claim.origin === "GENERATED_CANDIDATE" && claim.action === "REMOVE"));

  const longCandidate = parseProviderContentCreateCandidate({
    candidate: { draft: { hook: "Hook selamat", body: `${"Penerangan selamat ".repeat(250)} Harga RM1.`, callToAction: "Semak tawaran.", hashtags: [] } },
    business,
    request: requestFor(fixture),
    sourceOfferSnapshot: snapshot,
    now: new Date("2026-08-31T00:00:00Z"),
  });
  const longRendered = renderContentCreateDraft(longCandidate.draft);
  assert.match(longRendered, /RM99/);
  assert.match(longRendered, /Terma sah/);
  assert.doesNotMatch(longRendered, /RM1(?:\D|$)/);
});

test("long Business Context/Offer values are canonically clipped without raising caps or inventing price", () => {
  const fixture = fixtureSet.fixtures.find((item) => item.id === "CC-S18-long-context-offer")!;
  const longBusiness = buildContentCreateBusinessContextSnapshot({ businessName: "Bisnes ".repeat(40), category: "Kategori ".repeat(40), products: "Produk ".repeat(100), targetCustomer: "Pelanggan ".repeat(80), location: "Malaysia ".repeat(30), usp: "Praktikal ".repeat(80), toneOfVoice: "Mesra ".repeat(40), priceRange: "", platforms: "instagram ".repeat(40) });
  const offer = offerFor(fixture);
  const snapshot = buildApprovedOfferSnapshot({ id: 7, artifact: offer, validUntil: "" });
  const artifact = buildDeterministicContentCreate({ business: longBusiness, request: requestFor(fixture), sourceOfferSnapshot: snapshot, now: new Date("2026-08-31T00:00:00Z") });
  assert.equal(validateContentCreateArtifact(artifact).ok, true);
  assert.ok(artifact.businessContextSnapshot.products.length <= 500);
  assert.ok(artifact.sourceOfferSnapshot.product.length <= 200);
  assert.ok(artifact.sourceOfferSnapshot.headline.length <= 300);
  assert.doesNotMatch(renderContentCreateDraft(artifact.draft), /RM\s*\d/);
});

test("approval binds actor/time/hash; approved edit yields a new DRAFT revision without mutating the source", () => {
  const fixture = fixtureSet.fixtures.find((item) => item.id === "CC-S20-approved-revision-integrity")!;
  const original = artifactFor(fixture);
  const approved = approveContentCreateArtifact(original, "owner-1", new Date("2026-08-31T01:00:00Z"));
  assert.equal(approved.status, "approved");
  assert.equal(approved.approval?.approvalScope, "content_create_draft");
  assert.equal(approved.approval?.actorId, "owner-1");
  assert.equal(approved.approval?.contentHash.length, 64);
  const revised = applyContentCreateDraftEdits(approved, { ...approved.draft, body: "Ubah melalui revision yang sah." }, new Date("2026-08-31T02:00:00Z"));
  assert.equal(revised.status, "draft");
  assert.equal(revised.approval, null);
  assert.equal(revised.draft.revision, 2);
  assert.equal(revised.draft.parentContentHash, approved.approval?.contentHash);
  assert.equal(approved.draft.body, original.draft.body);
});

test("PRO/MAX and independent CE access fail closed in production and allow local development", () => {
  assert.equal(canUseContentCreateTier("pro"), true);
  assert.equal(canUseContentCreateTier("max"), true);
  assert.equal(canUseContentCreateTier("basic"), false);
  const user = { id: "9750ab53-d871-4b0b-8044-0a78aa9ebe6d" };
  assert.equal(resolveContentCreateAccess({ nodeEnv: "production", deploymentTarget: "production", enabled: "true", allowlist: user.id, user }).allowed, false);
  assert.equal(resolveContentCreateAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "true", allowlist: user.id, user }).allowed, true);
  assert.equal(resolveContentCreateAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "true", allowlist: "", user }).allowed, false);
  assert.equal(resolveContentCreateAccess({ nodeEnv: "development", user }).allowed, true);
});
