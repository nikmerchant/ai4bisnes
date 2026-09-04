import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, ROOT), "utf8");
const ROUTE = read("src/app/app/visual-plan/api/route.ts");
const PATCH = read("src/app/app/visual-plan/api/[id]/route.ts");
const PAGE = read("src/app/app/visual-plan/page.tsx");
const DETAIL = read("src/app/app/visual-plan/[id]/page.tsx");
const CLIENT = read("src/app/app/visual-plan/visual-plan-client.tsx");
const CONTEXT = read("src/lib/visual-packaging/context.server.ts");
const STORAGE = read("src/lib/visual-packaging/storage.server.ts");
const PROVIDER = read("src/lib/visual-packaging/provider.server.ts");
const OUTPUT = read("src/lib/visual-packaging/provider-output.ts");
const MEDIA = read("src/lib/visual-packaging/media.server.ts");
const ACCESS = read("src/lib/visual-packaging/access.ts");
const CONTENT_CLIENT = read("src/app/app/content-create/content-create-client.tsx");
const DASHBOARD = read("src/app/app/page.tsx");

for (const [name, source] of [["generation", ROUTE], ["mutation", PATCH]] as const) {
  test(`${name} route enforces same-origin JSON/no-store, auth, PRO/MAX and independent access before service-role client`, () => {
    assert.match(source, /isSameOriginRequest/);
    assert.match(source, /application\/json/);
    assert.match(source, /Cache-Control.*no-store/);
    assert.match(source, /loadVisualPackagingContext/);
    assert.match(source, /canUseVisualPackagingTier/);
    assert.match(source, /currentVisualPackagingAccess/);
    assert.ok(source.indexOf("loadVisualPackagingContext") < source.indexOf("createAdminClient()"));
  });
}

test("generation route has 16KB cap, UUID idempotency, 20/hour + 100/month limits and per-user lock", () => {
  assert.match(ROUTE, /16_384/);
  assert.match(ROUTE, /REQUEST_ID_RE/);
  assert.match(ROUTE, /MAX_PER_HOUR = 20/);
  assert.match(ROUTE, /MAX_PER_MONTH = 100/);
  assert.match(ROUTE, /findVisualPackagingByRequestId/);
  assert.match(ROUTE, /withVisualPackagingUserLock/);
  assert.match(ROUTE, /artifact->>kind/);
});

test("source is loaded as approved owner-scoped TikTok content_create and every invalid source returns same generic 404", () => {
  assert.match(ROUTE, /loadContentCreateArtifact/);
  assert.match(ROUTE, /artifactId:\s*request\.sourceContentCreateId/);
  assert.match(ROUTE, /userId:\s*context\.user\.id/);
  assert.match(ROUTE, /status !== "approved"/);
  assert.match(ROUTE, /platform !== "tiktok"/);
  assert.match(ROUTE, /Artifact sumber tidak ditemui/);
  assert.match(ROUTE, /buildApprovedContentCreateSnapshot/);
  assert.doesNotMatch(ROUTE, /body\.(sourceSnapshot|claimLedger|status|revision|approval|provider|promiseCeiling)/);
});

test("auth is derived server-side and all privileged operations use owner predicates", () => {
  assert.match(CONTEXT, /auth\.getUser/);
  assert.match(CONTEXT, /\.eq\("user_id", user\.id\)/);
  assert.ok((STORAGE.match(/\.eq\("user_id", input\.userId\)/g) ?? []).length >= 3);
  assert.match(STORAGE, /VISUAL_PACKAGING_TABLE = "native_content_engine_artifacts"/);
  assert.match(STORAGE, /visual_packaging_approved_immutable/);
  assert.match(PATCH, /saveVisualPackagingRevision/);
});

test("provider and media boundaries are server-only, permanently OFF, fetch-free, secret-free and direction-only", () => {
  assert.match(PROVIDER, /^import "server-only";/);
  assert.match(MEDIA, /^import "server-only";/);
  assert.match(PROVIDER, /VISUAL_PACKAGING_PROVIDER_ENABLED = false/);
  assert.match(MEDIA, /VISUAL_PACKAGING_MEDIA_ENABLED = false/);
  const boundary = PROVIDER + OUTPUT + MEDIA;
  assert.doesNotMatch(boundary, /fetch\s*\(/);
  assert.doesNotMatch(boundary, /OPENAI_API_KEY|ANTHROPIC_API_KEY|DEEPSEEK_API_KEY|REPLICATE_API_TOKEN/);
  assert.doesNotMatch(boundary.toLowerCase(), /generateimage|generatevideo|upload|bucket|publish|schedule|send/);
  assert.match(OUTPUT, /revalidat|sanitize|protected/i);
});

test("independent CE-5 flag uses CE4 then CE Review then Slice1 allowlist fallback without activation", () => {
  assert.match(ACCESS, /AI4B_VISUAL_PACKAGING_ENABLED/);
  assert.match(ACCESS, /AI4B_VISUAL_PACKAGING_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_CONTENT_CREATE_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_CONTENT_REVIEW_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_SLICE1_ALLOWLIST/);
  assert.doesNotMatch(ACCESS, /process\.env\.[A-Z0-9_]+\s*=/);
});

test("UI entry is only on approved TikTok CE4, shows selected format plan and lifecycle states, with no dashboard launcher", () => {
  assert.match(CONTENT_CLIENT, /artifact\.status === "approved"[\s\S]*artifact\.platform === "tiktok"[\s\S]*Bina Visual Plan →/);
  assert.match(CONTENT_CLIENT, /\/app\/visual-plan\?sourceContentCreateId=/);
  assert.match(CONTENT_CLIENT, /\/app\/visual-plan\?sourceContentCreateId=[^\n]*inline-flex[^\n]*min-h-11[^\n]*Bina Visual Plan →/);
  assert.match(PAGE, /sourceContentCreateId/);
  assert.match(PAGE, /status !== "approved"/);
  assert.match(PAGE, /platform !== "tiktok"/);
  assert.match(PAGE, /notFound\(\)/);
  assert.match(CLIENT, /Format/);
  assert.match(CLIENT, /Packaging intent/);
  assert.match(CLIENT, /Lebih Kawalan/);
  assert.match(CLIENT, /Packaging bersama/);
  assert.match(CLIENT, /Pelan short video|Pelan static post|Pelan carousel/);
  assert.match(CLIENT, /Keselamatan visual/);
  assert.match(CLIENT, /Simpan Draf/);
  assert.match(CLIENT, /Lulus & Salin/);
  assert.match(CLIENT, /Buka semula sebagai Draf/);
  assert.match(CLIENT, /\/app\/visual-plan\/\$\{artifactId\}[^\n]*inline-flex[^\n]*min-h-11[^\n]*Pautan buka semula/);
  assert.match(CLIENT, /tabular-nums/);
  assert.doesNotMatch(CLIENT, /transition-all/);
  assert.doesNotMatch(DASHBOARD, /Bina Visual Plan|Visual Packaging/);
  assert.match(DETAIL, /loadVisualPackagingArtifact/);
});

test("no CE5 migration/schema/policy/bucket or media/publish side effects were added", () => {
  const migrations = readdirSync(new URL("supabase/migrations/", ROOT)).filter((name) => name.endsWith(".sql"));
  assert.deepEqual(migrations, ["202608260001_native_social_post_rls.sql", "202608280001_native_offer_rls.sql", "202608290001_native_whatsapp_rls.sql", "202608300001_native_content_engine_artifacts.sql", "202609040001_affiliate_promo_artifacts.sql"]);
  const surfaces = [ROUTE, PATCH, PAGE, DETAIL, CLIENT, STORAGE, PROVIDER, MEDIA].join("\n").toLowerCase();
  assert.doesNotMatch(surfaces, /metricool|publishpost|schedulepost|sendmessage|api\.whatsapp|wa\.me\/send|generateimage|generatevideo|image prompt/);
  assert.match(CLIENT, /Tiada penjanaan media, upload, render, publish, schedule atau send/i);
});
