import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, ROOT), "utf8");
const ROUTE = read("src/app/app/performance/api/route.ts");
const PATCH = read("src/app/app/performance/api/[id]/route.ts");
const PAGE = read("src/app/app/performance/page.tsx");
const DETAIL = read("src/app/app/performance/[id]/page.tsx");
const CLIENT = read("src/app/app/performance/performance-client.tsx");
const CONTEXT = read("src/lib/performance-learning/context.server.ts");
const STORAGE = read("src/lib/performance-learning/storage.server.ts");
const PROVIDER = read("src/lib/performance-learning/provider.server.ts");
const OUTPUT = read("src/lib/performance-learning/provider-output.ts");
const ACCESS = read("src/lib/performance-learning/access.ts");
const CONTENT_CLIENT = read("src/app/app/content-create/content-create-client.tsx");
const DASHBOARD = read("src/app/app/page.tsx");

for (const [name, source] of [["generation", ROUTE], ["mutation", PATCH]] as const) {
  test(`${name} route enforces same-origin JSON/no-store, auth, PRO/MAX and independent access before service-role client`, () => {
    assert.match(source, /isSameOriginRequest/);
    assert.match(source, /application\/json/);
    assert.match(source, /Cache-Control.*no-store/);
    assert.match(source, /loadPerformanceLearningContext/);
    assert.match(source, /canUsePerformanceLearningTier/);
    assert.match(source, /currentPerformanceLearningAccess/);
    assert.ok(source.indexOf("loadPerformanceLearningContext") < source.indexOf("createAdminClient()"));
  });
}

test("generation route has 16KB cap, UUID idempotency, 20/hour + 100/month limits and per-user lock", () => {
  assert.match(ROUTE, /16_384/);
  assert.match(ROUTE, /REQUEST_ID_RE/);
  assert.match(ROUTE, /MAX_PER_HOUR = 20/);
  assert.match(ROUTE, /MAX_PER_MONTH = 100/);
  assert.match(ROUTE, /findPerformanceLearningByRequestId/);
  assert.match(ROUTE, /withPerformanceLearningUserLock/);
  assert.match(ROUTE, /artifact->>kind/);
});

test("source is loaded as approved owner-scoped content_create on any platform; every invalid source returns the same generic 404", () => {
  assert.match(ROUTE, /loadContentCreateArtifact/);
  assert.match(ROUTE, /artifactId:\s*request\.sourceContentCreateId/);
  assert.match(ROUTE, /userId:\s*context\.user\.id/);
  assert.match(ROUTE, /status !== "approved"/);
  assert.match(ROUTE, /Artifact sumber tidak ditemui/);
  assert.match(ROUTE, /buildApprovedPerformanceSourceSnapshot/);
  assert.doesNotMatch(ROUTE, /body\.(sourceSnapshot|metrics|status|revision|approval|provider|promiseCeiling)/);
});

test("auth is derived server-side and all privileged operations use owner predicates", () => {
  assert.match(CONTEXT, /auth\.getUser/);
  assert.match(CONTEXT, /\.eq\("user_id", user\.id\)/);
  assert.ok((STORAGE.match(/\.eq\("user_id", input\.userId\)/g) ?? []).length >= 3);
  assert.match(STORAGE, /PERFORMANCE_LEARNING_TABLE = "native_content_engine_artifacts"/);
  assert.match(STORAGE, /performance_learning_approved_immutable/);
  assert.match(PATCH, /savePerformanceLearningRevision/);
});

test("provider boundary is server-only, permanently OFF, fetch-free, secret-free and diagnosis-only", () => {
  assert.match(PROVIDER, /^import "server-only";/);
  assert.match(PROVIDER, /PERFORMANCE_LEARNING_PROVIDER_ENABLED = false/);
  const boundary = PROVIDER + OUTPUT;
  assert.doesNotMatch(boundary, /fetch\s*\(/);
  assert.doesNotMatch(boundary, /OPENAI_API_KEY|ANTHROPIC_API_KEY|DEEPSEEK_API_KEY|REPLICATE_API_TOKEN/);
  assert.doesNotMatch(boundary.toLowerCase(), /metricool|bundle\.social|connector|publish|schedule|send|auto.?generate/);
  assert.match(OUTPUT, /reconstruct|protected|revalidat/i);
});

test("independent CE-6 flag uses CE5 then CE4 then CE Review then Slice1 allowlist fallback without activation", () => {
  assert.match(ACCESS, /AI4B_PERFORMANCE_LEARNING_ENABLED/);
  assert.match(ACCESS, /AI4B_PERFORMANCE_LEARNING_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_VISUAL_PACKAGING_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_CONTENT_CREATE_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_CONTENT_REVIEW_ALLOWLIST/);
  assert.match(ACCESS, /AI4B_SLICE1_ALLOWLIST/);
  assert.doesNotMatch(ACCESS, /process\.env\.[A-Z0-9_]+\s*=/);
});

test("UI entry is CTA on approved CE-4 detail only, with lifecycle states, tabular-nums metrics and no dashboard launcher", () => {
  assert.match(CONTENT_CLIENT, /artifact\.status === "approved"[\s\S]*Rekod Prestasi →/);
  assert.match(CONTENT_CLIENT, /\/app\/performance\?sourceContentCreateId=/);
  assert.match(CONTENT_CLIENT, /\/app\/performance\?sourceContentCreateId=[^\n]*inline-flex[^\n]*min-h-11[^\n]*Rekod Prestasi →/);
  assert.match(PAGE, /sourceContentCreateId/);
  assert.match(PAGE, /status !== "approved"/);
  assert.match(PAGE, /notFound\(\)/);
  assert.match(DETAIL, /loadPerformanceLearningArtifact/);
  assert.match(CLIENT, /tabular-nums/);
  assert.match(CLIENT, /Simpan Draf/);
  assert.match(CLIENT, /Lulus & Salin/);
  assert.match(CLIENT, /Buka semula sebagai Draf/);
  assert.match(CLIENT, /Diagnosis|diagnosis/i);
  assert.match(CLIENT, /Next Best Content|Cadangan seterusnya/i);
  assert.match(CLIENT, /snapshotNote|Nota snapshot|Nota pemilik/i);
  assert.match(CLIENT, /type="number"|inputMode="numeric"/);
  assert.doesNotMatch(CLIENT, /transition-all/);
  assert.doesNotMatch(DASHBOARD, /Rekod Prestasi|Performance Learning|Performance \+/);
});

test("no CE6 migration/schema/policy/bucket or provider/media/connector side effects were added", () => {
  const migrations = readdirSync(new URL("supabase/migrations/", ROOT)).filter((name) => name.endsWith(".sql"));
  assert.deepEqual(migrations, ["202608260001_native_social_post_rls.sql", "202608280001_native_offer_rls.sql", "202608290001_native_whatsapp_rls.sql", "202608300001_native_content_engine_artifacts.sql"]);
  const surfaces = [ROUTE, PATCH, PAGE, DETAIL, CLIENT, STORAGE, PROVIDER, OUTPUT].join("\n").toLowerCase();
  assert.doesNotMatch(surfaces, /metricool|bundle\.social|publishpost|schedulepost|sendmessage|api\.whatsapp|wa\.me\/send|generateimage|generatevideo|image prompt/);
  assert.match(CLIENT, /tiada panggilan provider|provider.*off|deterministic/i);
});

test("snapshot metrics are immutable post-generation and only snapshotNote is editable pre-approval", () => {
  const DOMAIN = read("src/lib/performance-learning/domain.ts");
  assert.match(DOMAIN, /immutable/i);
  assert.match(DOMAIN, /snapshotNote/);
  // protected reconstruction: provider parser must rebuild protected fields
  assert.match(OUTPUT, /buildDeterministicPerformanceLearning/);
  assert.doesNotMatch(OUTPUT, /candidate\.(metrics|sourceSnapshot|status|revision|approval|promiseCeiling|snapshotFencing)/);
});
