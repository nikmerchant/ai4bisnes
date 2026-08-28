import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDeterministicOffer,
  buildOfferBusinessContextSnapshot,
  parseNativeOfferRequest,
  renderOfferText,
  type NativeOfferBusinessProfile,
} from "../src/lib/native-offer/domain.ts";
import { parseProviderOfferArtifact } from "../src/lib/native-offer/provider-output.ts";

const PROFILE: NativeOfferBusinessProfile = {
  businessName: "Goreng Pisang Pak Mat",
  category: "Makanan & Minuman",
  products: "goreng pisang krispy viral",
  targetCustomer: "pekerja pejabat Shah Alam",
  location: "Shah Alam",
  usp: "pisang goreng paling krispy",
  toneOfVoice: "mesra dan profesional",
  priceRange: "RM1 - RM20",
  platforms: "WhatsApp, Facebook",
};
const business = buildOfferBusinessContextSnapshot(PROFILE);

function approvedRequest(overrides: Record<string, unknown> = {}) {
  return {
    entry: "standalone",
    source_post_id: null,
    offer_type: "promotion",
    product: "Set lunch ayam goreng",
    goal: "sales",
    valid_until: "",
    extra_note: "",
    audience: "pekerja pejabat",
    priceGuidance: "RM12",
    ...overrides,
  };
}

test("parser retains approved request contract and optional audience/priceGuidance", () => {
  const parsed = parseNativeOfferRequest(approvedRequest());
  assert.equal(parsed.entry, "standalone");
  assert.equal(parsed.sourcePostId, null);
  assert.equal(parsed.offerType, "promotion");
  assert.equal(parsed.goal, "sales");
  assert.equal(parsed.validUntil, "");
  assert.equal(parsed.extraNote, "");
  assert.equal(parsed.audience, "pekerja pejabat");
  assert.equal(parsed.priceGuidance, "RM12");
});

test("from_social_post requires a positive source_post_id; standalone rejects it", () => {
  const chained = parseNativeOfferRequest(approvedRequest({ entry: "from_social_post", source_post_id: 42 }));
  assert.equal(chained.sourcePostId, 42);
  assert.throws(() => parseNativeOfferRequest(approvedRequest({ entry: "from_social_post", source_post_id: null })));
  assert.throws(() => parseNativeOfferRequest(approvedRequest({ entry: "from_social_post", source_post_id: -1 })));
  assert.throws(() => parseNativeOfferRequest(approvedRequest({ entry: "standalone", source_post_id: 42 })));
});

test("goal and valid_until are bounded approved fields", () => {
  for (const goal of ["sales", "leads", "repeat_purchase"] as const) {
    assert.equal(parseNativeOfferRequest(approvedRequest({ goal })).goal, goal);
  }
  assert.throws(() => parseNativeOfferRequest(approvedRequest({ goal: "awareness" })));
  assert.equal(parseNativeOfferRequest(approvedRequest({ valid_until: "2026-09-30" })).validUntil, "2026-09-30");
  assert.throws(() => parseNativeOfferRequest(approvedRequest({ valid_until: "30/09/2026" })));
  assert.throws(() => parseNativeOfferRequest(approvedRequest({ valid_until: "2026-02-30" })));
});

test("deterministic artifact follows approved schema and urgency only from valid_until", () => {
  const request = parseNativeOfferRequest(approvedRequest({
    entry: "from_social_post",
    source_post_id: 7,
    goal: "leads",
    valid_until: "2026-09-30",
  }));
  const artifact = buildDeterministicOffer({ business, request, now: new Date("2026-08-28T00:00:00Z") });
  assert.equal(artifact.sourcePostId, 7);
  assert.equal(artifact.goal, "leads");
  assert.ok(artifact.headline.length > 0);
  assert.ok(artifact.valueStack.length >= 3 && artifact.valueStack.length <= 5);
  assert.equal(artifact.priceNote, "RM12");
  assert.ok(Array.isArray(artifact.terms));
  assert.match(artifact.urgencyNote, /2026-09-30/);
  assert.ok(renderOfferText(artifact).includes(artifact.headline));

  const noDate = buildDeterministicOffer({ business, request: parseNativeOfferRequest(approvedRequest()), now: new Date() });
  assert.equal(noDate.urgencyNote, "");
  assert.doesNotMatch(renderOfferText(noDate).toLowerCase(), /stok terhad|tempoh terhad|kehabisan/);

  const guarantee = buildDeterministicOffer({ business, request: parseNativeOfferRequest(approvedRequest({ offer_type: "guarantee" })), now: new Date() });
  assert.match(guarantee.headline, /^Cadangan Jaminan/);
  assert.equal(guarantee.riskReversal, "");
});

test("provider cannot override approved source, goal, price, terms, urgency or risk reversal", () => {
  const request = parseNativeOfferRequest(approvedRequest({
    entry: "from_social_post",
    source_post_id: 7,
    valid_until: "2026-09-30",
    extra_note: "Tiada jaminan ditawarkan",
  }));
  const raw = JSON.stringify({
    headline: "Pakej Hebat",
    promise: "Nilai jelas",
    valueStack: ["A", "B", "C"],
    callToAction: "Hubungi kami",
    sourcePostId: 999,
    goal: "repeat_purchase",
    priceNote: "RM1",
    terms: ["Tiada syarat"],
    urgencyNote: "Stok tinggal 2",
    riskReversal: "Jaminan 100%",
  });
  const artifact = parseProviderOfferArtifact({ raw, business, request, now: new Date("2026-08-28T00:00:00Z") });
  assert.equal(artifact.sourcePostId, 7);
  assert.equal(artifact.goal, "sales");
  assert.equal(artifact.priceNote, "RM12");
  assert.deepEqual(artifact.terms, ["Sah hingga 2026-09-30."]);
  assert.match(artifact.urgencyNote, /2026-09-30/);
  assert.equal(artifact.riskReversal, "");
  assert.ok(artifact.assumptions.some((item) => item.includes("sahkan setiap item")));
});

const ROUTE = readFileSync(new URL("../src/app/app/native-offer/api/route.ts", import.meta.url), "utf8");
const SOCIAL_CLIENT = readFileSync(new URL("../src/app/app/native-social-post/native-social-post-client.tsx", import.meta.url), "utf8");

test("generation route loads an owner-scoped approved Social Post before generating", () => {
  assert.match(ROUTE, /loadNativeSocialPost/);
  assert.match(ROUTE, /artifactId:\s*request\.sourcePostId/);
  assert.match(ROUTE, /userId:\s*context\.user\.id/);
  assert.match(ROUTE, /\.artifact\.status\s*!==\s*"approved"/);
  assert.match(ROUTE, /Artifact sumber tidak ditemui/);
});

test("approved Social Post exposes an offer-chaining action", () => {
  assert.match(SOCIAL_CLIENT, /\/app\/native-offer\?sourcePostId=/);
  assert.match(SOCIAL_CLIENT, /Bina Tawaran/);
});
