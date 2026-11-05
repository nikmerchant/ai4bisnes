import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import * as telemetryView from "../src/lib/telemetry-view.ts";

// A4B-038 M1: run the real handlers and check the JSON a viewer actually receives.
const OPS = "9750ab53-d871-4b0b-8044-0a78aa9ebe6d";
const CUSTOMER = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const TELEMETRY = {
  provider: "deepseek", model: "deepseek-flash", mode: "provider",
  latencyMs: 4506, inputTokens: 900, outputTokens: 600, estimatedCostRm: 0.0049,
};
const SECRET = /deepseek|model|latencyMs|inputTokens|outputTokens|estimatedCostRm|0\.0049|4506/;

function loadRoute(relativePath: string, modules: Record<string, unknown>) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports: Record<string, unknown> = {};
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      assert.ok(Object.hasOwn(modules, name), `Unexpected runtime import: ${name}`);
      return modules[name];
    },
    console: { log() {}, error() {}, warn() {} },
  });
  return exports;
}

function countingAdmin(count: number) {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "select", "eq", "gte"]) chain[method] = () => chain;
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ count, error: null }).then(resolve);
  return chain;
}

function common(userId: string) {
  return {
    "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    "@/lib/telemetry-view": telemetryView,
    "@/lib/ai-consent": { hasAiProviderConsent: () => true },
    "@/lib/http/same-origin.server": { isSameOriginRequest: () => true },
    "@/lib/native-social-post/http": { readBoundedJsonRequest: async () => ({ requestId: REQUEST_ID }) },
    "@/lib/supabase/admin": { createAdminClient: () => countingAdmin(4) },
    context: { ok: true, user: { id: userId }, business: {}, tier: "max" },
  };
}

function socialPost(userId: string, replay = false) {
  const base = common(userId);
  return loadRoute("../src/app/app/native-social-post/api/route.ts", {
    ...base,
    "@/lib/native-social-post/access": { currentSlice1Access: () => ({ allowed: true }) },
    "@/lib/native-social-post/domain": { canUseNativeSocialPostTier: () => true, parseNativeSocialPostRequest: () => ({ topic: "x" }) },
    "@/lib/native-social-post/context.server": { loadNativeSocialPostContext: async () => base.context },
    "@/lib/native-social-post/provider.server": { generateNativeSocialPost: async () => ({ artifact: { status: "draft" }, telemetry: TELEMETRY, warning: null }) },
    "@/lib/native-social-post/storage.server": {
      findNativeSocialPostByRequestId: async () => (replay ? { id: 7, artifact: { status: "draft" }, telemetry: TELEMETRY } : null),
      saveNativeSocialPost: async (input: { artifact: unknown; telemetry: unknown }) => ({ id: 8, artifact: input.artifact, telemetry: input.telemetry }),
    },
    "@/lib/native-social-post/concurrency.server": {
      NativeSocialPostBusyError: class extends Error {},
      withNativeSocialPostUserLock: (_id: string, fn: () => unknown) => fn(),
    },
  }).POST as (req: Request) => Promise<Response>;
}

function offerPost(userId: string) {
  const base = common(userId);
  return loadRoute("../src/app/app/native-offer/api/route.ts", {
    ...base,
    "@/lib/native-offer/access": { currentSlice2Access: () => ({ allowed: true }) },
    "@/lib/native-offer/domain": { canUseNativeOfferTier: () => true, parseNativeOfferRequest: () => ({ sourcePostId: null }) },
    "@/lib/native-offer/context.server": { loadNativeOfferContext: async () => base.context },
    "@/lib/native-offer/provider.server": { generateNativeOffer: async () => ({ artifact: { status: "draft" }, telemetry: TELEMETRY, warning: null }) },
    "@/lib/native-social-post/storage.server": { loadNativeSocialPost: async () => null },
    "@/lib/native-offer/storage.server": {
      findNativeOfferByRequestId: async () => null,
      saveNativeOffer: async (input: { artifact: unknown; telemetry: unknown }) => ({ id: 9, artifact: input.artifact, telemetry: input.telemetry }),
    },
    "@/lib/native-offer/concurrency.server": {
      NativeOfferBusyError: class extends Error {},
      withNativeOfferUserLock: (_id: string, fn: () => unknown) => fn(),
    },
  }).POST as (req: Request) => Promise<Response>;
}

function socialPatch(userId: string) {
  const base = common(userId);
  return loadRoute("../src/app/app/native-social-post/api/[id]/route.ts", {
    ...base,
    "@/lib/native-social-post/access": { currentSlice1Access: () => ({ allowed: true }) },
    "@/lib/native-social-post/domain": { canUseNativeSocialPostTier: () => true, applySocialPostEdits: (artifact: unknown) => artifact },
    "@/lib/native-social-post/context.server": { loadNativeSocialPostContext: async () => base.context },
    "@/lib/native-social-post/storage.server": {
      loadNativeSocialPost: async () => ({ id: 7, artifact: { status: "draft" }, telemetry: TELEMETRY }),
      updateNativeSocialPost: async (input: { stored: { telemetry: unknown }; artifact: unknown }) => ({ id: 7, artifact: input.artifact, telemetry: input.stored.telemetry }),
    },
  }).PATCH as (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
}

const request = () => new Request("https://ai4bisnes.com/x", { method: "POST", headers: { "content-type": "application/json" } });

async function asViewer(t: test.TestContext, call: () => Promise<Response>) {
  const inherited = process.env.AI4B_OPS_USER_IDS;
  process.env.AI4B_OPS_USER_IDS = OPS;
  t.after(() => { if (inherited === undefined) delete process.env.AI4B_OPS_USER_IDS; else process.env.AI4B_OPS_USER_IDS = inherited; });
  const response = await call();
  assert.equal(response.status, 200);
  return (await response.json()) as Record<string, unknown> & { telemetry: { aiGenerated: boolean; detail: unknown } };
}

for (const [name, call] of [
  ["Social POST save", (user: string) => socialPost(user)(request())],
  ["Social POST replay", (user: string) => socialPost(user, true)(request())],
  ["Offer POST save", (user: string) => offerPost(user)(request())],
  ["Social PATCH", (user: string) => socialPatch(user)(request(), { params: Promise.resolve({ id: "7" }) })],
] as const) {
  test(`${name}: customer JSON has no model, latency, tokens or cost`, async (t) => {
    const body = await asViewer(t, () => call(CUSTOMER));
    assert.deepEqual(body.telemetry, { aiGenerated: true, detail: null });
    assert.doesNotMatch(JSON.stringify(body), SECRET);
  });

  test(`${name}: ops JSON keeps the full evidence`, async (t) => {
    const body = await asViewer(t, () => call(OPS));
    assert.deepEqual(body.telemetry, { aiGenerated: true, detail: TELEMETRY });
  });
}

test("POST save and replay both return the monthly quota (m1)", async (t) => {
  const saved = await asViewer(t, () => socialPost(CUSTOMER)(request()));
  const replayed = await asViewer(t, () => socialPost(CUSTOMER, true)(request()));
  assert.deepEqual([(saved.quota as { used: number }).used, (replayed.quota as { used: number }).used], [5, 4]);
});

// Static backstop for every other route: no telemetry value may leave a route except through forViewer.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(path).isDirectory() ? files(path) : path.endsWith("route.ts") ? [path] : [];
  });
}

test("routes never read .telemetry outside forViewer or the provider result", () => {
  const app = fileURLToPath(new URL("../src/app/app", import.meta.url)).replaceAll("\\", "/");
  for (const path of files(app)) {
    const source = readFileSync(path, "utf8")
      .replace(/forViewer\(\w+\.telemetry,/g, "")
      .replace(/\bgenerated\.telemetry\b/g, "");
    assert.doesNotMatch(source, /\b\w+\.telemetry\b/, path);
  }
});

test("migration revokes owner SELECT on all four artifact tables (B1)", () => {
  const sql = readFileSync(new URL("../supabase/migrations/202611050001_revoke_artifact_select_from_authenticated.sql", import.meta.url), "utf8");
  for (const table of ["native_social_post_artifacts", "native_offer_artifacts", "native_whatsapp_draft_artifacts", "native_content_engine_artifacts"]) {
    assert.match(sql, new RegExp(`revoke select on table public\\.${table} from authenticated;`));
  }
  assert.doesNotMatch(sql, /^\s*grant\s/im);
});
