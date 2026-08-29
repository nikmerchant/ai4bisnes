import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ROUTE = readFileSync(new URL("../src/app/app/native-whatsapp/api/route.ts", import.meta.url), "utf8");
const PATCH = readFileSync(new URL("../src/app/app/native-whatsapp/api/[id]/route.ts", import.meta.url), "utf8");
const PAGE = readFileSync(new URL("../src/app/app/native-whatsapp/page.tsx", import.meta.url), "utf8");
const CLIENT = readFileSync(new URL("../src/app/app/native-whatsapp/native-whatsapp-client.tsx", import.meta.url), "utf8");
const CONTEXT = readFileSync(new URL("../src/lib/native-whatsapp/context.server.ts", import.meta.url), "utf8");
const STORAGE = readFileSync(new URL("../src/lib/native-whatsapp/storage.server.ts", import.meta.url), "utf8");
const OFFER_CLIENT = readFileSync(new URL("../src/app/app/native-offer/native-offer-client.tsx", import.meta.url), "utf8");
const DASHBOARD = readFileSync(new URL("../src/app/app/page.tsx", import.meta.url), "utf8");

test("whatsapp generation authenticates before privileged client and derives tier server-side", () => {
  const authIdx = ROUTE.indexOf("loadNativeWhatsAppContext");
  const adminIdx = ROUTE.indexOf("createAdminClient()");
  assert.ok(authIdx > -1 && adminIdx > -1 && authIdx < adminIdx);
  assert.match(CONTEXT, /auth\.getUser/);
  assert.match(CONTEXT, /semak_langganan/);
  assert.match(CONTEXT, /\.eq\("user_id", user\.id\)/);
});

test("whatsapp routes validate proxy-aware same-origin and JSON content type", () => {
  for (const src of [ROUTE, PATCH]) {
    assert.match(src, /isSameOriginRequest/);
    assert.match(src, /application\/json/);
    assert.match(src, /no-store/);
  }
});

test("whatsapp generation has body-size, idempotency and usage caps", () => {
  assert.match(ROUTE, /16_384/);
  assert.match(ROUTE, /REQUEST_ID_RE/);
  assert.match(ROUTE, /MAX_PER_HOUR = 20/);
  assert.match(ROUTE, /MAX_PER_MONTH = 100/);
  assert.match(ROUTE, /findNativeWhatsAppDraftByRequestId/);
  assert.match(ROUTE, /withNativeWhatsAppUserLock/);
});

test("all privileged whatsapp operations use slice 3 shadow table with explicit owner scope", () => {
  assert.match(ROUTE, /native_whatsapp_draft_artifacts/);
  assert.match(PATCH, /userId: context\.user\.id/);
  assert.match(STORAGE, /\.eq\("user_id", input\.userId\)/);
  assert.doesNotMatch(ROUTE + PATCH + PAGE, /generated_outputs/);
});

test("whatsapp provider secrets stay server-only and host allowlisted", () => {
  const provider = readFileSync(new URL("../src/lib/native-whatsapp/provider.server.ts", import.meta.url), "utf8");
  assert.match(provider, /"server-only"/);
  assert.match(provider, /AI4B_NATIVE_PROVIDER_ALLOWED_HOSTS/);
  assert.match(provider, /AI4B_NATIVE_WHATSAPP_PROVIDER/);
});

test("slice 3 feature access requires independent flag and allowlist", () => {
  assert.match(readFileSync(new URL("../src/lib/native-whatsapp/access.ts", import.meta.url), "utf8"), /AI4B_SLICE3_ENABLED/);
  assert.match(readFileSync(new URL("../src/lib/native-whatsapp/access.ts", import.meta.url), "utf8"), /AI4B_SLICE3_ALLOWLIST/);
});

test("no automatic send anywhere in slice 3 surface", () => {
  const surfaces = [CLIENT, PAGE, ROUTE, PATCH].join("\n").toLowerCase();
  assert.doesNotMatch(surfaces, /wa\.me\/send|sendmessage|api\.whatsapp|messages.*post|sendtext/);
  assert.match(CLIENT, /Tiada penghantaran automatik/i);
});

test("clipboard pattern with dedicated Salin button present", () => {
  assert.match(CLIENT, /copyTextSafely/);
  assert.match(CLIENT, />Salin</);
  assert.match(CLIENT, /type="button"/);
});

test("approved Offer chains to WhatsApp and dashboard has gated launcher", () => {
  assert.match(OFFER_CLIENT, /\/app\/native-whatsapp\?sourceOfferId=/);
  assert.match(OFFER_CLIENT, /Balas WhatsApp/);
  assert.match(DASHBOARD, /currentSlice3Access/);
  assert.match(DASHBOARD, /\/app\/native-whatsapp/);
});
