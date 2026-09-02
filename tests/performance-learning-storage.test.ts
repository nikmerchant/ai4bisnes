import assert from "node:assert/strict";
import test from "node:test";

import {
  approvePerformanceLearningArtifact,
  applyPerformanceLearningEdits,
  buildApprovedPerformanceSourceSnapshot,
  buildDeterministicPerformanceLearning,
  parsePerformanceLearningRequest,
  renderPerformanceSourceText,
  renderPerformanceLearningReport,
  type GenerationTelemetry,
  type PerformanceLearningArtifactV1,
  type PerformanceLearningRequestV1,
} from "../src/lib/performance-learning/domain.ts";
import {
  PERFORMANCE_LEARNING_TABLE,
  findPerformanceLearningByRequestId,
  loadPerformanceLearningArtifact,
  savePerformanceLearningArtifact,
  savePerformanceLearningRevision,
  updatePerformanceLearningArtifact,
} from "../src/lib/performance-learning/storage.server.ts";
import {
  buildApprovedOfferSnapshot,
  buildContentCreateBusinessContextSnapshot,
  buildDeterministicContentCreate,
  approveContentCreateArtifact,
  parseContentCreateRequest,
} from "../src/lib/content-create/domain.ts";
import type { OfferArtifact } from "../src/lib/native-offer/domain.ts";

const business = buildContentCreateBusinessContextSnapshot({ businessName: "Bisnes Uji", category: "Servis", products: "Audit", targetCustomer: "PKS", location: "Malaysia", usp: "Praktikal", toneOfVoice: "mesra", priceRange: "", platforms: "tiktok" });
const offer: OfferArtifact = { schemaVersion: 1, kind: "offer", status: "approved", entry: "standalone", sourcePostId: null, offerType: "value_stack", product: "Audit content", goal: "sales", audience: "PKS", headline: "Content lebih jelas", promise: "Content lebih jelas", valueStack: ["Semakan hook"], priceNote: "", terms: [], riskReversal: "", urgencyNote: "", callToAction: "Semak jika sesuai.", assumptions: [], businessContext: business, recipeVersion: "offer-v1.0.0", createdAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z" };
const offerSnapshot = buildApprovedOfferSnapshot({ id: 7, artifact: offer, validUntil: "" });
const contentRequest = parseContentCreateRequest({ entry: "from_offer", sourceOfferId: 7, platform: "tiktok", objective: "education", contentRole: "educate", proofNote: "", extraContext: "" });
const content = approveContentCreateArtifact(buildDeterministicContentCreate({ business, request: contentRequest, sourceOfferSnapshot: offerSnapshot, now: new Date("2026-08-31T00:00:00Z") }), "u1", new Date("2026-08-31T01:00:00Z"));
const sourceSnapshot = buildApprovedPerformanceSourceSnapshot({ id: 4, artifact: content });
const request = parsePerformanceLearningRequest({ entry: "from_content_create", sourceContentCreateId: 4, metrics: { impressions: 5000, clicks: 250, saves: 40, shares: 10, leads: 5 }, platformWindowDays: 14, snapshotNote: "Nota asal" });
const artifact = buildDeterministicPerformanceLearning({ request, sourceSnapshot, now: new Date("2026-09-01T00:00:00Z") });
const telemetry: GenerationTelemetry = { provider: "local", model: "performance-learning-deterministic-v1", mode: "deterministic_local", latencyMs: 1, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0 };
const sourceText = renderPerformanceSourceText(sourceSnapshot);

type Row = Record<string, unknown>;
function fakeAdmin(rows: Row[]) {
  return { from(table: string) {
    assert.equal(table, PERFORMANCE_LEARNING_TABLE);
    return {
      insert(payload: Row) { return { select() { return { async single() { const row = { id: rows.length + 1, created_at: "2026-09-01T00:00:00Z", ...payload }; rows.push(row); return { data: { ...row }, error: null }; } }; } }; },
      select() { return { eq(col: string, val: unknown) { return { eq(col2: string, val2: unknown) { return { async maybeSingle() { const row = rows.find((item) => item[col] === val && item[col2] === val2); return { data: row ? { ...row } : null, error: null }; } }; } }; } }; },
      update(payload: Row) { return { eq(col: string, val: unknown) { return { eq(col2: string, val2: unknown) { return { select() { return { async maybeSingle() { const row = rows.find((item) => item[col] === val && item[col2] === val2); if (!row) return { data: null, error: null }; Object.assign(row, payload); return { data: { ...row }, error: null }; } }; } }; } }; } }; },
    };
  } };
}

function jsonbRoundTrip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(jsonbRoundTrip);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => [key, jsonbRoundTrip(nested)]));
}

test("save reuses native content-engine table independently with CE-4 render before_text and canonical improved_text", async () => {
  const rows: Row[] = [];
  const stored = await savePerformanceLearningArtifact({ admin: fakeAdmin(rows) as never, userId: "u1", requestId: "11111111-1111-4111-8111-111111111111", request, artifact, telemetry, sourceText });
  assert.equal(stored.artifact.kind, "performance_learning");
  assert.equal(rows[0].user_id, "u1");
  assert.equal(rows[0].source_social_post_id, null);
  assert.equal(rows[0].source_social_post_status, null);
  assert.equal(rows[0].source_text_hash, sourceSnapshot.sourceContentHash);
  assert.equal(rows[0].before_text, renderPerformanceSourceText(sourceSnapshot));
  assert.equal(rows[0].improved_text, renderPerformanceLearningReport(artifact));
});

test("load/idempotency are owner-scoped; corrupted rows fail closed for independent CE6 parser", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await savePerformanceLearningArtifact({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222", request, artifact, telemetry, sourceText });
  assert.ok(await loadPerformanceLearningArtifact({ admin: admin as never, userId: "u1", artifactId: stored.id }));
  assert.equal(await loadPerformanceLearningArtifact({ admin: admin as never, userId: "u2", artifactId: stored.id }), null);
  assert.ok(await findPerformanceLearningByRequestId({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222" }));
  assert.equal(await findPerformanceLearningByRequestId({ admin: admin as never, userId: "u2", requestId: "22222222-2222-4222-8222-222222222222" }), null);
  rows.push({ id: 99, user_id: "u1", request_id: "99999999-9999-4999-8999-999999999999", request, artifact: content, generation: telemetry, before_text: "source", created_at: "2026-09-01T00:00:00Z" });
  assert.equal(await loadPerformanceLearningArtifact({ admin: admin as never, userId: "u1", artifactId: 99 }), null);
});

test("stored rows survive Postgres jsonb key reordering and remain idempotently recoverable", async () => {
  const rows: Row[] = [{
    id: 6,
    user_id: "u1",
    request_id: "66666666-6666-4666-8666-666666666666",
    request: jsonbRoundTrip(request),
    artifact: jsonbRoundTrip(artifact),
    generation: jsonbRoundTrip(telemetry),
    before_text: sourceText,
    improved_text: renderPerformanceLearningReport(artifact),
    created_at: "2026-09-01T00:00:00Z",
  }];
  const admin = fakeAdmin(rows);
  const loaded = await loadPerformanceLearningArtifact({ admin: admin as never, userId: "u1", artifactId: 6 });
  assert.ok(loaded);
  assert.equal((await findPerformanceLearningByRequestId({ admin: admin as never, userId: "u1", requestId: "66666666-6666-4666-8666-666666666666" }))?.id, 6);
});

test("draft updates are owner-scoped on every privileged operation and approved rows are immutable", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await savePerformanceLearningArtifact({ admin: admin as never, userId: "u1", requestId: "33333333-3333-4333-8333-333333333333", request, artifact, telemetry, sourceText });
  const edited = applyPerformanceLearningEdits(stored.artifact, { snapshotNote: "Nota baharu" }, new Date("2026-09-01T01:00:00Z"));
  assert.ok(await updatePerformanceLearningArtifact({ admin: admin as never, userId: "u1", stored, artifact: edited }));
  assert.equal(await updatePerformanceLearningArtifact({ admin: admin as never, userId: "u2", stored, artifact: edited }), null);
  const approvedArtifact = approvePerformanceLearningArtifact(edited, "u1", new Date("2026-09-01T02:00:00Z"));
  const approved = await updatePerformanceLearningArtifact({ admin: admin as never, userId: "u1", stored: { ...stored, artifact: edited }, artifact: approvedArtifact });
  assert.ok(approved);
  await assert.rejects(() => updatePerformanceLearningArtifact({ admin: admin as never, userId: "u1", stored: approved!, artifact: approvedArtifact }), /immutable/);
});

test("reopen lineage: approved artifact inserts idempotency-addressable DRAFT R2 with parent approval hash", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const initial = await savePerformanceLearningArtifact({ admin: admin as never, userId: "u1", requestId: "44444444-4444-4444-8444-444444444444", request, artifact, telemetry, sourceText });
  const approvedArtifact = approvePerformanceLearningArtifact(initial.artifact, "u1", new Date("2026-09-01T01:00:00Z"));
  const approved = await updatePerformanceLearningArtifact({ admin: admin as never, userId: "u1", stored: initial, artifact: approvedArtifact });
  const revisionArtifact = applyPerformanceLearningEdits(approved!.artifact, { snapshotNote: "Nota R2" }, new Date("2026-09-01T02:00:00Z"));
  const revision = await savePerformanceLearningRevision({ admin: admin as never, userId: "u1", requestId: "55555555-5555-4555-8555-555555555555", stored: approved!, artifact: revisionArtifact });
  assert.equal(rows.length, 2);
  assert.equal((rows[0].artifact as { status: string }).status, "approved");
  assert.equal(revision.artifact.status, "draft");
  assert.equal(revision.artifact.revision, 2);
  assert.equal(revision.artifact.parentContentHash, approved!.artifact.approval?.contentHash);
  assert.equal((await findPerformanceLearningByRequestId({ admin: admin as never, userId: "u1", requestId: "55555555-5555-4555-8555-555555555555" }))?.id, revision.id);
  // metrics immutable across reopen
  assert.deepEqual(revision.artifact.metrics, approved!.artifact.metrics);
});

test("metrics immutability is enforced on the storage path: save rejects metric drift between request and artifact", async () => {
  const rows: Row[] = [];
  const drifted: PerformanceLearningArtifactV1 = { ...artifact, metrics: { ...artifact.metrics, leads: 999 } };
  await assert.rejects(() => savePerformanceLearningArtifact({ admin: fakeAdmin(rows) as never, userId: "u1", requestId: "77777777-7777-4777-8777-777777777777", request, artifact: drifted, telemetry, sourceText }), /metric/);
  const badWindow: PerformanceLearningRequestV1 = { ...request, platformWindowDays: 30 };
  await assert.rejects(() => savePerformanceLearningArtifact({ admin: fakeAdmin(rows) as never, userId: "u1", requestId: "77777777-7777-4777-8777-777777777777", request: badWindow, artifact, telemetry, sourceText }));
  const mismatchedSource: PerformanceLearningRequestV1 = { ...request, sourceContentCreateId: 5 };
  await assert.rejects(() => savePerformanceLearningArtifact({ admin: fakeAdmin(rows) as never, userId: "u1", requestId: "77777777-7777-4777-8777-777777777777", request: mismatchedSource, artifact, telemetry, sourceText }));
});

test("stored parser rejects a self-consistent artifact whose metrics drift from the immutable request envelope", async () => {
  const driftRequest = parsePerformanceLearningRequest({
    ...request,
    metrics: { ...request.metrics, clicks: 300 },
  });
  const driftArtifact = buildDeterministicPerformanceLearning({ request: driftRequest, sourceSnapshot, now: new Date("2026-09-01T00:00:00Z") });
  const rows: Row[] = [{
    id: 8,
    user_id: "u1",
    request_id: "88888888-8888-4888-8888-888888888888",
    request,
    artifact: driftArtifact,
    generation: telemetry,
    before_text: sourceText,
    improved_text: renderPerformanceLearningReport(driftArtifact),
    created_at: "2026-09-01T00:00:00Z",
  }];
  assert.equal(await loadPerformanceLearningArtifact({ admin: fakeAdmin(rows) as never, userId: "u1", artifactId: 8 }), null);
});
