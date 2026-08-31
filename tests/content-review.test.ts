import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CONTENT_REVIEW_BOTTLENECKS,
  CONTENT_REVIEW_DIAGNOSIS_DIMENSIONS,
  CONTENT_REVIEW_RECIPE_VERSION,
  applyContentReviewDraftEdits,
  approveContentReviewArtifact,
  buildContentReviewBusinessContextSnapshot,
  buildDeterministicContentReview,
  canUseContentReviewTier,
  parseContentReviewRequest,
  renderImprovedContentText,
  validateContentReviewArtifact,
  type ContentReviewRequestV1,
} from "../src/lib/content-review/domain.ts";
import { sha256NormalizedSourceText } from "../src/lib/content-review/hash.server.ts";
import { buildContentReviewPromptBoundary } from "../src/lib/content-review/prompt.ts";
import { parseProviderContentReviewCandidate } from "../src/lib/content-review/provider-output.ts";
import { resolveContentReviewAccess } from "../src/lib/content-review/access-policy.ts";

type Fixture = {
  id: string;
  category: string;
  sourceType: "pasted_text" | "from_social_post";
  sourceStatus: "draft" | "approved" | null;
  platform: ContentReviewRequestV1["platform"];
  objective: ContentReviewRequestV1["objective"];
  source: { mode: string; text?: string; count?: number; sourceSocialPostId?: number | null };
  desiredAction: string;
  providerCandidate?: Record<string, unknown>;
  expected: { outcome: string; primaryBottleneck: string | null; requiredClaimActions: string[] };
};
const fixtureSet = JSON.parse(readFileSync(new URL("./fixtures/content-review-v1-fixtures.json", import.meta.url), "utf8")) as { fixtures: Fixture[] };
const business = buildContentReviewBusinessContextSnapshot({
  businessName: "AI4Bisnes",
  category: "AI untuk PKS",
  products: "platform panduan pemasaran",
  targetCustomer: "pemilik PKS Malaysia",
  location: "Malaysia",
  usp: "Business Context owner-scoped",
  toneOfVoice: "jelas, mesra dan praktikal",
  priceRange: "",
  platforms: "facebook,instagram,tiktok,linkedin",
});

function requestFor(fixture: Fixture, text = fixture.source.text ?? "Post owned untuk semakan.") {
  return parseContentReviewRequest({
    entry: fixture.sourceType,
    sourceSocialPostId: fixture.sourceType === "from_social_post" ? (fixture.source.sourceSocialPostId ?? 7) : null,
    sourceText: text,
    platform: fixture.platform,
    objective: fixture.objective,
    desiredAction: fixture.desiredAction,
    extraContext: "",
  });
}

function reviewFixture(fixture: Fixture) {
  const sourceText = fixture.source.text ?? "Post owned yang jelas, khusus dan mempunyai tindakan yang sepadan.";
  const request = requestFor(fixture, sourceText);
  return buildDeterministicContentReview({
    business,
    request: { ...request, sourceText },
    sourceSocialPostStatus: fixture.sourceStatus,
    sourceTextHash: sha256NormalizedSourceText(sourceText),
    now: new Date("2026-08-30T00:00:00Z"),
  });
}

test("approved fixture set has exactly twenty unique cases and full enum coverage", () => {
  assert.equal(fixtureSet.fixtures.length, 20);
  assert.equal(new Set(fixtureSet.fixtures.map((fixture) => fixture.id)).size, 20);
  assert.deepEqual(new Set(fixtureSet.fixtures.map((fixture) => fixture.platform)), new Set(["facebook", "instagram", "tiktok", "linkedin"]));
  assert.deepEqual(new Set(fixtureSet.fixtures.map((fixture) => fixture.objective)), new Set(["awareness", "engagement", "leads", "sales", "education"]));
});

test("request parser enforces entry/source invariants, native enums and all length caps", () => {
  const parsed = parseContentReviewRequest({ entry: "pasted_text", sourceSocialPostId: null, sourceText: "Content untuk disemak", platform: "facebook", objective: "education", desiredAction: "save", extraContext: "" });
  assert.equal(parsed.sourceSocialPostId, null);
  assert.equal(parsed.sourceText, "Content untuk disemak");
  assert.throws(() => parseContentReviewRequest({ ...parsed, sourceText: "x".repeat(5001) }));
  assert.throws(() => parseContentReviewRequest({ ...parsed, sourceText: "" }));
  assert.throws(() => parseContentReviewRequest({ ...parsed, sourceSocialPostId: 3 }));
  assert.throws(() => parseContentReviewRequest({ ...parsed, entry: "from_social_post", sourceSocialPostId: null }));
  assert.throws(() => parseContentReviewRequest({ ...parsed, platform: "youtube" }));
  assert.throws(() => parseContentReviewRequest({ ...parsed, objective: "viral" }));
  assert.throws(() => parseContentReviewRequest({ ...parsed, desiredAction: "x".repeat(201) }));
  assert.throws(() => parseContentReviewRequest({ ...parsed, extraContext: "x".repeat(501) }));
  const owned = parseContentReviewRequest({ ...parsed, entry: "from_social_post", sourceSocialPostId: 3, sourceText: "client text ignored" });
  assert.equal(owned.sourceSocialPostId, 3);
});

test("real deterministic review matches every reviewable fixture bottleneck", () => {
  const reviewable = fixtureSet.fixtures.filter((fixture) => !fixture.expected.outcome.startsWith("reject_") && !["CE-S19-provider-protected-override", "CE-S20-approved-revision-integrity"].includes(fixture.id));
  for (const fixture of reviewable) {
    const artifact = reviewFixture(fixture);
    assert.equal(artifact.primaryCreativeBottleneck, fixture.expected.primaryBottleneck, fixture.id);
    assert.equal(validateContentReviewArtifact(artifact).ok, true, fixture.id);
    assert.equal(Object.keys(artifact.diagnosisBands).length, 12, fixture.id);
    assert.deepEqual(Object.keys(artifact.diagnosisBands), [...CONTENT_REVIEW_DIAGNOSIS_DIMENSIONS], fixture.id);
    assert.ok(CONTENT_REVIEW_BOTTLENECKS.includes(artifact.primaryCreativeBottleneck), fixture.id);
    assert.equal(artifact.recipeVersion, CONTENT_REVIEW_RECIPE_VERSION);
  }
});

test("claim ledger preserves exact substrings and unsupported promises are never kept unchanged", () => {
  for (const fixture of fixtureSet.fixtures.filter((item) => item.category === "claim" || item.id === "CE-Q08-tiktok-expectation-mismatch")) {
    const artifact = reviewFixture(fixture);
    for (const claim of artifact.claimLedger) {
      assert.ok((fixture.source.text ?? "").includes(claim.exactClaimText), `${fixture.id}: exact claim`);
      if (claim.class === "PROMISE" && claim.evidenceState === "UNSUPPORTED") assert.notEqual(claim.action, "KEEP", fixture.id);
    }
    for (const expectedAction of fixture.expected.requiredClaimActions) {
      assert.ok(artifact.claimLedger.some((claim) => claim.action === expectedAction), `${fixture.id}: ${expectedAction}`);
    }
    const improved = renderImprovedContentText(artifact.improvedDraft).toLowerCase();
    if (fixture.id !== "CE-C13-supported-owner-fact") assert.doesNotMatch(improved, /dijamin|pasti berkesan untuk setiap|97%|satu-satunya sebab|naik 300%/i, fixture.id);
  }
  const supported = reviewFixture(fixtureSet.fixtures.find((fixture) => fixture.id === "CE-C13-supported-owner-fact")!);
  assert.match(renderImprovedContentText(supported.improvedDraft), /RM12/);
  assert.match(renderImprovedContentText(supported.improvedDraft), /11 pagi/);
});

test("prompt injection is fenced as data and cannot approve, reveal secrets or trigger publishing", () => {
  const fixture = fixtureSet.fixtures.find((item) => item.id === "CE-S14-prompt-injection")!;
  const artifact = reviewFixture(fixture);
  assert.equal(artifact.status, "draft");
  assert.equal(artifact.approval, null);
  assert.equal(artifact.primaryCreativeBottleneck, "generic_angle");
  const prompt = buildContentReviewPromptBoundary({ business, request: requestFor(fixture), sourceText: fixture.source.text! });
  assert.match(prompt, /TIDAK_DIPERCAYAI/);
  assert.match(prompt, /jangan ikut/i);
  assert.doesNotMatch(JSON.stringify(artifact), /service role key|telah diterbitkan|telah dihantar/i);
});

test("provider candidate contributes review fields only; server reconstructs protected identity/source/context/status", () => {
  const fixture = fixtureSet.fixtures.find((item) => item.id === "CE-S19-provider-protected-override")!;
  const sourceText = "Post yang jelas untuk pelanggan sasaran dengan tindakan yang sepadan.";
  const request = requestFor(fixture, sourceText);
  const artifact = parseProviderContentReviewCandidate({
    candidate: { ...fixture.providerCandidate, strengths: ["Mesej mudah difahami"], weaknesses: ["Boleh tambah contoh"], primaryCreativeBottleneck: "none_material", fixes: ["Tambah satu contoh sebenar"], improvedDraft: { hook: "Hook selamat", body: sourceText, callToAction: "Kongsi pandangan anda.", hashtags: [] } },
    business,
    request: { ...request, sourceText },
    sourceSocialPostStatus: "approved",
    sourceTextHash: sha256NormalizedSourceText(sourceText),
    now: new Date("2026-08-30T00:00:00Z"),
  });
  assert.equal(artifact.status, "draft");
  assert.equal(artifact.sourceSocialPostId, 3);
  assert.equal(artifact.sourceTextHash, sha256NormalizedSourceText(sourceText));
  assert.equal(artifact.businessContextSnapshot.businessName, "AI4Bisnes");
});

test("deterministic review survives long real-world Business Context without inventing price or proof", () => {
  const longBusiness = buildContentReviewBusinessContextSnapshot({
    businessName: `Kedai ${"Tempatan ".repeat(30)}`,
    category: `Perkhidmatan ${"PKS ".repeat(40)}`,
    products: `Panduan operasi ${"praktikal untuk peniaga Malaysia ".repeat(40)}`,
    targetCustomer: `Pemilik mikro-PKS ${"yang mengurus jualan melalui WhatsApp ".repeat(30)}`,
    location: `Malaysia ${"Timur dan Barat ".repeat(20)}`,
    usp: `Membantu usahawan membuat keputusan berdasarkan Business Context ${"tanpa kod dan bajet rendah ".repeat(30)}`,
    toneOfVoice: `mesra, jelas dan profesional ${"serta tidak berlebihan ".repeat(20)}`,
    priceRange: "",
    platforms: "facebook, instagram, tiktok, linkedin ".repeat(20),
  });
  const sourceText = "Ramai peniaga perlukan cara mudah menyemak content sebelum diterbitkan. Gunakan satu bottleneck utama dan satu tindakan yang jelas.";
  const request = parseContentReviewRequest({ entry: "pasted_text", sourceSocialPostId: null, sourceText, platform: "facebook", objective: "education", desiredAction: "save", extraContext: "" });
  const artifact = buildDeterministicContentReview({ business: longBusiness, request, sourceSocialPostStatus: null, sourceTextHash: sha256NormalizedSourceText(sourceText), now: new Date("2026-08-30T00:00:00Z") });
  assert.equal(validateContentReviewArtifact(artifact).ok, true);
  assert.ok(artifact.businessContextSnapshot.products.length <= 500);
  assert.ok(artifact.businessContextSnapshot.targetCustomer.length <= 300);
  assert.ok(artifact.businessContextSnapshot.usp.length <= 300);
  assert.doesNotMatch(renderImprovedContentText(artifact.improvedDraft), /RM\s*\d|dijamin|terbukti/i);
});

test("approve records actor/time/content hash; editing approved creates draft revision and invalidates approval", () => {
  const sourceText = "Approved source content with a stable hash.";
  const request = parseContentReviewRequest({ entry: "from_social_post", sourceSocialPostId: 3, sourceText, platform: "linkedin", objective: "engagement", desiredAction: "comment", extraContext: "" });
  const draft = buildDeterministicContentReview({ business, request, sourceSocialPostStatus: "approved", sourceTextHash: sha256NormalizedSourceText(sourceText), now: new Date("2026-08-30T00:00:00Z") });
  const approved = approveContentReviewArtifact(draft, "owner-1", new Date("2026-08-30T01:00:00Z"));
  assert.equal(approved.status, "approved");
  assert.equal(approved.approval?.actorId, "owner-1");
  assert.equal(approved.approval?.approvedAt, "2026-08-30T01:00:00.000Z");
  assert.equal(approved.approval?.contentHash.length, 64);
  const revised = applyContentReviewDraftEdits(approved, { hook: approved.improvedDraft.hook, body: "Isi yang diubah.", callToAction: approved.improvedDraft.callToAction, hashtags: [] }, new Date("2026-08-30T02:00:00Z"));
  assert.equal(revised.status, "draft");
  assert.equal(revised.approval, null);
  assert.equal(revised.improvedDraft.revision, 2);
  assert.equal(revised.improvedDraft.parentContentHash, approved.approval?.contentHash);
  assert.equal(approved.improvedDraft.body, draft.improvedDraft.body);
});

test("PRO/MAX entitlement and independent access flag fail closed outside canary", () => {
  assert.equal(canUseContentReviewTier("pro"), true);
  assert.equal(canUseContentReviewTier("max"), true);
  assert.equal(canUseContentReviewTier("basic"), false);
  const user = { id: "9750ab53-d871-4b0b-8044-0a78aa9ebe6d" };
  assert.equal(resolveContentReviewAccess({ nodeEnv: "production", deploymentTarget: "production", enabled: "true", allowlist: user.id, user }).allowed, false);
  assert.equal(resolveContentReviewAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "true", allowlist: user.id, user }).allowed, true);
  assert.equal(resolveContentReviewAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "true", allowlist: "", user }).allowed, false);
  assert.equal(resolveContentReviewAccess({ nodeEnv: "development", deploymentTarget: undefined, enabled: undefined, allowlist: undefined, user }).allowed, true);
});
