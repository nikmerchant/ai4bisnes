import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const GENERATE_ROUTE = readFileSync(new URL("../src/app/app/native-offer/api/route.ts", import.meta.url), "utf8");
const UPDATE_ROUTE = readFileSync(new URL("../src/app/app/native-offer/api/[id]/route.ts", import.meta.url), "utf8");
const STORAGE = readFileSync(new URL("../src/lib/native-offer/storage.server.ts", import.meta.url), "utf8");
const PROVIDER = readFileSync(new URL("../src/lib/native-offer/provider.server.ts", import.meta.url), "utf8");
const ACCESS = readFileSync(new URL("../src/lib/native-offer/access.ts", import.meta.url), "utf8");
const ACCESS_POLICY = readFileSync(new URL("../src/lib/native-offer/access-policy.ts", import.meta.url), "utf8");
const CONTEXT = readFileSync(new URL("../src/lib/native-offer/context.server.ts", import.meta.url), "utf8");

test("offer generation authenticates before privileged client and derives tier server-side", () => {
  assert.ok(GENERATE_ROUTE.indexOf("loadNativeOfferContext()") < GENERATE_ROUTE.indexOf("createAdminClient()"));
  assert.match(GENERATE_ROUTE, /canUseNativeOfferTier\(context\.tier\)/);
  assert.doesNotMatch(GENERATE_ROUTE, /body\.user_id|body\.tier/);
});

test("offer context reads entitlement through a post-auth owner-scoped admin query", () => {
  assert.ok(CONTEXT.indexOf("auth.getUser()") < CONTEXT.indexOf("createAdminClient()"));
  assert.match(CONTEXT, /admin\s*\.from\("subscriptions"\)/);
  assert.match(CONTEXT, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(CONTEXT, /supabase\s*\.from\("subscriptions"\)/);
});

test("offer routes validate proxy-aware same-origin and JSON content type", () => {
  assert.match(GENERATE_ROUTE, /isSameOriginRequest/);
  assert.match(UPDATE_ROUTE, /isSameOriginRequest/);
  assert.match(GENERATE_ROUTE, /application\/json/);
});

test("offer generation has body-size, idempotency and usage caps", () => {
  assert.match(GENERATE_ROUTE, /MAX_BODY_BYTES/);
  assert.match(GENERATE_ROUTE, /REQUEST_ID_RE/);
  assert.match(GENERATE_ROUTE, /findNativeOfferByRequestId/);
  assert.match(GENERATE_ROUTE, /MAX_PER_HOUR/);
  assert.match(GENERATE_ROUTE, /MAX_PER_MONTH/);
  assert.match(GENERATE_ROUTE, /withNativeOfferUserLock/);
});

test("all privileged offer operations use shadow table and explicit owner scope", () => {
  const ownerPredicates = STORAGE.match(/\.eq\("user_id", input\.userId\)/g) ?? [];
  assert.ok(ownerPredicates.length >= 3);
  assert.match(STORAGE, /NATIVE_OFFER_TABLE = "native_offer_artifacts"/);
  assert.doesNotMatch(STORAGE, /\.from\("generated_outputs"\)/);
  assert.doesNotMatch(STORAGE, /\.from\("native_social_post_artifacts"\)/);
  assert.match(UPDATE_ROUTE, /loadNativeOfferContext/);
  assert.match(UPDATE_ROUTE, /loadNativeOffer/);
});

test("offer provider secrets stay server-only and host is allowlisted", () => {
  assert.match(PROVIDER, /^import "server-only";/);
  assert.match(PROVIDER, /AI4B_NATIVE_PROVIDER_ALLOWED_HOSTS/);
  assert.match(PROVIDER, /url\.protocol !== "https:"/);
  assert.doesNotMatch(PROVIDER, /NEXT_PUBLIC_DEEPSEEK|NEXT_PUBLIC_.*KEY/);
});

test("slice 2 feature access requires independent flag and allowlist", () => {
  assert.match(ACCESS, /^import "server-only";/);
  assert.match(ACCESS, /AI4B_SLICE2_ENABLED/);
  assert.match(ACCESS, /AI4B_SLICE2_ALLOWLIST/);
  assert.doesNotMatch(ACCESS, /AI4B_SLICE1_ENABLED/);
  assert.match(ACCESS_POLICY, /production_forbidden/);
  assert.match(ACCESS_POLICY, /allowlist_required/);
  assert.match(ACCESS_POLICY, /target === "production-canary"/);
  assert.match(ACCESS_POLICY, /allowlisted_production_canary/);
});
