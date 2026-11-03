import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import { buildBusinessContextSnapshot, parseNativeSocialPostRequest } from "../src/lib/native-social-post/domain.ts";
import { buildNativeSocialPostPrompt } from "../src/lib/native-social-post/prompt.ts";
import { generateNativeSocialPost } from "../src/lib/native-social-post/provider.server.ts";
import { buildOfferBusinessContextSnapshot, parseNativeOfferRequest } from "../src/lib/native-offer/domain.ts";
import { buildNativeOfferPrompt } from "../src/lib/native-offer/prompt.ts";
import { generateNativeOffer } from "../src/lib/native-offer/provider.server.ts";
import { buildWhatsAppBusinessContextSnapshot, parseNativeWhatsAppRequest } from "../src/lib/native-whatsapp/domain.ts";
import { generateNativeWhatsAppDraft } from "../src/lib/native-whatsapp/provider.server.ts";

const PROFILE = {
  businessName: "Dapur Salmah", category: "Makanan & Minuman", products: "Set lunch nasi campur",
  targetCustomer: "Pekerja pejabat Kota Bharu", location: "Kota Bharu",
  usp: "Tempahan siap sebelum waktu rehat", toneOfVoice: "mesra", priceRange: "RM12–RM18",
  platforms: "Instagram, WhatsApp",
};
const SOCIAL_INPUT = {
  aiConsent: true,
  business: buildBusinessContextSnapshot(PROFILE),
  request: parseNativeSocialPostRequest({ platform: "instagram", objective: "sales", angle: "promotion", topic: "Set lunch", offer: "Set lunch RM12" }),
};
const OFFER_INPUT = {
  aiConsent: true,
  business: buildOfferBusinessContextSnapshot(PROFILE),
  request: parseNativeOfferRequest({ entry: "standalone", offer_type: "promotion", product: "Set lunch", goal: "sales" }),
};
const WHATSAPP_INPUT = {
  business: buildWhatsAppBusinessContextSnapshot(PROFILE),
  request: parseNativeWhatsAppRequest({ entry: "standalone", reply_intent: "answer_inquiry", customer_message: "Boleh saya tempah set lunch?", customer_name: "Aminah" }),
};
const SOCIAL_COPY = {
  hook: "Set lunch untuk hari kerja yang lebih mudah.",
  body: "Dapur Salmah menyediakan set lunch untuk pekerja pejabat di Kota Bharu.",
  callToAction: "Hubungi kami untuk tempahan.", hashtags: ["#DapurSalmah", "#SetLunch"],
  tone: "mesra", assumptions: [],
};
const OFFER_COPY = {
  headline: "Set lunch Dapur Salmah", promise: "Set lunch untuk waktu rehat anda.",
  valueStack: ["Pilihan set lunch", "Semakan menu semasa", "Aturan tempahan"],
  callToAction: "Hubungi kami untuk semakan menu.", assumptions: [],
};
// Synthetic process-local configuration only; no inherited secret values are read.
const TEST_ENV = {
  DEEPSEEK_API_BASE_URL: "https://api.deepseek.com", DEEPSEEK_API_KEY: "synthetic-test-placeholder",
  DEEPSEEK_MODEL_ID: "deepseek-flash", AI4B_NATIVE_PROVIDER_ALLOWED_HOSTS: "api.deepseek.com",
  DEEPSEEK_INPUT_USD_PER_MTOK: "0.1", DEEPSEEK_OUTPUT_USD_PER_MTOK: "0.2", AI4B_USD_MYR: "4.5",
};

function isolate(t: TestContext, env: Record<string, string | undefined>, raw: string, status = 200) {
  const inherited = process.env;
  process.env = { NODE_ENV: "test" };
  for (const [key, value] of Object.entries(env)) if (value !== undefined) process.env[key] = value;
  t.after(() => { process.env = inherited; });
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ choices: [{ message: { content: raw } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }), { status });
  });
  t.mock.method(console, "warn", () => {});
  return calls;
}

for (const candidate of [
  { name: "Social", flag: "AI4B_NATIVE_SOCIAL_POST_PROVIDER", generate: () => generateNativeSocialPost(SOCIAL_INPUT), prompt: () => buildNativeSocialPostPrompt(SOCIAL_INPUT), copy: SOCIAL_COPY },
  { name: "Offer", flag: "AI4B_NATIVE_OFFER_PROVIDER", generate: () => generateNativeOffer(OFFER_INPUT), prompt: () => buildNativeOfferPrompt(OFFER_INPUT), copy: OFFER_COPY },
]) {
  test(`${candidate.name} stays deterministic_local without provider configuration`, async (t) => {
    const calls = isolate(t, {}, JSON.stringify(candidate.copy));
    const result = await candidate.generate();
    assert.equal(result.telemetry.mode, "deterministic_local");
    assert.equal(result.telemetry.provider, "local");
    assert.equal(result.telemetry.estimatedCostRm, 0);
    assert.equal(result.artifact.status, "draft");
    assert.equal(calls.length, 0);
  });

  test(`${candidate.name} sends the exact I2 request and accepts a draft`, async (t) => {
    const calls = isolate(t, { ...TEST_ENV, [candidate.flag]: "deepseek" }, JSON.stringify(candidate.copy));
    const result = await candidate.generate();
    assert.equal(result.telemetry.mode, "provider");
    assert.equal(result.telemetry.model, "deepseek-flash");
    assert.equal(result.artifact.status, "draft");
    assert.equal(result.warning, null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.deepseek.com/chat/completions");
    assert.equal(calls[0].init?.method, "POST");
    assert.equal(calls[0].init?.cache, "no-store");
    assert.ok(calls[0].init?.signal instanceof AbortSignal);
    const body: unknown = JSON.parse(String(calls[0].init?.body));
    assert.deepEqual(body, {
      model: "deepseek-flash", thinking: { type: "disabled" }, reasoning_effort: "none",
      temperature: 0.4, max_tokens: 8192, response_format: { type: "json_object" }, stream: false,
      messages: [{ role: "user", content: candidate.prompt() }],
    });
  });

  for (const model of [undefined, "", "deepseek-pro", "deepseek-v4-flash", "DEEPSEEK-FLASH", " deepseek-flash", "deepseek-flash "]) {
    test(`${candidate.name} rejects model ${JSON.stringify(model)} without fetching`, async (t) => {
      const calls = isolate(t, { ...TEST_ENV, [candidate.flag]: "deepseek", DEEPSEEK_MODEL_ID: model }, JSON.stringify(candidate.copy));
      const result = await candidate.generate();
      assert.equal(result.telemetry.mode, "deterministic_fallback");
      assert.equal(result.telemetry.provider, "local");
      assert.equal(result.telemetry.estimatedCostRm, 0);
      assert.ok(result.warning);
      assert.equal(calls.length, 0);
    });
  }

  test(`${candidate.name} rejects an unallowlisted host without fetching`, async (t) => {
    const calls = isolate(t, { ...TEST_ENV, [candidate.flag]: "deepseek", DEEPSEEK_API_BASE_URL: "https://untrusted.invalid" }, JSON.stringify(candidate.copy));
    assert.equal((await candidate.generate()).telemetry.mode, "deterministic_fallback");
    assert.equal(calls.length, 0);
  });

  test(`${candidate.name} keeps malformed-output fallback`, async (t) => {
    const calls = isolate(t, { ...TEST_ENV, [candidate.flag]: "deepseek" }, "not-json");
    const result = await candidate.generate();
    assert.equal(result.telemetry.mode, "deterministic_fallback");
    assert.equal(result.artifact.status, "draft");
    assert.equal(calls.length, 1);
  });

  test(`${candidate.name} keeps failed-response fallback`, async (t) => {
    isolate(t, { ...TEST_ENV, [candidate.flag]: "deepseek" }, JSON.stringify(candidate.copy), 503);
    assert.equal((await candidate.generate()).telemetry.mode, "deterministic_fallback");
  });
}

for (const body of ["Layari https://untrusted.invalid sekarang.", "Dipercayai lebih 500 pelanggan setiap bulan."]) {
  test(`Social rejects ungrounded provider copy via deterministic fallback: ${body}`, async (t) => {
    const calls = isolate(t, { ...TEST_ENV, AI4B_NATIVE_SOCIAL_POST_PROVIDER: "deepseek" }, JSON.stringify({ ...SOCIAL_COPY, body }));
    const result = await generateNativeSocialPost(SOCIAL_INPUT);
    assert.equal(result.telemetry.mode, "deterministic_fallback");
    assert.equal(result.artifact.body.includes(body), false);
    assert.equal(result.artifact.status, "draft");
    assert.equal(calls.length, 1);
  });
}

for (const provider of [undefined, "deepseek", " DEEPSEEK ", "other"]) {
  test(`WhatsApp stays deterministic_local when env provider is ${JSON.stringify(provider)}`, async (t) => {
    const calls = isolate(t, { ...TEST_ENV, AI4B_NATIVE_WHATSAPP_PROVIDER: provider }, "not-json");
    const result = await generateNativeWhatsAppDraft(WHATSAPP_INPUT);
    assert.equal(result.telemetry.mode, "deterministic_local");
    assert.equal(result.telemetry.provider, "local");
    assert.equal(result.telemetry.model, "deterministic-v1");
    assert.equal(result.telemetry.estimatedCostRm, 0);
    assert.equal(result.artifact.status, "draft");
    assert.equal(calls.length, 0);
  });
}
