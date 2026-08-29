import assert from "node:assert/strict";
import test from "node:test";

import {
  parseNativeWhatsAppRequest,
  buildDeterministicWhatsAppDraft,
  buildWhatsAppBusinessContextSnapshot,
  validateWhatsAppDraftArtifact,
  type GenerationTelemetry,
} from "../src/lib/native-whatsapp/domain.ts";
import {
  NATIVE_WHATSAPP_TABLE,
  saveNativeWhatsAppDraft,
  loadNativeWhatsAppDraft,
  findNativeWhatsAppDraftByRequestId,
  updateNativeWhatsAppDraft,
} from "../src/lib/native-whatsapp/storage.server.ts";

const business = buildWhatsAppBusinessContextSnapshot({
  businessName: "Kedai Kuih Mak Cik",
  products: "kuih raya",
  targetCustomer: "pelanggan raya",
  toneOfVoice: "mesra",
  priceRange: "RM20",
});

const request = parseNativeWhatsAppRequest({
  entry: "standalone",
  source_offer_id: null,
  reply_intent: "answer_inquiry",
  customer_message: "Ada stok esok?",
  customer_name: "Aisyah",
  extra_note: "",
});

const telemetry: GenerationTelemetry = {
  provider: "local", model: "deterministic-v1", mode: "deterministic_local",
  latencyMs: 3, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0,
};

type Row = Record<string, unknown>;
type FakeAdmin = {
  rows: Row[];
  from(table: string): {
    insert(payload: Row): { select(): { single(): Promise<{ data: Row | null; error: null }> } };
    select(): { eq(col: string, val: unknown): { eq(col2: string, val2: unknown): { maybeSingle(): Promise<{ data: Row | null; error: null }> }; maybeSingle(): Promise<{ data: Row | null; error: null }> } };
    update(payload: Row): { eq(col: string, val: unknown): { eq(col2: string, val2: unknown): { select(): { maybeSingle(): Promise<{ data: Row | null; error: null }> } } } };
  };
};

function makeAdmin(rows: Row[]): { admin: FakeAdmin; rows: Row[] } {
  const admin: FakeAdmin = {
    rows,
    from(table: string) {
      assert.equal(table, NATIVE_WHATSAPP_TABLE);
      return {
        insert(payload: Row) {
          return {
            select() {
              return {
                async single() {
                  const row = { id: rows.length + 1, created_at: "2026-08-29T00:00:00Z", ...payload };
                  rows.push(row);
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        select() {
          return {
            eq(col: string, val: unknown) {
              return {
                eq(_col2: string, _val2: unknown) {
                  return {
                    async maybeSingle() {
                      const row = rows.find((r) => r[col] === val && r[_col2] === _val2) ?? null;
                      return { data: row ? { ...row } : null, error: null };
                    },
                  };
                },
                async maybeSingle() {
                  const row = rows.find((r) => r[col] === val) ?? null;
                  return { data: row ? { ...row } : null, error: null };
                },
              };
            },
          };
        },
        update(payload: Row) {
          return {
            eq(col: string, val: unknown) {
              return {
                eq(_col2: string, _val2: unknown) {
                  return {
                    select() {
                      return {
                        async maybeSingle() {
                          const row = rows.find((r) => r[col] === val && r[_col2] === _val2);
                          if (!row) return { data: null, error: null };
                          Object.assign(row, payload);
                          return { data: { ...row }, error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  return { admin, rows };
}

test("save writes only to slice 3 shadow table with durable request_id", async () => {
  const { admin, rows } = makeAdmin([]);
  const artifact = buildDeterministicWhatsAppDraft({ business, request, now: new Date("2026-08-29T00:00:00Z") });
  const stored = await saveNativeWhatsAppDraft({ admin: admin as never, userId: "u1", requestId: "11111111-1111-4111-8111-111111111111", request, artifact, telemetry });
  assert.equal(stored.artifact.status, "draft");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, "u1");
  assert.equal(rows[0].request_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(typeof rows[0].rendered_text, "string");
});

test("save fails closed when returned row is corrupted", async () => {
  const badAdmin = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: "x", artifact: { junk: true } }, error: null }) }) }) }) };
  const artifact = buildDeterministicWhatsAppDraft({ business, request, now: new Date() });
  await assert.rejects(() => saveNativeWhatsAppDraft({ admin: badAdmin as never, userId: "u1", requestId: "11111111-1111-4111-8111-111111111112", request, artifact, telemetry }));
});

test("load scopes by id + user_id; find by requestId uses owner scope", async () => {
  const { admin, rows } = makeAdmin([]);
  const artifact = buildDeterministicWhatsAppDraft({ business, request, now: new Date() });
  const stored = await saveNativeWhatsAppDraft({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222", request, artifact, telemetry });
  const loaded = await loadNativeWhatsAppDraft({ admin: admin as never, userId: "u1", artifactId: stored.id });
  assert.ok(loaded);
  assert.equal(loaded.artifact.kind, "whatsapp_reply_draft");
  const byRequest = await findNativeWhatsAppDraftByRequestId({ admin: admin as never, userId: "u1", requestId: "22222222-2222-4222-8222-222222222222" });
  assert.ok(byRequest);
  rows[0].user_id = "someone-else";
  assert.equal(await loadNativeWhatsAppDraft({ admin: admin as never, userId: "u1", artifactId: stored.id }), null);
});

test("update scopes by owner and changes only artifact/rendered_text/updated_at", async () => {
  const { admin, rows } = makeAdmin([]);
  const artifact = buildDeterministicWhatsAppDraft({ business, request, now: new Date("2026-08-29T00:00:00Z") });
  const stored = await saveNativeWhatsAppDraft({ admin: admin as never, userId: "u1", requestId: "33333333-3333-4333-8333-333333333333", request, artifact, telemetry });
  const approved = { ...artifact, status: "approved" as const, body: "Badan diluluskan.", updatedAt: "2026-08-29T01:00:00Z" };
  assert.ok(validateWhatsAppDraftArtifact(approved).ok);
  const updated = await updateNativeWhatsAppDraft({ admin: admin as never, userId: "u1", stored, artifact: approved });
  assert.equal(updated?.artifact.status, "approved");
  assert.equal(rows[0].request_id, "33333333-3333-4333-8333-333333333333");
});
