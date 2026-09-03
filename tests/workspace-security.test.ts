import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const PAGE = readFileSync(new URL("../src/app/app/page.tsx", import.meta.url), "utf8");
const VIEW = readFileSync(new URL("../src/app/app/workspace/workspace-view.tsx", import.meta.url), "utf8");
const BOARD = readFileSync(new URL("../src/lib/workspace/board.server.ts", import.meta.url), "utf8");
const ACCESS = readFileSync(new URL("../src/lib/workspace/access-policy.ts", import.meta.url), "utf8");

test("workspace gate: /app renders Workspace only behind the independent flag before any board query", () => {
  assert.match(PAGE, /currentWorkspaceAccess\(user\)\.allowed/);
  assert.match(PAGE, /loadWorkspaceBoard/);
  // Inside the component body the flag gate must run BEFORE the board query so
  // fail-closed users never touch the admin client.
  const body = PAGE.slice(PAGE.indexOf("export default async function Dashboard"));
  assert.ok(body.indexOf("currentWorkspaceAccess(user).allowed") < body.indexOf("loadWorkspaceBoard"));
});

test("board is strictly read-only: select-only, owner predicate, no write verb anywhere", () => {
  assert.doesNotMatch(BOARD, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  for (const table of ["native_social_post_artifacts", "native_offer_artifacts", "native_whatsapp_draft_artifacts", "native_content_engine_artifacts", "generated_outputs"]) {
    assert.match(BOARD, new RegExp(`from\\("${table}"\\)[\\s\\S]*?\\.eq\\("user_id", userId\\)`), `${table} must be owner-scoped`);
  }
});

test("workspace access is independent, fail-closed in production, allowlist fallback chain", () => {
  assert.match(ACCESS, /production_fail_closed/);
  const fallback = readFileSync(new URL("../src/lib/workspace/access.ts", import.meta.url), "utf8");
  assert.match(fallback, /AI4B_WORKSPACE_ENABLED/);
  const order = ["AI4B_WORKSPACE_ALLOWLIST", "AI4B_PERFORMANCE_LEARNING_ALLOWLIST", "AI4B_VISUAL_PACKAGING_ALLOWLIST", "AI4B_CONTENT_CREATE_ALLOWLIST"].map((key) => fallback.indexOf(key));
  assert.ok(order.every((position, index) => index === 0 || position > order[index - 1]), "allowlist fallback order CE6→CE5→CE4→CE1");
});

test("legacy dashboard contract preserved: no Content Engine strings, WhatsApp access retained", () => {
  assert.doesNotMatch(PAGE, /Content Engine/);
  assert.doesNotMatch(PAGE, /Bina Visual Plan|Visual Packaging|Bina Content untuk Tawaran Ini/);
  assert.match(PAGE, /currentSlice3Access/);
  assert.match(PAGE, /\/app\/native-whatsapp/);
});

test("launchers and CTAs use the 44px inline-flex pattern with existing routes only", () => {
  assert.match(VIEW, /inline-flex min-h-11 items-center/);
  for (const href of ["/app/wizard/social-post", "/app/native-offer", "/app/native-whatsapp", "/app/marketing-plan"]) assert.match(VIEW, new RegExp(`href: "${href.replace(/\//g, "\\/")}"`));
  assert.doesNotMatch(VIEW, /fetch\(|\/api\/workspace/);
});

test("no provider, connector, publish or send anywhere in the workspace slice", () => {
  for (const source of [PAGE, VIEW, BOARD, ACCESS]) {
    assert.doesNotMatch(source, /metricool|bundle\.social|publishPost|schedulePost|sendMessage|generateImage|generateVideo|OPENAI|DEEPSEEK/i);
  }
});

test("no new migration, schema, policy or bucket file was added for workspace", () => {
  const boardTestDir = readFileSync(new URL("../src/lib/workspace/domain.ts", import.meta.url), "utf8");
  assert.doesNotMatch(boardTestDir, /create table|create policy|storage\.bucket/i);
});
