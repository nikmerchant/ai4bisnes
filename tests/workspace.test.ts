import assert from "node:assert/strict";
import test from "node:test";

import {
  WORKSPACE_BOARD_LIMIT,
  boardItemChaining,
  describeBoardItem,
  mergeBoardRows,
  normalizeBoardRows,
} from "../src/lib/workspace/domain.ts";

test("board kinds: merge keeps newest-first across all seven artifact tables plus wizard outputs", () => {
  const rows = mergeBoardRows([
    { kind: "social_post", rows: [{ id: 1, title: "Post A", status: "approved", revision: 1, updatedAt: "2026-09-01T10:00:00Z" }] },
    { kind: "offer", rows: [{ id: 2, title: "Tawaran B", status: "approved", revision: 1, updatedAt: "2026-09-02T10:00:00Z" }] },
    { kind: "whatsapp", rows: [{ id: 3, title: "Draf WA", status: "draft", revision: 1, updatedAt: "2026-09-03T08:00:00Z" }] },
    { kind: "content_engine", rows: [
      { id: 4, engineKind: "content_review", title: "Review", status: "approved", revision: 1, updatedAt: "2026-08-31T10:00:00Z" },
      { id: 5, engineKind: "content_create", title: "Content", status: "approved", revision: 2, updatedAt: "2026-09-02T09:00:00Z" },
      { id: 6, engineKind: "visual_packaging", title: "Visual", status: "approved", revision: 1, updatedAt: "2026-09-01T12:00:00Z" },
      { id: 7, engineKind: "performance_learning", title: "Prestasi", status: "approved", revision: 1, updatedAt: "2026-09-02T07:00:00Z" },
    ] },
    { kind: "wizard", rows: [{ id: 8, title: "Wizard output", status: "draft", revision: null, updatedAt: "2026-08-30T10:00:00Z" }] },
  ]);
  assert.equal(rows.length, 8);
  assert.equal(rows[0].artifactId, 3);
  assert.equal(rows[1].artifactId, 2);
  assert.equal(rows[2].artifactId, 5);
  assert.equal(rows[3].artifactId, 7);
  assert.equal(rows[4].artifactId, 6);
  assert.equal(rows[5].artifactId, 1);
  assert.equal(rows[6].artifactId, 4);
  assert.equal(rows[7].artifactId, 8);
});

test("board merge caps output at the fixed limit and tolerates empty sources", () => {
  const many = Array.from({ length: 30 }, (_, index) => ({ id: index + 1, title: `T${index}`, status: "approved" as const, revision: 1, updatedAt: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString() }));
  const rows = mergeBoardRows([
    { kind: "social_post", rows: many },
    { kind: "wizard", rows: [] },
  ]);
  assert.equal(rows.length, WORKSPACE_BOARD_LIMIT);
  assert.equal(normalizeBoardRows([]).length, 0);
});

test("chaining: approved artifacts expose only the next existing route; drafts never chain", () => {
  assert.deepEqual(boardItemChaining({ kind: "social_post", artifactId: 1, engineKind: null, status: "approved", platform: null }), { label: "Bina Tawaran", href: "/app/native-offer?sourcePostId=1" });
  assert.deepEqual(boardItemChaining({ kind: "offer", artifactId: 2, engineKind: null, status: "approved", platform: null }), { label: "Bina Content", href: "/app/content-create?sourceOfferId=2" });
  assert.deepEqual(boardItemChaining({ kind: "content_engine", artifactId: 5, engineKind: "content_create", status: "approved", platform: "tiktok" }), { label: "Bina Visual Plan", href: "/app/content-create/5" });
  assert.deepEqual(boardItemChaining({ kind: "content_engine", artifactId: 9, engineKind: "content_create", status: "approved", platform: "facebook" }), { label: "Rekod Prestasi", href: "/app/performance?sourceContentCreateId=9" });
  assert.equal(boardItemChaining({ kind: "social_post", artifactId: 1, engineKind: null, status: "draft", platform: null }), null);
  assert.equal(boardItemChaining({ kind: "wizard", artifactId: 8, engineKind: null, status: "draft", platform: null }), null);
  assert.equal(boardItemChaining({ kind: "content_engine", artifactId: 4, engineKind: "content_review", status: "approved", platform: null }), null);
});

test("describeBoardItem renders compact BM labels for every kind", () => {
  assert.equal(describeBoardItem({ kind: "social_post", engineKind: null }).label, "Social Post");
  assert.equal(describeBoardItem({ kind: "offer", engineKind: null }).label, "Tawaran");
  assert.equal(describeBoardItem({ kind: "whatsapp", engineKind: null }).label, "WhatsApp");
  assert.equal(describeBoardItem({ kind: "content_engine", engineKind: "content_review" }).label, "Semakan Kandungan");
  assert.equal(describeBoardItem({ kind: "content_engine", engineKind: "content_create" }).label, "Kandungan");
  assert.equal(describeBoardItem({ kind: "content_engine", engineKind: "visual_packaging" }).label, "Pelan Visual");
  assert.equal(describeBoardItem({ kind: "content_engine", engineKind: "performance_learning" }).label, "Rekod Prestasi");
  assert.equal(describeBoardItem({ kind: "wizard", engineKind: null }).label, "Wizard");
});

test("normalizeBoardRows rejects malformed rows instead of throwing", () => {
  const rows = normalizeBoardRows([
    { id: 1, title: "OK", status: "approved", revision: 1, updatedAt: "2026-09-01T10:00:00Z" },
    null,
    { id: "x", title: "Bad", status: "weird", revision: 1, updatedAt: "nope" },
    { id: 2, title: "OK2", status: "draft", revision: null, updatedAt: "2026-09-01T11:00:00Z" },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[1].id, 2);
});
