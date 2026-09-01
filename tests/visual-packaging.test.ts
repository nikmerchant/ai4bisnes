import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  VISUAL_PACKAGING_FORMATS,
  VISUAL_PACKAGING_INTENTS,
  VISUAL_PROOF_SOURCES,
  applyVisualPackagingEdits,
  approveVisualPackagingArtifact,
  buildApprovedContentCreateSnapshot,
  buildDeterministicVisualPackaging,
  parseVisualPackagingRequest,
  renderVisualPackagingPlan,
  validateVisualPackagingArtifact,
  type VisualPackagingFormat,
  type VisualPackagingIntent,
} from "../src/lib/visual-packaging/domain.ts";
import { parseProviderVisualPackagingCandidate } from "../src/lib/visual-packaging/provider-output.ts";
import { resolveVisualPackagingAccess } from "../src/lib/visual-packaging/access-policy.ts";
import { buildContentCreateBusinessContextSnapshot, buildApprovedOfferSnapshot, buildDeterministicContentCreate, approveContentCreateArtifact, parseContentCreateRequest, type ContentCreateArtifactV1 } from "../src/lib/content-create/domain.ts";
import type { OfferArtifact } from "../src/lib/native-offer/domain.ts";

const fixtureSet = JSON.parse(readFileSync(new URL("./fixtures/visual-packaging-v1-fixtures.json", import.meta.url), "utf8")) as {
  providerCallsAllowed: boolean;
  mediaGenerationAllowed: boolean;
  fixtures: Array<{ id: string; category: string; format: VisualPackagingFormat; packagingIntent: VisualPackagingIntent; source: Record<string, unknown>; productionConstraints?: string; providerCandidate?: Record<string, unknown>; expected: Record<string, unknown> }>;
};

const business = buildContentCreateBusinessContextSnapshot({ businessName: "AI4Bisnes", category: "AI untuk PKS", products: "Panduan content", targetCustomer: "pemilik PKS Malaysia", location: "Malaysia", usp: "jelas", toneOfVoice: "mesra", priceRange: "", platforms: "tiktok" });
const offer: OfferArtifact = { schemaVersion: 1, kind: "offer", status: "approved", entry: "standalone", sourcePostId: null, offerType: "value_stack", product: "Panduan content", goal: "sales", audience: "pemilik PKS Malaysia", headline: "Bina content lebih jelas", promise: "Bina content lebih jelas", valueStack: ["Struktur content praktikal", "Semakan mesej"], priceNote: "", terms: [], riskReversal: "", urgencyNote: "", callToAction: "Semak panduan jika sesuai.", assumptions: [], businessContext: business, recipeVersion: "offer-v1.0.0", createdAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z" };

function sourceArtifact(overrides: { platform?: "tiktok" | "instagram"; status?: "draft" | "approved"; corrupt?: boolean } = {}) {
  const offerSnapshot = buildApprovedOfferSnapshot({ id: 7, artifact: offer, validUntil: "" });
  const request = parseContentCreateRequest({ entry: "from_offer", sourceOfferId: 7, platform: overrides.platform ?? "tiktok", objective: "education", contentRole: "educate", proofNote: "", extraContext: "" });
  const draft = buildDeterministicContentCreate({ business, request, sourceOfferSnapshot: offerSnapshot, now: new Date("2026-08-31T00:00:00Z") });
  const artifact = overrides.status === "draft" ? draft : approveContentCreateArtifact(draft, "owner-1", new Date("2026-08-31T01:00:00Z"));
  return (overrides.corrupt ? { ...artifact, claimLedger: [{ bad: true }] } : artifact) as ContentCreateArtifactV1;
}

function build(format: VisualPackagingFormat, packagingIntent: VisualPackagingIntent, productionConstraints = "") {
  const snapshot = buildApprovedContentCreateSnapshot({ id: 4, artifact: sourceArtifact() });
  const request = parseVisualPackagingRequest({ entry: "from_content_create", sourceContentCreateId: 4, format, packagingIntent, productionConstraints });
  return buildDeterministicVisualPackaging({ request, sourceSnapshot: snapshot, now: new Date("2026-09-01T00:00:00Z") });
}

function words(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }

test("approved CE-5 fixture set has exactly 20 unique cases, 8/5/4/3 categories, all formats and intents", () => {
  assert.equal(fixtureSet.providerCallsAllowed, false);
  assert.equal(fixtureSet.mediaGenerationAllowed, false);
  assert.equal(fixtureSet.fixtures.length, 20);
  assert.equal(new Set(fixtureSet.fixtures.map((item) => item.id)).size, 20);
  assert.deepEqual(Object.fromEntries(["quality", "claim", "security", "contract"].map((category) => [category, fixtureSet.fixtures.filter((item) => item.category === category).length])), { quality: 8, claim: 5, security: 4, contract: 3 });
  assert.deepEqual(new Set(fixtureSet.fixtures.map((item) => item.format)), new Set(VISUAL_PACKAGING_FORMATS));
  assert.deepEqual(new Set(fixtureSet.fixtures.map((item) => item.packagingIntent)), new Set(VISUAL_PACKAGING_INTENTS));
});

test("request accepts only protected entry, positive safe source id, canonical enums and <=500 untrusted constraints", () => {
  const valid = parseVisualPackagingRequest({ entry: "from_content_create", sourceContentCreateId: 4, format: "short_video", packagingIntent: "attention", productionConstraints: "" });
  assert.deepEqual(Object.keys(valid).sort(), ["entry", "sourceContentCreateId", "format", "packagingIntent", "productionConstraints"].sort());
  for (const id of [0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, null, ""]) assert.throws(() => parseVisualPackagingRequest({ ...valid, sourceContentCreateId: id }));
  assert.throws(() => parseVisualPackagingRequest({ ...valid, entry: "raw_text" }));
  assert.throws(() => parseVisualPackagingRequest({ ...valid, format: "image" }));
  assert.throws(() => parseVisualPackagingRequest({ ...valid, packagingIntent: "viral" }));
  assert.throws(() => parseVisualPackagingRequest({ ...valid, productionConstraints: "x".repeat(501) }));
});

test("all creatable approved fixtures deterministically satisfy shared and discriminated format bounds", () => {
  for (const fixture of fixtureSet.fixtures.filter((item) => !String(item.expected.outcome).startsWith("reject_"))) {
    const artifact = build(fixture.format, fixture.packagingIntent, fixture.productionConstraints ?? "");
    assert.equal(validateVisualPackagingArtifact(artifact).ok, true, fixture.id);
    assert.equal(artifact.kind, "visual_packaging", fixture.id);
    assert.equal(artifact.status, "draft", fixture.id);
    assert.equal(artifact.formatPlan.format, fixture.format, fixture.id);
    assert.equal(artifact.packaging.packagingIntent, fixture.packagingIntent, fixture.id);
    assert.ok(artifact.packaging.titleOptions.length >= 1 && artifact.packaging.titleOptions.length <= 3, fixture.id);
    assert.ok(artifact.packaging.titleOptions.includes(artifact.packaging.championTitle), fixture.id);
    assert.match(artifact.packaging.audienceSignal, /pemilik PKS Malaysia/i, fixture.id);
    assert.equal(artifact.packaging.promiseCeiling, artifact.sourceSnapshot.claimLedger.find((claim) => claim.action === "KEEP")?.allowedWordingCeiling ?? artifact.sourceSnapshot.coreMessage, fixture.id);
    if (artifact.formatPlan.format === "short_video") {
      assert.ok(artifact.formatPlan.visualBeats.length >= 3 && artifact.formatPlan.visualBeats.length <= 5, fixture.id);
      assert.deepEqual(artifact.formatPlan.firstFrame, artifact.formatPlan.visualBeats[0], fixture.id);
      assert.ok(artifact.formatPlan.captionAndSafeAreaNotes.length >= 1, fixture.id);
      for (const beat of artifact.formatPlan.visualBeats) assert.ok(beat.purpose && VISUAL_PROOF_SOURCES.includes(beat.proofSource), fixture.id);
    } else if (artifact.formatPlan.format === "static_post") {
      assert.ok(words(artifact.formatPlan.canvasDirection.textOverlay) <= 6, fixture.id);
      assert.ok(artifact.formatPlan.canvasDirection.focalPoint && artifact.formatPlan.mobileReadabilityCheck && artifact.formatPlan.accessibilityAltTextDirection, fixture.id);
    } else {
      assert.ok(artifact.formatPlan.slides.length >= 3 && artifact.formatPlan.slides.length <= 8, fixture.id);
      assert.deepEqual(artifact.formatPlan.slides.map((slide) => slide.slideNumber), artifact.formatPlan.slides.map((_, index) => index + 1), fixture.id);
      for (const slide of artifact.formatPlan.slides) assert.ok(slide.purpose && VISUAL_PROOF_SOURCES.includes(slide.proofSource), fixture.id);
    }
  }
});

test("draft/non-TikTok/corrupted sources fail snapshot validation and route mirrors missing/cross-owner as generic 404", () => {
  assert.throws(() => buildApprovedContentCreateSnapshot({ id: 4, artifact: sourceArtifact({ status: "draft" }) }));
  assert.throws(() => buildApprovedContentCreateSnapshot({ id: 4, artifact: sourceArtifact({ platform: "instagram" }) }));
  assert.throws(() => buildApprovedContentCreateSnapshot({ id: 4, artifact: sourceArtifact({ corrupt: true }) }));
  assert.deepEqual(fixtureSet.fixtures.filter((item) => String(item.expected.outcome).startsWith("reject_")).map((item) => [item.id, item.expected.outcome]), [["VP-S14-draft-source", "reject_404"], ["VP-S15-cross-owner-source", "reject_404"], ["VP-S16-missing-or-non-tiktok", "reject_404"], ["VP-K18-invalid-source-id", "reject_400"]]);
});

test("owner proof attacks are never depicted; they are ledgered REMOVE/OWNER_VERIFY with OWNER_ASSET_REQUIRED", () => {
  const attacks = fixtureSet.fixtures.filter((item) => item.category === "claim" && item.productionConstraints);
  for (const fixture of attacks) {
    const artifact = build(fixture.format, fixture.packagingIntent, fixture.productionConstraints);
    const rendered = renderVisualPackagingPlan(artifact);
    assert.ok(artifact.safety.unsupportedVisualClaims.length > 0, fixture.id);
    assert.ok(artifact.safety.unsupportedVisualClaims.some((item) => item.action === fixture.expected.requiredClaimAction), fixture.id);
    if (fixture.expected.requiredProofSource) assert.match(rendered, new RegExp(String(fixture.expected.requiredProofSource)), fixture.id);
    assert.doesNotMatch(rendered, /300%|tinggal 2 slot|quote testimonial|before-after transformasi sebenar|dashboard jualan naik/i, fixture.id);
  }
  assert.deepEqual(build("static_post", "attention").safety.aiClichesAvoided, ["robot", "blue glowing brain", "futuristic hologram screen", "random coding footage", "fake analytics dashboard"]);
});

test("provider parser bounds candidate and reconstructs source/status/format/revision/approval/promise ceiling", () => {
  const snapshot = buildApprovedContentCreateSnapshot({ id: 4, artifact: sourceArtifact() });
  const request = parseVisualPackagingRequest({ entry: "from_content_create", sourceContentCreateId: 4, format: "carousel", packagingIntent: "authority", productionConstraints: "" });
  const artifact = parseProviderVisualPackagingCandidate({ candidate: { status: "approved", sourceContentCreateId: 999, sourceContentHash: "attacker", format: "short_video", revision: 9, approval: { actorId: "attacker" }, championTitle: "Jamin Jualan Meletup Dalam 24 Jam", titleOptionsCount: 5, overlayWords: 9, slides: [1,2,4,5,6,7,8,9,10] }, request, sourceSnapshot: snapshot, now: new Date("2026-09-01T00:00:00Z") });
  assert.equal(artifact.status, "draft");
  assert.equal(artifact.sourceContentCreateId, 4);
  assert.equal(artifact.formatPlan.format, "carousel");
  assert.equal(artifact.revision, 1);
  assert.equal(artifact.approval, null);
  assert.equal(artifact.packaging.promiseCeiling, snapshot.claimLedger.map((claim) => claim.allowedWordingCeiling).find(Boolean) ?? snapshot.coreMessage);
  assert.ok(artifact.packaging.titleOptions.length <= 3);
  assert.ok(artifact.formatPlan.slides.length <= 8);
  assert.doesNotMatch(renderVisualPackagingPlan(artifact), /Jamin Jualan|24 Jam/i);
});

test("approval binds safe-copy hash; approved edit becomes immutable-parent DRAFT revision", () => {
  const draft = build("static_post", "search");
  const approved = approveVisualPackagingArtifact(draft, "owner-1", new Date("2026-09-01T01:00:00Z"));
  assert.equal(approved.approval?.approvalScope, "visual_packaging_plan");
  assert.equal(approved.approval?.contentHash.length, 64);
  assert.equal(approved.formatPlan.format, "static_post");
  if (approved.formatPlan.format !== "static_post") throw new Error("static plan expected");
  const revised = applyVisualPackagingEdits(approved, { packaging: approved.packaging, formatPlan: { ...approved.formatPlan, canvasDirection: { ...approved.formatPlan.canvasDirection, textOverlay: "Content Lebih Jelas", proofSource: "APPROVED_OFFER" } } }, new Date("2026-09-01T02:00:00Z"));
  assert.equal(revised.formatPlan.format, "static_post");
  if (revised.formatPlan.format !== "static_post") throw new Error("static plan expected");
  assert.equal(revised.formatPlan.canvasDirection.proofSource, "APPROVED_CONTENT", "client cannot override protected proof classification");
  assert.equal(revised.status, "draft");
  assert.equal(revised.revision, 2);
  assert.equal(revised.parentContentHash, approved.approval?.contentHash);
  assert.equal(approved.formatPlan.format, "static_post");
  assert.throws(() => applyVisualPackagingEdits(draft, { packaging: { ...draft.packaging, championTitle: "Jamin jualan 300%" }, formatPlan: draft.formatPlan }, new Date()));
});

test("PRO/MAX and independent CE-5 access fail closed in production and allow local development", () => {
  const user = { id: "9750ab53-d871-4b0b-8044-0a78aa9ebe6d" };
  assert.equal(resolveVisualPackagingAccess({ nodeEnv: "production", deploymentTarget: "production", enabled: "true", allowlist: user.id, user }).allowed, false);
  assert.equal(resolveVisualPackagingAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "true", allowlist: user.id, user }).allowed, true);
  assert.equal(resolveVisualPackagingAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "false", allowlist: user.id, user }).allowed, false);
  assert.equal(resolveVisualPackagingAccess({ nodeEnv: "development", user }).allowed, true);
});
