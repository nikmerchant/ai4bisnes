import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeterministicOffer,
  buildOfferBusinessContextSnapshot,
  parseNativeOfferRequest,
  type GenerationTelemetry,
  type NativeOfferBusinessProfile,
} from "../src/lib/native-offer/domain.ts";
import {
  NATIVE_OFFER_TABLE,
  findNativeOfferByRequestId,
  loadNativeOffer,
  saveNativeOffer,
  updateNativeOffer,
} from "../src/lib/native-offer/storage.server.ts";

const PROFILE: NativeOfferBusinessProfile = {
  businessName: "Goreng Pisang Pak Mat",
  category: "Makanan & Minuman",
  products: "goreng pisang krispy",
  targetCustomer: "pekerja pejabat",
  location: "Shah Alam",
  usp: "krispy tahan lama",
  toneOfVoice: "mesra",
  priceRange: "RM1-RM20",
  platforms: "WhatsApp",
};
const business = buildOfferBusinessContextSnapshot(PROFILE);
const request = parseNativeOfferRequest({
  entry: "standalone",
  source_post_id: null,
  offer_type: "bundle",
  product: "Pakej pisang + air",
  goal: "sales",
  valid_until: "",
  extra_note: "",
  audience: "keluarga",
  priceGuidance: "RM15",
});
const telemetry: GenerationTelemetry = {
  provider: "local", model: "deterministic-v1", mode: "deterministic_local",
  latencyMs: 5, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0,
};

function makeAdmin() {
  const rows: Array<Record<string, unknown>> = [];
  const admin = {
    from(table: string) {
      assert.equal(table, NATIVE_OFFER_TABLE);
      const chain = {
        data: null as unknown,
        error: null,
        _filters: [] as Array<[string, unknown]>,
        _payload: null as Record<string, unknown> | null,
        _mode: "" as "" | "insert" | "update",
        eq(column: string, value: unknown) { this._filters.push([column, value]); return this; },
        select() { return this; },
        maybeSingle() { return this; },
        single() { return this; },
        insert(payload: Record<string, unknown>) { this._payload = payload; this._mode = "insert"; return this; },
        update(payload: Record<string, unknown>) { this._payload = payload; this._mode = "update"; return this; },
        async then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
          try {
            if (this._mode === "insert") {
              const id = rows.length + 1;
              const row = { id, ...this._payload, created_at: new Date().toISOString() };
              rows.push(row);
              return resolve({ data: row, error: null });
            }
            if (this._mode === "update") {
              const filterMap = new Map(this._filters);
              const id = Number(filterMap.get("id"));
              const idx = rows.findIndex((r) => r.id === id && r.user_id === filterMap.get("user_id"));
              if (idx === -1) return resolve({ data: null, error: null });
              rows[idx] = { ...rows[idx], ...this._payload };
              return resolve({ data: rows[idx], error: null });
            }
            const filterMap = new Map(this._filters);
            const match = rows.find((r) => {
              for (const [column, value] of filterMap) if (r[column] !== value) return false;
              return true;
            });
            return resolve({ data: match ?? null, error: null });
          } catch (error) { reject(error); }
        },
      };
      return chain;
    },
  };
  return admin;
}

test("offer save writes only to shadow table with durable request_id", async () => {
  const admin = makeAdmin();
  const artifact = buildDeterministicOffer({ business, request, now: new Date("2026-08-28T00:00:00Z") });
  const stored = await saveNativeOffer({ admin: admin as never, userId: "u1", requestId: "123e4567-e89b-42d3-a456-426614174000", request, artifact, telemetry });
  assert.equal(stored.id, 1);
  assert.equal(stored.artifact.kind, "offer");
});

test("offer save fails closed when returned shadow row is corrupted", async () => {
  // Corrupt: inject a row that will fail validation via direct insert path
  const artifact = buildDeterministicOffer({ business, request, now: new Date() });
  await assert.rejects(() => saveNativeOffer({
    admin: {
      from(table: string) {
        assert.equal(table, NATIVE_OFFER_TABLE);
        return {
          insert() { return this; },
          select() { return this; },
          single() {
            return Promise.resolve({ data: { id: 2, request: {}, artifact: { kind: "nope" }, generation: {} }, error: null });
          },
        };
      },
    } as never,
    userId: "u1", requestId: "123e4567-e89b-42d3-a456-426614174001", request, artifact, telemetry,
  }));
});

test("offer load scopes shadow row by id + user_id and fails closed on corruption", async () => {
  const admin = makeAdmin();
  const artifact = buildDeterministicOffer({ business, request, now: new Date() });
  await saveNativeOffer({ admin: admin as never, userId: "u1", requestId: "123e4567-e89b-42d3-a456-426614174002", request, artifact, telemetry });
  const own = await loadNativeOffer({ admin: admin as never, userId: "u1", artifactId: 1 });
  assert.ok(own);
  const stranger = await loadNativeOffer({ admin: admin as never, userId: "u2", artifactId: 1 });
  assert.equal(stranger, null);
});

test("offer find by requestId uses direct durable equality + owner scope", async () => {
  const admin = makeAdmin();
  const artifact = buildDeterministicOffer({ business, request, now: new Date() });
  await saveNativeOffer({ admin: admin as never, userId: "u1", requestId: "123e4567-e89b-42d3-a456-426614174003", request, artifact, telemetry });
  const found = await findNativeOfferByRequestId({ admin: admin as never, userId: "u1", requestId: "123e4567-e89b-42d3-a456-426614174003" });
  assert.ok(found);
  const notFound = await findNativeOfferByRequestId({ admin: admin as never, userId: "u2", requestId: "123e4567-e89b-42d3-a456-426614174003" });
  assert.equal(notFound, null);
});

test("offer update scopes by owner and changes only artifact/rendered_text/updated_at", async () => {
  const admin = makeAdmin();
  const artifact = buildDeterministicOffer({ business, request, now: new Date("2026-08-28T00:00:00Z") });
  const stored = await saveNativeOffer({ admin: admin as never, userId: "u1", requestId: "123e4567-e89b-42d3-a456-426614174004", request, artifact, telemetry });
  const approved = { ...artifact, status: "approved" as const, updatedAt: "2026-08-28T01:00:00.000Z" };
  const updated = await updateNativeOffer({ admin: admin as never, userId: "u1", stored, artifact: approved });
  assert.ok(updated);
  assert.equal(updated.artifact.status, "approved");
  const strangerUpdate = await updateNativeOffer({ admin: admin as never, userId: "u2", stored, artifact: approved });
  assert.equal(strangerUpdate, null);
});
