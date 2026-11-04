import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AI_PROVIDER_CONSENT_VERSION, hasAiProviderConsent } from "../src/lib/ai-consent.ts";
import { buildBusinessContextSnapshot, parseNativeSocialPostRequest } from "../src/lib/native-social-post/domain.ts";
import { generateNativeSocialPost } from "../src/lib/native-social-post/provider.server.ts";
import { buildOfferBusinessContextSnapshot, parseNativeOfferRequest } from "../src/lib/native-offer/domain.ts";
import { generateNativeOffer } from "../src/lib/native-offer/provider.server.ts";

const PROFILE = {
  businessName: "Dapur Salmah", category: "Makanan & Minuman", products: "Set lunch nasi campur",
  targetCustomer: "Pekerja pejabat", location: "Kota Bharu", usp: "Tempahan awal", toneOfVoice: "mesra",
  priceRange: "RM12–RM18", platforms: "Instagram",
};
// Synthetic process-local configuration only; a full provider setup, so only consent can block the call.
const TEST_ENV = {
  DEEPSEEK_API_BASE_URL: "https://api.deepseek.com", DEEPSEEK_API_KEY: "synthetic-test-placeholder",
  DEEPSEEK_MODEL_ID: "deepseek-flash", AI4B_NATIVE_SOCIAL_POST_PROVIDER: "deepseek", AI4B_NATIVE_OFFER_PROVIDER: "deepseek",
};
const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("consent matches only the current notice version", () => {
  assert.equal(hasAiProviderConsent({ user_metadata: { ai_provider_consent: AI_PROVIDER_CONSENT_VERSION } }), true);
  assert.equal(hasAiProviderConsent({ user_metadata: { ai_provider_consent: "2026-01" } }), false);
  assert.equal(hasAiProviderConsent({ user_metadata: {} }), false);
});

for (const candidate of [
  {
    name: "Social",
    generate: () => generateNativeSocialPost({
      business: buildBusinessContextSnapshot(PROFILE),
      request: parseNativeSocialPostRequest({ platform: "instagram", objective: "sales", angle: "promotion", topic: "Set lunch" }),
      aiConsent: false,
    }),
  },
  {
    name: "Offer",
    generate: () => generateNativeOffer({
      business: buildOfferBusinessContextSnapshot(PROFILE),
      request: parseNativeOfferRequest({ entry: "standalone", offer_type: "promotion", product: "Set lunch", goal: "sales" }),
      aiConsent: false,
    }),
  },
]) {
  test(`${candidate.name} never calls the provider without consent`, async (t) => {
    const inherited = process.env;
    process.env = { NODE_ENV: "test", ...TEST_ENV };
    t.after(() => { process.env = inherited; });
    const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("{}"));
    const result = await candidate.generate();
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.equal(result.consentRequired, true);
    assert.equal(result.telemetry.mode, "deterministic_local");
    assert.equal(result.artifact.status, "draft");
  });
}

test("Social and Offer routes pass the user's recorded consent and surface consentRequired", () => {
  for (const path of ["../src/app/app/native-social-post/api/route.ts", "../src/app/app/native-offer/api/route.ts"]) {
    const route = source(path);
    assert.match(route, /aiConsent: hasAiProviderConsent\(context\.user\)/, path);
    assert.match(route, /consentRequired: generated\.consentRequired \?\? false/, path);
  }
});

test("Privasi and Terma disclose DeepSeek and drop the stale no-sending claim", () => {
  const privasi = source("../src/app/privasi/page.tsx");
  assert.match(privasi, /DeepSeek/);
  assert.match(privasi, /China/);
  assert.match(privasi, /Pemindahan Data ke Luar Malaysia/);
  assert.doesNotMatch(privasi, /bukan kami yang menghantar/);
  assert.match(source("../src/app/terma/page.tsx"), /DeepSeek/);
});
