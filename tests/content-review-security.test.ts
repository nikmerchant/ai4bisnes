import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ROUTE = readFileSync(new URL("../src/app/app/content-review/api/route.ts", import.meta.url), "utf8");
const PATCH = readFileSync(new URL("../src/app/app/content-review/api/[id]/route.ts", import.meta.url), "utf8");
const PAGE = readFileSync(new URL("../src/app/app/content-review/page.tsx", import.meta.url), "utf8");
const DETAIL = readFileSync(new URL("../src/app/app/content-review/[id]/page.tsx", import.meta.url), "utf8");
const CLIENT = readFileSync(new URL("../src/app/app/content-review/content-review-client.tsx", import.meta.url), "utf8");
const CONTEXT = readFileSync(new URL("../src/lib/content-review/context.server.ts", import.meta.url), "utf8");
const STORAGE = readFileSync(new URL("../src/lib/content-review/storage.server.ts", import.meta.url), "utf8");
const PROVIDER = readFileSync(new URL("../src/lib/content-review/provider.server.ts", import.meta.url), "utf8");
const ACCESS = readFileSync(new URL("../src/lib/content-review/access.ts", import.meta.url), "utf8");
const SOCIAL_CLIENT = readFileSync(new URL("../src/app/app/native-social-post/native-social-post-client.tsx", import.meta.url), "utf8");
const DASHBOARD = readFileSync(new URL("../src/app/app/page.tsx", import.meta.url), "utf8");

for (const [name, source] of [["generation", ROUTE], ["mutation", PATCH]] as const) {
  test(`${name} route authenticates, enforces same-origin/JSON/no-store and PRO/MAX`, () => {
    assert.match(source, /isSameOriginRequest/);
    assert.match(source, /application\/json/);
    assert.match(source, /Cache-Control.*no-store/);
    assert.match(source, /loadContentReviewContext/);
    assert.match(source, /currentContentReviewAccess/);
    assert.match(source, /canUseContentReviewTier/);
  });
}

test("generation route has 16KB cap, UUID idempotency, caps and per-user lock", () => {
  assert.match(ROUTE, /16_384/);
  assert.match(ROUTE, /REQUEST_ID_RE/);
  assert.match(ROUTE, /MAX_PER_HOUR = 20/);
  assert.match(ROUTE, /MAX_PER_MONTH = 100/);
  assert.match(ROUTE, /findContentReviewByRequestId/);
  assert.match(ROUTE, /withContentReviewUserLock/);
});

test("owned Social Post source is loaded by id plus user, allows draft/approved, and client text is replaced", () => {
  assert.match(ROUTE, /loadNativeSocialPost/);
  assert.match(ROUTE, /artifactId:\s*request\.sourceSocialPostId/);
  assert.match(ROUTE, /userId:\s*context\.user\.id/);
  assert.match(ROUTE, /\["draft",\s*"approved"\]/);
  assert.match(ROUTE, /renderSocialPostText/);
  assert.match(ROUTE, /sourceText:\s*canonicalSourceText/);
  assert.match(ROUTE, /Artifact sumber tidak ditemui/);
});

test("auth precedes service role; context tier and Business Context are server-derived/owner-scoped", () => {
  assert.ok(ROUTE.indexOf("loadContentReviewContext") < ROUTE.indexOf("createAdminClient()"));
  assert.match(CONTEXT, /auth\.getUser/);
  assert.match(CONTEXT, /semak_langganan/);
  assert.match(CONTEXT, /\.eq\("user_id", user\.id\)/);
});

test("all privileged artifact operations explicitly owner-scope the isolated table", () => {
  assert.match(ROUTE, /native_content_engine_artifacts/);
  assert.match(PATCH, /userId:\s*context\.user\.id/);
  assert.match(STORAGE, /\.eq\("user_id", input\.userId\)/);
  assert.doesNotMatch(ROUTE + PATCH + PAGE + DETAIL, /generated_outputs/);
});

test("approved edits create idempotent new rows while cached mutations stay outside generation caps", () => {
  assert.match(ROUTE, /artifact->improvedDraft->>revision/);
  assert.match(PATCH, /saveContentReviewRevision/);
  assert.match(PATCH, /findContentReviewByRequestId/);
  assert.match(PATCH, /REQUEST_ID_RE/);
  assert.match(CLIENT, /mutationRequestIdRef/);
});

test("provider boundary is server-only and permanently OFF for this slice", () => {
  assert.match(PROVIDER, /"server-only"/);
  assert.match(PROVIDER, /CONTENT_REVIEW_PROVIDER_ENABLED = false/);
  assert.doesNotMatch(PROVIDER, /fetch\s*\(/);
  assert.doesNotMatch(PROVIDER, /DEEPSEEK_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY/);
});

test("independent CE flag uses fallback allowlist without activating any environment", () => {
  assert.match(ACCESS, /AI4B_CONTENT_REVIEW_ENABLED/);
  assert.match(ACCESS, /AI4B_CONTENT_REVIEW_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_SLICE1_ALLOWLIST/);
});

test("UI is under Tulis Post, links from owned Social Post, supports paste/edit/save/approve-copy/reopen", () => {
  assert.match(PAGE, /Tulis Post/);
  assert.match(SOCIAL_CLIENT, /Semak lebih mendalam/);
  assert.match(SOCIAL_CLIENT, /\/app\/content-review\?sourceSocialPostId=/);
  assert.match(CLIENT, /sourceText/);
  assert.match(CLIENT, /Simpan Draf/);
  assert.match(CLIENT, /Lulus & Salin/);
  assert.match(CLIENT, /Pautan buka semula/);
  assert.match(CLIENT, /Buka semula sebagai Draf/);
});

test("no Content Engine dashboard launcher and no auto-publish/send/schedule capability", () => {
  assert.doesNotMatch(DASHBOARD, /Content Engine/);
  const surfaces = [ROUTE, PATCH, PAGE, DETAIL, CLIENT].join("\n").toLowerCase();
  assert.doesNotMatch(surfaces, /metricool|publishpost|schedulepost|sendmessage|api\.whatsapp|wa\.me\/send/);
  assert.match(CLIENT, /Tiada auto-publish, schedule atau send/i);
});
