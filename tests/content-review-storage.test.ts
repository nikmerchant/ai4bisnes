import assert from "node:assert/strict";
import test from "node:test";

import { applyContentReviewDraftEdits, approveContentReviewArtifact, buildContentReviewBusinessContextSnapshot, buildDeterministicContentReview, parseContentReviewRequest, type GenerationTelemetry } from "../src/lib/content-review/domain.ts";
import { sha256NormalizedSourceText } from "../src/lib/content-review/hash.server.ts";
import { CONTENT_REVIEW_TABLE, findContentReviewByRequestId, loadContentReviewArtifact, saveContentReviewArtifact, saveContentReviewRevision, updateContentReviewArtifact } from "../src/lib/content-review/storage.server.ts";

const sourceText = "Ramai peniaga keliru antara baki bank dengan untung sebenar. Rekod jualan, kos barang dan kos operasi. Simpan panduan ini.";
const request = parseContentReviewRequest({ entry: "pasted_text", sourceSocialPostId: null, sourceText, platform: "facebook", objective: "education", desiredAction: "save", extraContext: "" });
const business = buildContentReviewBusinessContextSnapshot({ businessName: "Bisnes Uji", category: "Servis", products: "Panduan", targetCustomer: "PKS", location: "Malaysia", usp: "Praktikal", toneOfVoice: "mesra", priceRange: "", platforms: "facebook" });
const artifact = buildDeterministicContentReview({ business, request, sourceSocialPostStatus: null, sourceTextHash: sha256NormalizedSourceText(sourceText), now: new Date("2026-08-30T00:00:00Z") });
const telemetry: GenerationTelemetry = { provider: "local", model: "content-review-deterministic-v1", mode: "deterministic_local", latencyMs: 2, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0 };

type Row = Record<string, unknown>;
function fakeAdmin(rows: Row[]) {
  return { from(table: string) {
    assert.equal(table, CONTENT_REVIEW_TABLE);
    return {
      insert(payload: Row) { return { select() { return { async single() { const row = { id: rows.length + 1, created_at: "2026-08-30T00:00:00Z", ...payload }; rows.push(row); return { data: { ...row }, error: null }; } }; } }; },
      select() { return { eq(col: string, val: unknown) { return { eq(col2: string, val2: unknown) { return { async maybeSingle() { const row = rows.find((r) => r[col] === val && r[col2] === val2); return { data: row ? { ...row } : null, error: null }; } }; } }; } }; },
      update(payload: Row) { return { eq(col: string, val: unknown) { return { eq(col2: string, val2: unknown) { return { select() { return { async maybeSingle() { const row = rows.find((r) => r[col] === val && r[col2] === val2); if (!row) return { data: null, error: null }; Object.assign(row, payload); return { data: { ...row }, error: null }; } }; } }; } }; } }; },
    };
  } };
}

test("save persists protected source/hash/context plus rendered before/after in isolated table", async () => {
  const rows: Row[] = [];
  const stored = await saveContentReviewArtifact({ admin: fakeAdmin(rows) as never, userId: "u1", requestId: "11111111-1111-4111-8111-111111111111", request, artifact, telemetry, sourceText });
  assert.equal(stored.artifact.status, "draft");
  assert.equal(rows[0].user_id, "u1");
  assert.equal(rows[0].source_text_hash, artifact.sourceTextHash);
  assert.equal(rows[0].source_social_post_id, null);
  assert.equal(rows[0].source_social_post_status, null);
  assert.equal(rows[0].before_text, sourceText);
  assert.equal(typeof rows[0].improved_text, "string");
});

test("load and idempotency lookup are owner-scoped; cross-user returns null", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await saveContentReviewArtifact({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222", request, artifact, telemetry, sourceText });
  assert.ok(await loadContentReviewArtifact({ admin: admin as never, userId: "u1", artifactId: stored.id }));
  assert.equal(await loadContentReviewArtifact({ admin: admin as never, userId: "u2", artifactId: stored.id }), null);
  assert.ok(await findContentReviewByRequestId({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222" }));
  assert.equal(await findContentReviewByRequestId({ admin: admin as never, userId: "u2", requestId: "22222222-2222-4222-8222-222222222222" }), null);
});

test("draft update only changes artifact/rendered improved text; owner mismatch cannot mutate", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const stored = await saveContentReviewArtifact({ admin: admin as never, userId: "u1", requestId: "33333333-3333-4333-8333-333333333333", request, artifact, telemetry, sourceText });
  const changed = { ...artifact, improvedDraft: { ...artifact.improvedDraft, body: "Isi baharu yang sah." }, updatedAt: "2026-08-30T01:00:00Z" };
  const updated = await updateContentReviewArtifact({ admin: admin as never, userId: "u1", stored, artifact: changed });
  assert.equal(updated?.artifact.improvedDraft.body, "Isi baharu yang sah.");
  assert.equal(await updateContentReviewArtifact({ admin: admin as never, userId: "u2", stored, artifact: changed }), null);
  assert.equal(rows[0].request_id, "33333333-3333-4333-8333-333333333333");
});

test("approved edit is inserted as an idempotent new draft revision without mutating the approved row", async () => {
  const rows: Row[] = [];
  const admin = fakeAdmin(rows);
  const initial = await saveContentReviewArtifact({ admin: admin as never, userId: "u1", requestId: "55555555-5555-4555-8555-555555555555", request, artifact, telemetry, sourceText });
  const approvedArtifact = approveContentReviewArtifact(initial.artifact, "u1", new Date("2026-08-30T01:00:00Z"));
  const approved = await updateContentReviewArtifact({ admin: admin as never, userId: "u1", stored: initial, artifact: approvedArtifact });
  assert.ok(approved);
  const revisedArtifact = applyContentReviewDraftEdits(approved.artifact, { ...approved.artifact.improvedDraft, body: "Revision baharu yang tidak memutasi versi diluluskan." }, new Date("2026-08-30T02:00:00Z"));
  const revision = await saveContentReviewRevision({ admin: admin as never, userId: "u1", requestId: "66666666-6666-4666-8666-666666666666", stored: approved, artifact: revisedArtifact });
  assert.equal(rows.length, 2);
  assert.equal((rows[0].artifact as { status: string }).status, "approved");
  assert.equal(revision.id, 2);
  assert.equal(revision.artifact.status, "draft");
  assert.equal(revision.artifact.improvedDraft.revision, 2);
  assert.equal(revision.artifact.improvedDraft.parentContentHash, approved.artifact.approval?.contentHash);
});

test("corrupted stored artifact fails closed", async () => {
  const rows: Row[] = [{ id: 1, user_id: "u1", request_id: "44444444-4444-4444-8444-444444444444", request, artifact: { kind: "corrupt" }, generation: telemetry, before_text: sourceText, created_at: "2026-08-30T00:00:00Z" }];
  assert.equal(await loadContentReviewArtifact({ admin: fakeAdmin(rows) as never, userId: "u1", artifactId: 1 }), null);
});
