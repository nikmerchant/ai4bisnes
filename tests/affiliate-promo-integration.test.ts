import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveAffiliatePromoAccess } from "../src/lib/affiliate-promo/access-policy.ts";
import { validateAffiliateReferralCode } from "../src/lib/affiliate-promo/referral-policy.ts";
import {
  applyAffiliatePromoEdits,
  approveAffiliatePromoArtifact,
  buildDeterministicAffiliatePromo,
  parseAffiliatePromoRequest,
  renderAffiliatePromoText,
  validateAffiliatePromoArtifact,
} from "../src/lib/affiliate-promo/domain.ts";
import { sha256Hex } from "../src/lib/content-review/hash.ts";

function build() {
  return buildDeterministicAffiliatePromo({
    request: parseAffiliatePromoRequest({ platform: "instagram", angle: "prompt_320", niche: "servis", tone: "mesra", referralCode: "LOCALDEMO", personalNote: "Nota" }),
    now: new Date("2026-09-04T00:00:00.000Z"),
  });
}

test("APS access is local by default and production-canary requires its independent flag with Workspace allowlist input", () => {
  const user = { id: "USER-1", email: "Owner@Example.com" };
  assert.deepEqual(resolveAffiliatePromoAccess({ nodeEnv: "development", user }), { allowed: true, reason: "local_default" });
  assert.equal(resolveAffiliatePromoAccess({ nodeEnv: "production", deploymentTarget: "production", enabled: "true", allowlist: "user-1", user }).allowed, false);
  assert.equal(resolveAffiliatePromoAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "false", allowlist: "user-1", user }).allowed, false);
  assert.equal(resolveAffiliatePromoAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "true", allowlist: "", user }).reason, "allowlist_required");
  assert.equal(resolveAffiliatePromoAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "true", allowlist: "other", user }).allowed, false);
  assert.deepEqual(resolveAffiliatePromoAccess({ nodeEnv: "production", deploymentTarget: "production-canary", enabled: "true", allowlist: "owner@example.com", user }), { allowed: true, reason: "allowlisted_production_canary" });
});

test("referral code accepts only bounded profile codes and fails closed for empty or malformed values", () => {
  assert.equal(validateAffiliateReferralCode("REFUUID"), "REFUUID");
  assert.equal(validateAffiliateReferralCode("  REFEMAIL  "), "REFEMAIL");
  assert.equal(validateAffiliateReferralCode(undefined), null);
  assert.equal(validateAffiliateReferralCode(""), null);
  assert.equal(validateAffiliateReferralCode("bad code!"), null);
  assert.equal(validateAffiliateReferralCode("x".repeat(25)), null);
});

test("lifecycle validates stored artifacts, binds approval hash and reopens as a new draft revision", () => {
  const draft = build();
  assert.equal(draft.revision, 1);
  assert.equal(draft.parentContentHash, null);
  assert.ok(validateAffiliatePromoArtifact(JSON.parse(JSON.stringify(draft))).ok);

  const edited = applyAffiliatePromoEdits(draft, { variants: draft.variants.map((variant, index) => index === 0 ? { ...variant, hook: "Hook edit yang masih lengkap dan selamat." } : variant) }, new Date("2026-09-04T00:30:00.000Z"));
  assert.equal(edited.revision, 1);
  const approved = approveAffiliatePromoArtifact(edited, "11111111-1111-4111-8111-111111111111", new Date("2026-09-04T01:00:00.000Z"));
  assert.equal(approved.status, "approved");
  assert.equal(approved.approval?.contentHash, sha256Hex(renderAffiliatePromoText(edited)));
  assert.throws(() => approveAffiliatePromoArtifact(approved, "owner", new Date()));

  const reopened = applyAffiliatePromoEdits(approved, { variants: approved.variants }, new Date("2026-09-04T02:00:00.000Z"));
  assert.equal(reopened.status, "draft");
  assert.equal(reopened.revision, 2);
  assert.equal(reopened.createdAt, "2026-09-04T02:00:00.000Z");
  assert.equal(reopened.parentContentHash, approved.approval?.contentHash);
  assert.equal(reopened.approval, null);
  assert.ok(validateAffiliatePromoArtifact(reopened).ok);
});

test("stored artifact validation fails closed on corrupted protected fields, render, bounds and compliance", () => {
  const draft = build();
  for (const corrupt of [
    { ...draft, kind: "other" },
    { ...draft, referralLink: "ai4bisnes.com/?ref=ATTACKER" },
    { ...draft, disclosure: "" },
    { ...draft, variants: [draft.variants[0]] },
    { ...draft, variants: [{ ...draft.variants[0], body: "x".repeat(2001) }, draft.variants[1]] },
    { ...draft, status: "approved", approval: null },
    { ...draft, compliance: { ...draft.compliance, forbiddenPass: false } },
  ]) assert.equal(validateAffiliatePromoArtifact(corrupt).ok, false);
});

test("APS server sources preserve security boundaries and deterministic-only provider", () => {
  const root = new URL("../", import.meta.url);
  const access = readFileSync(new URL("src/lib/affiliate-promo/access.ts", root), "utf8");
  const context = readFileSync(new URL("src/lib/affiliate-promo/context.server.ts", root), "utf8");
  const provider = readFileSync(new URL("src/lib/affiliate-promo/provider.server.ts", root), "utf8");
  const generate = readFileSync(new URL("src/app/app/affiliate-promo/api/route.ts", root), "utf8");
  const mutation = readFileSync(new URL("src/app/app/affiliate-promo/api/[id]/route.ts", root), "utf8");
  const page = readFileSync(new URL("src/app/app/affiliate-promo/page.tsx", root), "utf8");
  const client = readFileSync(new URL("src/app/app/affiliate-promo/affiliate-promo-client.tsx", root), "utf8");
  const workspace = readFileSync(new URL("src/app/app/workspace/workspace-view.tsx", root), "utf8");
  const affiliatePage = readFileSync(new URL("src/app/app/affiliate/page.tsx", root), "utf8");

  assert.match(access, /AI4B_AFFILIATE_PROMO_ENABLED/);
  assert.match(access, /AI4B_AFFILIATE_PROMO_ALLOWLIST[\s\S]*AI4B_WORKSPACE_ALLOWLIST/);
  assert.doesNotMatch(access, /AI4B_PERFORMANCE_LEARNING_ALLOWLIST|AI4B_SLICE1_ALLOWLIST/);
  assert.ok(context.indexOf("auth.getUser()") < context.indexOf(".from(\"profiles\")"));
  assert.match(context, /supabase\s*\.from\("profiles"\)/);
  assert.match(context, /\.select\("referral_code"\)/);
  assert.match(context, /\.eq\("id", user\.id\)/);
  assert.doesNotMatch(context, /AI4B_AFFILIATE_PROMO_REFERRAL_MAP/);
  assert.match(provider, /^import "server-only";/);
  assert.doesNotMatch(provider, /fetch\s*\(|API_KEY|DEEPSEEK|secret/i);
  assert.ok(generate.indexOf("loadAffiliatePromoContext()") < generate.indexOf("createAdminClient()"));
  assert.match(generate, /isSameOriginRequest/);
  assert.match(generate, /application\/json/);
  assert.match(generate, /MAX_BODY_BYTES\s*=\s*16_384/);
  assert.match(generate, /MAX_PER_DAY\s*=\s*5/);
  assert.match(generate, /MAX_PER_MONTH\s*=\s*30/);
  assert.match(generate, /findAffiliatePromoByRequestId/);
  assert.match(generate, /referralCode:\s*context\.referralCode/);
  assert.doesNotMatch(generate, /referralCode:\s*body\.referralCode/);
  assert.match(mutation, /loadAffiliatePromoArtifact/);
  assert.match(page, /min-h-11/);
  assert.match(client, /Nota untuk rujukan sahaja/);
  assert.doesNotMatch(client, /Nota peribadi \(pilihan, fenced\)/);
  assert.match(workspace, /\/app\/affiliate-promo/);
  assert.match(affiliatePage, /10% komisen berulang/);
  assert.doesNotMatch(affiliatePage, /20% komisen berulang/);
});
