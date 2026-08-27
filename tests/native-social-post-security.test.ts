import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const GENERATE_ROUTE = readFileSync(new URL("../src/app/app/native-social-post/api/route.ts", import.meta.url), "utf8");
const UPDATE_ROUTE = readFileSync(new URL("../src/app/app/native-social-post/api/[id]/route.ts", import.meta.url), "utf8");
const STORAGE = readFileSync(new URL("../src/lib/native-social-post/storage.server.ts", import.meta.url), "utf8");
const PROVIDER = readFileSync(new URL("../src/lib/native-social-post/provider.server.ts", import.meta.url), "utf8");
const ACCESS = readFileSync(new URL("../src/lib/native-social-post/access.ts", import.meta.url), "utf8");
const ACCESS_POLICY = readFileSync(new URL("../src/lib/native-social-post/access-policy.ts", import.meta.url), "utf8");
const CONTEXT = readFileSync(new URL("../src/lib/native-social-post/context.server.ts", import.meta.url), "utf8");


test("generation authenticates before privileged client and derives tier server-side", () => {
  assert.ok(GENERATE_ROUTE.indexOf("loadNativeSocialPostContext()") < GENERATE_ROUTE.indexOf("createAdminClient()"));
  assert.match(GENERATE_ROUTE, /canUseNativeSocialPostTier\(context\.tier\)/);
  assert.doesNotMatch(GENERATE_ROUTE, /body\.user_id|body\.tier/);
});

test("context reads entitlement through a post-auth owner-scoped admin query", () => {
  assert.ok(CONTEXT.indexOf("auth.getUser()") < CONTEXT.indexOf("createAdminClient()"));
  assert.match(CONTEXT, /admin\s*\.from\("subscriptions"\)/);
  assert.match(CONTEXT, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(CONTEXT, /supabase\s*\.from\("subscriptions"\)/);
});

test("generation has origin, JSON, body-size, idempotency and usage caps", () => {
  assert.match(GENERATE_ROUTE, /validOrigin/);
  assert.match(GENERATE_ROUTE, /MAX_BODY_BYTES/);
  assert.match(GENERATE_ROUTE, /REQUEST_ID_RE/);
  assert.match(GENERATE_ROUTE, /findNativeSocialPostByRequestId/);
  assert.match(GENERATE_ROUTE, /MAX_PER_HOUR/);
  assert.match(GENERATE_ROUTE, /MAX_PER_MONTH/);
  assert.match(GENERATE_ROUTE, /withNativeSocialPostUserLock/);
});

test("all privileged operations use shadow table and explicit owner scope", () => {
  const ownerPredicates = STORAGE.match(/\.eq\("user_id", input\.userId\)/g) ?? [];
  assert.ok(ownerPredicates.length >= 3);
  assert.match(STORAGE, /NATIVE_SOCIAL_POST_TABLE = "native_social_post_artifacts"/);
  assert.doesNotMatch(STORAGE, /\.from\("generated_outputs"\)/);
  assert.match(UPDATE_ROUTE, /loadNativeSocialPostContext/);
  assert.match(UPDATE_ROUTE, /loadNativeSocialPost/);
});

test("provider secrets stay server-only and outbound host is allowlisted", () => {
  assert.match(PROVIDER, /^import "server-only";/);
  assert.match(PROVIDER, /AI4B_NATIVE_PROVIDER_ALLOWED_HOSTS/);
  assert.match(PROVIDER, /url\.protocol !== "https:"/);
  assert.doesNotMatch(PROVIDER, /NEXT_PUBLIC_DEEPSEEK|NEXT_PUBLIC_.*KEY/);
});

test("production feature access requires explicit flag and allowlist", () => {
  assert.match(ACCESS, /^import "server-only";/);
  assert.match(ACCESS, /AI4B_DEPLOYMENT_TARGET/);
  assert.match(ACCESS, /AI4B_SLICE1_ENABLED/);
  assert.match(ACCESS, /AI4B_SLICE1_ALLOWLIST/);
  assert.match(ACCESS_POLICY, /production_forbidden/);
  assert.match(ACCESS_POLICY, /allowlist_required/);
  assert.match(ACCESS_POLICY, /target === "staging"/);
  assert.match(ACCESS_POLICY, /target === "production-canary"/);
  assert.match(ACCESS_POLICY, /allowlisted_production_canary/);
});


