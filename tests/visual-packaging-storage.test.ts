import assert from "node:assert/strict";
import test from "node:test";

import { buildApprovedContentCreateSnapshot, buildDeterministicVisualPackaging, parseVisualPackagingRequest, approveVisualPackagingArtifact, applyVisualPackagingEdits, renderApprovedContentCreateSource, renderVisualPackagingPlan, type GenerationTelemetry } from "../src/lib/visual-packaging/domain.ts";
import { VISUAL_PACKAGING_TABLE, findVisualPackagingByRequestId, loadVisualPackagingArtifact, saveVisualPackagingArtifact, saveVisualPackagingRevision, updateVisualPackagingArtifact } from "../src/lib/visual-packaging/storage.server.ts";
import { buildApprovedOfferSnapshot, buildContentCreateBusinessContextSnapshot, buildDeterministicContentCreate, approveContentCreateArtifact, parseContentCreateRequest } from "../src/lib/content-create/domain.ts";
import type { OfferArtifact } from "../src/lib/native-offer/domain.ts";

const business = buildContentCreateBusinessContextSnapshot({ businessName: "Bisnes Uji", category: "Servis", products: "Audit", targetCustomer: "PKS", location: "Malaysia", usp: "Praktikal", toneOfVoice: "mesra", priceRange: "", platforms: "tiktok" });
const offer: OfferArtifact = { schemaVersion: 1, kind: "offer", status: "approved", entry: "standalone", sourcePostId: null, offerType: "value_stack", product: "Audit content", goal: "sales", audience: "PKS", headline: "Content lebih jelas", promise: "Content lebih jelas", valueStack: ["Semakan hook"], priceNote: "", terms: [], riskReversal: "", urgencyNote: "", callToAction: "Semak jika sesuai.", assumptions: [], businessContext: business, recipeVersion: "offer-v1.0.0", createdAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z" };
const offerSnapshot = buildApprovedOfferSnapshot({ id: 7, artifact: offer, validUntil: "" });
const contentRequest = parseContentCreateRequest({ entry: "from_offer", sourceOfferId: 7, platform: "tiktok", objective: "education", contentRole: "educate", proofNote: "", extraContext: "" });
const content = approveContentCreateArtifact(buildDeterministicContentCreate({ business, request: contentRequest, sourceOfferSnapshot: offerSnapshot, now: new Date("2026-08-31T00:00:00Z") }), "u1", new Date("2026-08-31T01:00:00Z"));
const sourceSnapshot = buildApprovedContentCreateSnapshot({ id: 4, artifact: content });
const request = parseVisualPackagingRequest({ entry: "from_content_create", sourceContentCreateId: 4, format: "carousel", packagingIntent: "search", productionConstraints: "" });
const artifact = buildDeterministicVisualPackaging({ request, sourceSnapshot, now: new Date("2026-09-01T00:00:00Z") });
const telemetry: GenerationTelemetry = { provider: "local", model: "visual-packaging-deterministic-v1", mode: "deterministic_local", latencyMs: 1, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0 };
const sourceText = renderApprovedContentCreateSource(sourceSnapshot);

type Row = Record<string, unknown>;
function fakeAdmin(rows: Row[]) {
  return { from(table: string) {
    assert.equal(table, VISUAL_PACKAGING_TABLE);
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

test("save reuses native content-engine table independently with protected source before_text and plan improved_text", async () => {
  const rows: Row[] = [];
  const stored = await saveVisualPackagingArtifact({ admin: fakeAdmin(rows) as never, userId: "u1", requestId: "11111111-1111-4111-8111-111111111111", request, artifact, telemetry, sourceText });
  assert.equal(stored.artifact.kind, "visual_packaging");
  assert.equal(rows[0].user_id, "u1");
  assert.equal(rows[0].source_social_post_id, null);
  assert.equal(rows[0].source_social_post_status, null);
  assert.equal(rows[0].source_text_hash, sourceSnapshot.sourceContentHash);
  assert.equal(rows[0].before_text, renderApprovedContentCreateSource(sourceSnapshot));
  assert.equal(rows[0].improved_text, renderVisualPackagingPlan(artifact));
});

test("load/idempotency are owner-scoped; corrupted CE1/CE4 rows fail closed for independent CE5 parser", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await saveVisualPackagingArtifact({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222", request, artifact, telemetry, sourceText });
  assert.ok(await loadVisualPackagingArtifact({ admin: admin as never, userId: "u1", artifactId: stored.id }));
  assert.equal(await loadVisualPackagingArtifact({ admin: admin as never, userId: "u2", artifactId: stored.id }), null);
  assert.ok(await findVisualPackagingByRequestId({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222" }));
  assert.equal(await findVisualPackagingByRequestId({ admin: admin as never, userId: "u2", requestId: "22222222-2222-4222-8222-222222222222" }), null);
  rows.push({ id: 99, user_id: "u1", request_id: "99999999-9999-4999-8999-999999999999", request, artifact: content, generation: telemetry, before_text: "source", created_at: "2026-09-01T00:00:00Z" });
  assert.equal(await loadVisualPackagingArtifact({ admin: admin as never, userId: "u1", artifactId: 99 }), null);
});

test("legacy visual plan survives Postgres jsonb key reordering and remains idempotently recoverable", async () => {
  const shortRequest = parseVisualPackagingRequest({ entry: "from_content_create", sourceContentCreateId: 4, format: "short_video", packagingIntent: "attention", productionConstraints: "" });
  const original = buildDeterministicVisualPackaging({ request: shortRequest, sourceSnapshot, now: new Date("2026-09-01T00:00:00Z") });
  const legacyImprovedText = renderVisualPackagingPlan(original);
  const jsonbArtifact = jsonbRoundTrip(original) as typeof original;
  assert.notDeepEqual(
    Object.keys(jsonbArtifact.formatPlan.format === "short_video" ? jsonbArtifact.formatPlan.coverDirection : {}),
    Object.keys(original.formatPlan.format === "short_video" ? original.formatPlan.coverDirection : {}),
  );
  const rows: Row[] = [{
    id: 6,
    user_id: "u1",
    request_id: "66666666-6666-4666-8666-666666666666",
    request: jsonbRoundTrip(shortRequest),
    artifact: jsonbArtifact,
    generation: jsonbRoundTrip(telemetry),
    before_text: sourceText,
    improved_text: legacyImprovedText,
    created_at: "2026-09-01T00:00:00Z",
  }];
  const admin = fakeAdmin(rows);
  const loaded = await loadVisualPackagingArtifact({ admin: admin as never, userId: "u1", artifactId: 6 });
  assert.ok(loaded);
  assert.equal((await findVisualPackagingByRequestId({ admin: admin as never, userId: "u1", requestId: "66666666-6666-4666-8666-666666666666" }))?.id, 6);
});

test("canonical visual plan rendering is invariant across jsonb round-trips for every format", () => {
  for (const format of ["short_video", "static_post", "carousel"] as const) {
    const formatRequest = parseVisualPackagingRequest({ entry: "from_content_create", sourceContentCreateId: 4, format, packagingIntent: "authority", productionConstraints: "" });
    const generated = buildDeterministicVisualPackaging({ request: formatRequest, sourceSnapshot, now: new Date("2026-09-01T00:00:00Z") });
    assert.equal(renderVisualPackagingPlan(jsonbRoundTrip(generated) as typeof generated), renderVisualPackagingPlan(generated), format);
  }
});

test("draft updates owner-scope every privileged operation and approved rows are immutable", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await saveVisualPackagingArtifact({ admin: admin as never, userId: "u1", requestId: "33333333-3333-4333-8333-333333333333", request, artifact, telemetry, sourceText });
  const edited = applyVisualPackagingEdits(stored.artifact, { packaging: stored.artifact.packaging, formatPlan: stored.artifact.formatPlan }, new Date("2026-09-01T01:00:00Z"));
  assert.ok(await updateVisualPackagingArtifact({ admin: admin as never, userId: "u1", stored, artifact: edited }));
  assert.equal(await updateVisualPackagingArtifact({ admin: admin as never, userId: "u2", stored, artifact: edited }), null);
  const approvedArtifact = approveVisualPackagingArtifact(edited, "u1", new Date("2026-09-01T02:00:00Z"));
  const approved = await updateVisualPackagingArtifact({ admin: admin as never, userId: "u1", stored: { ...stored, artifact: edited }, artifact: approvedArtifact });
  assert.ok(approved);
  await assert.rejects(() => updateVisualPackagingArtifact({ admin: admin as never, userId: "u1", stored: approved!, artifact: approvedArtifact }), /immutable/);
});

test("approved reopen inserts idempotency-addressable DRAFT revision with parent approval hash", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const initial = await saveVisualPackagingArtifact({ admin: admin as never, userId: "u1", requestId: "44444444-4444-4444-8444-444444444444", request, artifact, telemetry, sourceText });
  const approvedArtifact = approveVisualPackagingArtifact(initial.artifact, "u1", new Date("2026-09-01T01:00:00Z"));
  const approved = await updateVisualPackagingArtifact({ admin: admin as never, userId: "u1", stored: initial, artifact: approvedArtifact });
  const revisionArtifact = applyVisualPackagingEdits(approved!.artifact, { packaging: approved!.artifact.packaging, formatPlan: approved!.artifact.formatPlan }, new Date("2026-09-01T02:00:00Z"));
  const revision = await saveVisualPackagingRevision({ admin: admin as never, userId: "u1", requestId: "55555555-5555-4555-8555-555555555555", stored: approved!, artifact: revisionArtifact });
  assert.equal(rows.length, 2);
  assert.equal((rows[0].artifact as { status: string }).status, "approved");
  assert.equal(revision.artifact.status, "draft");
  assert.equal(revision.artifact.revision, 2);
  assert.equal(revision.artifact.parentContentHash, approved!.artifact.approval?.contentHash);
  assert.equal((await findVisualPackagingByRequestId({ admin: admin as never, userId: "u1", requestId: "55555555-5555-4555-8555-555555555555" }))?.id, revision.id);
});
