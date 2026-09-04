import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAffiliatePromoEdits,
  approveAffiliatePromoArtifact,
  buildDeterministicAffiliatePromo,
  parseAffiliatePromoRequest,
} from "../src/lib/affiliate-promo/domain.ts";
import {
  AFFILIATE_PROMO_TABLE,
  findAffiliatePromoByRequestId,
  loadAffiliatePromoArtifact,
  malaysiaDayStart,
  saveAffiliatePromoArtifact,
  saveAffiliatePromoRevision,
  updateAffiliatePromoArtifact,
} from "../src/lib/affiliate-promo/storage.server.ts";

function artifact() {
  return buildDeterministicAffiliatePromo({
    request: parseAffiliatePromoRequest({ platform: "facebook", angle: "blank_page", niche: "umum", tone: "profesional", referralCode: "REF0001" }),
    now: new Date("2026-09-04T00:00:00.000Z"),
  });
}

type Row = Record<string, unknown>;
function fakeAdmin(rows: Row[]) {
  return { from(table: string) {
    assert.equal(table, AFFILIATE_PROMO_TABLE);
    return {
      insert(payload: Row) { return { select() { return { async single() { const row = { id: rows.length + 1, created_at: "2026-09-04T00:00:00.000Z", updated_at: "2026-09-04T00:00:00.000Z", ...payload }; rows.push(row); return { data: { ...row }, error: null }; } }; } }; },
      select() { return { eq(col: string, val: unknown) { return { eq(col2: string, val2: unknown) { return { async maybeSingle() { const row = rows.find((item) => item[col] === val && item[col2] === val2); return { data: row ? { ...row } : null, error: null }; } }; } }; } }; },
      update(payload: Row) { return { eq(col: string, val: unknown) { return { eq(col2: string, val2: unknown) { return { select() { return { async maybeSingle() { const row = rows.find((item) => item[col] === val && item[col2] === val2); if (!row) return { data: null, error: null }; Object.assign(row, payload); return { data: { ...row }, error: null }; } }; } }; } }; } }; },
    };
  } };
}

test("Malaysia daily quota resets at UTC+8 midnight", () => {
  assert.equal(malaysiaDayStart(new Date("2026-09-04T15:59:59.999Z")).toISOString(), "2026-09-03T16:00:00.000Z");
  assert.equal(malaysiaDayStart(new Date("2026-09-04T16:00:00.000Z")).toISOString(), "2026-09-04T16:00:00.000Z");
});

test("APS storage inserts canonical render and owner-scopes load plus idempotency lookup", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await saveAffiliatePromoArtifact({ admin: admin as never, userId: "u1", requestId: "11111111-1111-4111-8111-111111111111", artifact: artifact() });
  assert.equal(rows[0].user_id, "u1");
  assert.match(String(rows[0].rendered_text), /ai4bisnes\.com\/\?ref=REF0001/);
  assert.ok(await loadAffiliatePromoArtifact({ admin: admin as never, userId: "u1", artifactId: stored.id }));
  assert.equal(await loadAffiliatePromoArtifact({ admin: admin as never, userId: "u2", artifactId: stored.id }), null);
  assert.ok(await findAffiliatePromoByRequestId({ admin: admin as never, userId: "u1", requestId: "11111111-1111-4111-8111-111111111111" }));
  assert.equal(await findAffiliatePromoByRequestId({ admin: admin as never, userId: "u2", requestId: "11111111-1111-4111-8111-111111111111" }), null);
});

test("APS storage rejects corrupted rows and mismatched canonical rendered text", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await saveAffiliatePromoArtifact({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222", artifact: artifact() });
  rows[0].rendered_text = "tampered";
  assert.equal(await loadAffiliatePromoArtifact({ admin: admin as never, userId: "u1", artifactId: stored.id }), null);
  rows.push({ id: 99, user_id: "u1", request_id: "99999999-9999-4999-8999-999999999999", artifact: { kind: "affiliate_promo" }, rendered_text: "x", created_at: "2026-09-04T00:00:00Z", updated_at: "2026-09-04T00:00:00Z" });
  assert.equal(await loadAffiliatePromoArtifact({ admin: admin as never, userId: "u1", artifactId: 99 }), null);
});

test("APS draft update has owner predicate; approved row is immutable in-place", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const initial = await saveAffiliatePromoArtifact({ admin: admin as never, userId: "u1", requestId: "33333333-3333-4333-8333-333333333333", artifact: artifact() });
  const edited = applyAffiliatePromoEdits(initial.artifact, { variants: initial.artifact.variants }, new Date("2026-09-04T00:30:00Z"));
  assert.ok(await updateAffiliatePromoArtifact({ admin: admin as never, userId: "u1", stored: initial, artifact: edited }));
  assert.equal(await updateAffiliatePromoArtifact({ admin: admin as never, userId: "u2", stored: initial, artifact: edited }), null);
  const approvedArtifact = approveAffiliatePromoArtifact(edited, "u1", new Date("2026-09-04T01:00:00Z"));
  const approved = await updateAffiliatePromoArtifact({ admin: admin as never, userId: "u1", stored: { ...initial, artifact: edited }, artifact: approvedArtifact });
  assert.ok(approved);
  await assert.rejects(() => updateAffiliatePromoArtifact({ admin: admin as never, userId: "u1", stored: approved!, artifact: approved!.artifact }), /immutable/);
});

test("approved reopen inserts an owner idempotency-addressable R2 draft and leaves approved row intact", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const initial = await saveAffiliatePromoArtifact({ admin: admin as never, userId: "u1", requestId: "44444444-4444-4444-8444-444444444444", artifact: artifact() });
  const approvedArtifact = approveAffiliatePromoArtifact(initial.artifact, "u1", new Date("2026-09-04T01:00:00Z"));
  const approved = await updateAffiliatePromoArtifact({ admin: admin as never, userId: "u1", stored: initial, artifact: approvedArtifact });
  const revisionArtifact = applyAffiliatePromoEdits(approved!.artifact, { variants: approved!.artifact.variants }, new Date("2026-09-04T02:00:00Z"));
  const revision = await saveAffiliatePromoRevision({ admin: admin as never, userId: "u1", requestId: "55555555-5555-4555-8555-555555555555", stored: approved!, artifact: revisionArtifact });
  assert.equal(rows.length, 2);
  assert.equal((rows[0].artifact as { status: string }).status, "approved");
  assert.equal(revision.artifact.status, "draft");
  assert.equal(revision.artifact.revision, 2);
  assert.equal(revision.artifact.parentContentHash, approved!.artifact.approval?.contentHash);
});
