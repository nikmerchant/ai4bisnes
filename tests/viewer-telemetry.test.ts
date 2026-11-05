import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { aiQuota, forViewer, isOpsUser } from "../src/lib/telemetry-view.ts";

// A4B-038: customers must never receive our model, latency, tokens or cost.
const TELEMETRY = {
  provider: "deepseek", model: "deepseek-flash", mode: "provider" as const,
  latencyMs: 4506, inputTokens: 900, outputTokens: 600, estimatedCostRm: 0.0049,
};
const OPS = "9750ab53-d871-4b0b-8044-0a78aa9ebe6d";

function withOps(t: test.TestContext, value: string | undefined) {
  const inherited = process.env.AI4B_OPS_USER_IDS;
  if (value === undefined) delete process.env.AI4B_OPS_USER_IDS; else process.env.AI4B_OPS_USER_IDS = value;
  t.after(() => {
    if (inherited === undefined) delete process.env.AI4B_OPS_USER_IDS; else process.env.AI4B_OPS_USER_IDS = inherited;
  });
}

test("customers get only whether the draft was AI-generated", (t) => {
  withOps(t, OPS);
  const view = forViewer(TELEMETRY, { id: "11111111-1111-4111-8111-111111111111" });
  assert.deepEqual(view, { aiGenerated: true, detail: null });
  assert.doesNotMatch(JSON.stringify(view), /deepseek|4506|0\.0049|Tokens/);
  assert.deepEqual(forViewer({ ...TELEMETRY, mode: "deterministic_fallback" as const }, { id: "x" }), { aiGenerated: false, detail: null });
});

test("ops users keep the full evidence", (t) => {
  withOps(t, ` ${OPS.toUpperCase()} , other`);
  assert.equal(isOpsUser({ id: OPS }), true);
  assert.deepEqual(forViewer(TELEMETRY, { id: OPS }), { aiGenerated: true, detail: TELEMETRY });
});

test("no ops list means nobody sees evidence", (t) => {
  withOps(t, undefined);
  assert.equal(isOpsUser({ id: OPS }), false);
});

test("aiQuota counts down and resets on the 1st of next month (UTC)", () => {
  assert.deepEqual(aiQuota(13, 100, new Date("2026-11-05T01:00:00Z")),
    { used: 13, limit: 100, remaining: 87, resetsAt: "2026-12-01T00:00:00.000Z" });
  assert.equal(aiQuota(5, 100, new Date("2026-12-31T23:59:59Z")).resetsAt, "2027-01-01T00:00:00.000Z");
  assert.equal(aiQuota(120, 100).remaining, 0);
});

function files(dir: string, match: (path: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(path).isDirectory() ? files(path, match) : match(path) ? [path] : [];
  });
}
const APP = fileURLToPath(new URL("../src/app/app", import.meta.url)).replaceAll("\\", "/");

test("every route and page sends telemetry through forViewer", () => {
  const sources = files(APP, (path) => /\/(route|page)\.tsx?$/.test(path));
  const touching = sources.filter((path) => /telemetry/.test(readFileSync(path, "utf8")));
  assert.ok(touching.length >= 21, `expected the 14 routes and 7 pages, found ${touching.length}`);
  for (const path of touching) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /telemetry:\s*(existing|stored|replay|inserted|updated)\.telemetry\b/, path);
    if (/telemetry:\s*forViewer/.test(source) || !/json\(|initial=/.test(source)) continue;
    assert.fail(`${path} returns telemetry without forViewer`);
  }
});

test("clients read evidence only from the ops-only detail", () => {
  for (const path of files(APP, (p) => p.endsWith("-client.tsx"))) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /telemetry\??\.(model|estimatedCostRm|latencyMs|mode|provider)\b/, path);
  }
  assert.doesNotMatch(readFileSync(`${APP}/native-social-post/native-social-post-client.tsx`, "utf8"), /Candidate cap/);
});

test("Workspace Tulis Post opens native Social for canary users", () => {
  const source = readFileSync(`${APP}/workspace/workspace-view.tsx`, "utf8");
  assert.match(source, /nativeSocial \? "\/app\/native-social-post" : "\/app\/wizard\/social-post"/);
  assert.match(readFileSync(`${APP}/page.tsx`, "utf8"), /nativeSocial=\{/);
});
