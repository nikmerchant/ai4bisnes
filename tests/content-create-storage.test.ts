import assert from "node:assert/strict";
import test from "node:test";

import {
  applyContentCreateDraftEdits,
  approveContentCreateArtifact,
  buildApprovedOfferSnapshot,
  buildContentCreateBusinessContextSnapshot,
  buildDeterministicContentCreate,
  parseContentCreateRequest,
  type GenerationTelemetry,
} from "../src/lib/content-create/domain.ts";
import {
  CONTENT_CREATE_TABLE,
  findContentCreateByRequestId,
  loadContentCreateArtifact,
  saveContentCreateArtifact,
  saveContentCreateRevision,
  updateContentCreateArtifact,
} from "../src/lib/content-create/storage.server.ts";
import { sha256Hex } from "../src/lib/content-review/hash.ts";
import { renderOfferText } from "../src/lib/native-offer/domain.ts";
import type { OfferArtifact } from "../src/lib/native-offer/domain.ts";

const business = buildContentCreateBusinessContextSnapshot({ businessName: "Bisnes Uji", category: "Servis", products: "Audit", targetCustomer: "PKS", location: "Malaysia", usp: "Praktikal", toneOfVoice: "mesra", priceRange: "", platforms: "facebook" });
const offer: OfferArtifact = { schemaVersion: 1, kind: "offer", status: "approved", entry: "standalone", sourcePostId: null, offerType: "value_stack", product: "Audit content", goal: "sales", audience: "PKS", headline: "Cari bottleneck content", promise: "Semakan yang jelas.", valueStack: ["Semakan hook", "Semakan CTA", "Ringkasan"], priceNote: "RM49", terms: ["Satu bisnes satu audit"], riskReversal: "Semak skop sebelum bayaran", urgencyNote: "", callToAction: "Hubungi kami.", assumptions: [], businessContext: business, recipeVersion: "offer-v1.0.0", createdAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z" };
const request = parseContentCreateRequest({ entry: "from_offer", sourceOfferId: 7, platform: "facebook", objective: "sales", contentRole: "convert", proofNote: "", extraContext: "" });
const snapshot = buildApprovedOfferSnapshot({ id: 7, artifact: offer, validUntil: "" });
const artifact = buildDeterministicContentCreate({ business, request, sourceOfferSnapshot: snapshot, now: new Date("2026-08-31T00:00:00Z") });
const telemetry: GenerationTelemetry = { provider: "local", model: "content-create-deterministic-v1", mode: "deterministic_local", latencyMs: 1, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0 };
const sourceText = renderOfferText(offer);

type Row = Record<string, unknown>;
function fakeAdmin(rows: Row[]) {
  return { from(table: string) {
    assert.equal(table, CONTENT_CREATE_TABLE);
    return {
      insert(payload: Row) { return { select() { return { async single() { const row = { id: rows.length + 1, created_at: "2026-08-31T00:00:00Z", ...payload }; rows.push(row); return { data: { ...row }, error: null }; } }; } }; },
      select() { return { eq(col: string, val: unknown) { return { eq(col2: string, val2: unknown) { return { async maybeSingle() { const row = rows.find((item) => item[col] === val && item[col2] === val2); return { data: row ? { ...row } : null, error: null }; } }; } }; } }; },
      update(payload: Row) { return { eq(col: string, val: unknown) { return { eq(col2: string, val2: unknown) { return { select() { return { async maybeSingle() { const row = rows.find((item) => item[col] === val && item[col2] === val2); if (!row) return { data: null, error: null }; Object.assign(row, payload); return { data: { ...row }, error: null }; } }; } }; } }; } }; },
    };
  } };
}

test("save reuses content-engine table with independent canonical envelope and Offer/draft rendered text", async () => {
  const rows: Row[] = [];
  const stored = await saveContentCreateArtifact({ admin: fakeAdmin(rows) as never, userId: "u1", requestId: "11111111-1111-4111-8111-111111111111", request, artifact, telemetry, sourceText });
  assert.equal(stored.artifact.kind, "content_create");
  assert.equal(rows[0].user_id, "u1");
  assert.equal(rows[0].source_social_post_id, null);
  assert.equal(rows[0].source_social_post_status, null);
  assert.equal(rows[0].source_text_hash, snapshot.sourceContentHash);
  assert.match(String(rows[0].before_text), /RM49/);
  assert.match(String(rows[0].before_text), /Satu bisnes satu audit/);
  assert.equal(sha256Hex(String(rows[0].before_text)), snapshot.sourceContentHash);
  assert.match(String(rows[0].improved_text), /RM49/);
});

test("load/idempotency are owner-scoped and corrupted or CE-1 rows fail closed for this independent domain", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await saveContentCreateArtifact({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222", request, artifact, telemetry, sourceText });
  assert.ok(await loadContentCreateArtifact({ admin: admin as never, userId: "u1", artifactId: stored.id }));
  assert.equal(await loadContentCreateArtifact({ admin: admin as never, userId: "u2", artifactId: stored.id }), null);
  assert.ok(await findContentCreateByRequestId({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222" }));
  assert.equal(await findContentCreateByRequestId({ admin: admin as never, userId: "u2", requestId: "22222222-2222-4222-8222-222222222222" }), null);
  rows.push({ id: 99, user_id: "u1", request_id: "99999999-9999-4999-8999-999999999999", request, artifact: { kind: "content_review" }, generation: telemetry, before_text: "source", created_at: "2026-08-31T00:00:00Z" });
  assert.equal(await loadContentCreateArtifact({ admin: admin as never, userId: "u1", artifactId: 99 }), null);
});

test("draft save owner-scopes update; an approved row cannot be mutated in place", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await saveContentCreateArtifact({ admin: admin as never, userId: "u1", requestId: "33333333-3333-4333-8333-333333333333", request, artifact, telemetry, sourceText });
  const edited = applyContentCreateDraftEdits(stored.artifact, { ...stored.artifact.draft, body: "Isi draf yang diubah dengan selamat." }, new Date("2026-08-31T01:00:00Z"));
  assert.ok(await updateContentCreateArtifact({ admin: admin as never, userId: "u1", stored, artifact: edited }));
  assert.equal(await updateContentCreateArtifact({ admin: admin as never, userId: "u2", stored, artifact: edited }), null);
  const approvedArtifact = approveContentCreateArtifact(edited, "u1", new Date("2026-08-31T02:00:00Z"));
  const approved = await updateContentCreateArtifact({ admin: admin as never, userId: "u1", stored: { ...stored, artifact: edited }, artifact: approvedArtifact });
  assert.ok(approved);
  await assert.rejects(() => updateContentCreateArtifact({ admin: admin as never, userId: "u1", stored: approved!, artifact: approvedArtifact }), /immutable/);
});

test("approved reopen inserts one idempotency-addressable DRAFT revision and leaves approved row unchanged", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const initial = await saveContentCreateArtifact({ admin: admin as never, userId: "u1", requestId: "44444444-4444-4444-8444-444444444444", request, artifact, telemetry, sourceText });
  const approvedArtifact = approveContentCreateArtifact(initial.artifact, "u1", new Date("2026-08-31T01:00:00Z"));
  const approved = await updateContentCreateArtifact({ admin: admin as never, userId: "u1", stored: initial, artifact: approvedArtifact });
  const revisionArtifact = applyContentCreateDraftEdits(approved!.artifact, approved!.artifact.draft, new Date("2026-08-31T02:00:00Z"));
  const revision = await saveContentCreateRevision({ admin: admin as never, userId: "u1", requestId: "55555555-5555-4555-8555-555555555555", stored: approved!, artifact: revisionArtifact });
  assert.equal(rows.length, 2);
  assert.equal((rows[0].artifact as { status: string }).status, "approved");
  assert.equal(revision.artifact.status, "draft");
  assert.equal(revision.artifact.draft.revision, 2);
  assert.equal(revision.artifact.draft.parentContentHash, approved!.artifact.approval?.contentHash);
  assert.equal((await findContentCreateByRequestId({ admin: admin as never, userId: "u1", requestId: "55555555-5555-4555-8555-555555555555" }))?.id, revision.id);
});
