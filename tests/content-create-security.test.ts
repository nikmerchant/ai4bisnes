import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const ROUTE = readFileSync(new URL("../src/app/app/content-create/api/route.ts", import.meta.url), "utf8");
const PATCH = readFileSync(new URL("../src/app/app/content-create/api/[id]/route.ts", import.meta.url), "utf8");
const PAGE = readFileSync(new URL("../src/app/app/content-create/page.tsx", import.meta.url), "utf8");
const DETAIL = readFileSync(new URL("../src/app/app/content-create/[id]/page.tsx", import.meta.url), "utf8");
const CLIENT = readFileSync(new URL("../src/app/app/content-create/content-create-client.tsx", import.meta.url), "utf8");
const CONTEXT = readFileSync(new URL("../src/lib/content-create/context.server.ts", import.meta.url), "utf8");
const STORAGE = readFileSync(new URL("../src/lib/content-create/storage.server.ts", import.meta.url), "utf8");
const PROVIDER = readFileSync(new URL("../src/lib/content-create/provider.server.ts", import.meta.url), "utf8");
const OUTPUT = readFileSync(new URL("../src/lib/content-create/provider-output.ts", import.meta.url), "utf8");
const ACCESS = readFileSync(new URL("../src/lib/content-create/access.ts", import.meta.url), "utf8");
const OFFER_CLIENT = readFileSync(new URL("../src/app/app/native-offer/native-offer-client.tsx", import.meta.url), "utf8");
const DASHBOARD = readFileSync(new URL("../src/app/app/page.tsx", import.meta.url), "utf8");
const MIGRATION_DIR = new URL("../supabase/migrations/", import.meta.url);

for (const [name, source] of [["generation", ROUTE], ["mutation", PATCH]] as const) {
  test(`${name} route enforces same-origin JSON/no-store, auth, PRO/MAX and independent access before service role`, () => {
    assert.match(source, /isSameOriginRequest/);
    assert.match(source, /application\/json/);
    assert.match(source, /Cache-Control.*no-store/);
    assert.match(source, /loadContentCreateContext/);
    assert.match(source, /canUseContentCreateTier/);
    assert.match(source, /currentContentCreateAccess/);
    assert.ok(source.indexOf("loadContentCreateContext") < source.indexOf("createAdminClient()"));
  });
}

test("generation route has 16KB cap, UUID idempotency, 20/hour + 100/month caps and per-user lock", () => {
  assert.match(ROUTE, /16_384/);
  assert.match(ROUTE, /REQUEST_ID_RE/);
  assert.match(ROUTE, /MAX_PER_HOUR = 20/);
  assert.match(ROUTE, /MAX_PER_MONTH = 100/);
  assert.match(ROUTE, /findContentCreateByRequestId/);
  assert.match(ROUTE, /withContentCreateUserLock/);
  assert.match(ROUTE, /artifact->>kind/);
});

test("route ignores client Offer/context/protected state and loads approved Offer by id + authenticated owner with generic 404", () => {
  assert.match(ROUTE, /loadNativeOffer/);
  assert.match(ROUTE, /artifactId:\s*request\.sourceOfferId/);
  assert.match(ROUTE, /userId:\s*context\.user\.id/);
  assert.match(ROUTE, /artifact\.status !== "approved"/);
  assert.match(ROUTE, /Artifact sumber tidak ditemui/);
  assert.match(ROUTE, /buildApprovedOfferSnapshot/);
  assert.doesNotMatch(ROUTE, /body\.(offer|sourceOfferSnapshot|businessContext|strategy|claimLedger|status|approval|provider)/);
});

test("context derives Business Context and entitlement server-side with owner predicates", () => {
  assert.match(CONTEXT, /auth\.getUser/);
  assert.match(CONTEXT, /semak_langganan/);
  assert.match(CONTEXT, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(CONTEXT, /body\.(tier|user_id|business)/);
});

test("all privileged artifact operations owner-scope existing table and approved revisions insert instead of update", () => {
  assert.match(STORAGE, /CONTENT_CREATE_TABLE = "native_content_engine_artifacts"/);
  assert.ok((STORAGE.match(/\.eq\("user_id", input\.userId\)/g) ?? []).length >= 3);
  assert.match(PATCH, /saveContentCreateRevision/);
  assert.match(PATCH, /findContentCreateByRequestId/);
  assert.match(PATCH, /stored\.artifact\.status === "approved"/);
  assert.match(STORAGE, /content_create_approved_immutable/);
  assert.doesNotMatch(ROUTE + PATCH + STORAGE, /generated_outputs/);
});

test("provider is server-only, permanently OFF, fetch-free and candidate prose is claim-revalidated", () => {
  assert.match(PROVIDER, /^import "server-only";/);
  assert.match(PROVIDER, /CONTENT_CREATE_PROVIDER_ENABLED = false/);
  assert.doesNotMatch(PROVIDER + OUTPUT, /fetch\s*\(/);
  assert.doesNotMatch(PROVIDER + OUTPUT, /DEEPSEEK_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY/);
  assert.match(OUTPUT, /GENERATED_CANDIDATE/);
  assert.match(OUTPUT, /revalidat|sanitize|unsafe/i);
});

test("independent CE flag uses CE/Slice1 allowlist fallback without environment activation", () => {
  assert.match(ACCESS, /AI4B_CONTENT_CREATE_ENABLED/);
  assert.match(ACCESS, /AI4B_CONTENT_CREATE_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_CONTENT_REVIEW_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_SLICE1_ALLOWLIST/);
  assert.doesNotMatch(ACCESS, /process\.env\.[A-Z0-9_]+\s*=/);
});

test("UI exists only from an approved Offer and supports strategy/proof/bridge/claims/draft/save/approve-copy/reopen", () => {
  assert.match(OFFER_CLIENT, /artifact\.status === "approved"[\s\S]*Bina Content untuk Tawaran Ini/);
  assert.match(OFFER_CLIENT, /\/app\/content-create\?sourceOfferId=/);
  assert.match(PAGE, /sourceOfferId/);
  assert.match(PAGE, /artifact\.status !== "approved"/);
  assert.match(PAGE, /notFound\(\)/);
  assert.match(CLIENT, /Platform/);
  assert.match(CLIENT, /Objektif/);
  assert.match(CLIENT, /Content role/);
  assert.match(CLIENT, /Lebih Kawalan/);
  assert.match(CLIENT, /Strategi content/);
  assert.match(CLIENT, /Strategi bukti/);
  assert.match(CLIENT, /Jambatan ke tawaran/);
  assert.match(CLIENT, /Risiko claim/);
  assert.match(CLIENT, /Draf social/);
  assert.match(CLIENT, /Simpan Draf/);
  assert.match(CLIENT, /Lulus & Salin/);
  assert.match(CLIENT, /Buka semula sebagai Draf/);
  assert.match(DETAIL, /loadContentCreateArtifact/);
});

test("no dashboard launcher, visual/image/video/publish/schedule/send integration, or new migration/schema/policy file", () => {
  assert.doesNotMatch(DASHBOARD, /Bina Content untuk Tawaran Ini|Content Engine/);
  const surfaces = [ROUTE, PATCH, PAGE, DETAIL, CLIENT].join("\n").toLowerCase();
  assert.doesNotMatch(surfaces, /metricool|publishpost|schedulepost|sendmessage|api\.whatsapp|wa\.me\/send|generateimage|generatevideo/);
  assert.match(CLIENT, /Tiada visual, imej, video, publish, schedule atau send/i);
  const migrations = readdirSync(MIGRATION_DIR).filter((name) => name.endsWith(".sql"));
  assert.deepEqual(migrations, [
    "202608260001_native_social_post_rls.sql",
    "202608280001_native_offer_rls.sql",
    "202608290001_native_whatsapp_rls.sql",
    "202608300001_native_content_engine_artifacts.sql",
    "202609040001_affiliate_promo_artifacts.sql",
  ]);
});
