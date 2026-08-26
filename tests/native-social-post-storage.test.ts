import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBusinessContextSnapshot,
  buildDeterministicSocialPost,
  parseNativeSocialPostRequest,
  type NativeSocialPostBusinessProfile,
} from "../src/lib/native-social-post/domain.ts";
import {
  NATIVE_SOCIAL_POST_TABLE,
  loadNativeSocialPost,
  saveNativeSocialPost,
  updateNativeSocialPost,
  findNativeSocialPostByRequestId,
} from "../src/lib/native-social-post/storage.server.ts";

const PROFILE: NativeSocialPostBusinessProfile = {
  businessName: "Dapur Salmah", category: "Makanan & Minuman",
  products: "Set lunch nasi campur", targetCustomer: "Pekerja pejabat Kota Bharu",
  location: "Kota Bharu", usp: "Tempahan siap sebelum waktu rehat",
  toneOfVoice: "mesra", priceRange: "RM12–RM18", platforms: "Instagram, WhatsApp",
};
const NOW = new Date("2026-08-26T00:00:00.000Z");
const REQUEST = parseNativeSocialPostRequest({ platform: "instagram", objective: "sales", angle: "promotion", topic: "Set lunch minggu ini" });
const ARTIFACT = buildDeterministicSocialPost({ business: buildBusinessContextSnapshot(PROFILE), request: REQUEST, now: NOW });
const TELEMETRY = {
  mode: "deterministic_local", provider: "local", model: "deterministic-v1",
  latencyMs: 4, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0,
} as const;

function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    request: REQUEST,
    artifact: ARTIFACT,
    generation: TELEMETRY,
    created_at: NOW.toISOString(),
    ...overrides,
  };
}

type Capture = {
  table?: string;
  filters?: string[][];
  inserted?: Record<string, unknown>;
  updated?: Record<string, unknown>;
};

function fakeAdmin(rows: unknown, capture: Capture = {}) {
  const chain = {
    filters: [] as string[][],
    select() { return chain; },
    insert(value: Record<string, unknown>) { capture.inserted = value; return chain; },
    update(value: Record<string, unknown>) { capture.updated = value; return chain; },
    eq(column: string, value: unknown) { chain.filters.push([column, String(value)]); return chain; },
    single() { return Promise.resolve({ data: rows, error: null }); },
    maybeSingle() { return Promise.resolve({ data: rows, error: null }); },
  };
  return {
    from(table: string) {
      capture.table = table;
      capture.filters = chain.filters;
      return chain;
    },
  } as unknown as Parameters<typeof saveNativeSocialPost>[0]["admin"];
}

test("save writes only to shadow table with durable request_id", async () => {
  const capture: Capture = {};
  const admin = fakeAdmin(storedRow(), capture);
  const stored = await saveNativeSocialPost({
    admin, userId: "user-a", requestId: "d194f4f4-4bb5-4e66-9102-fc53cdad3a23",
    request: REQUEST, artifact: ARTIFACT, telemetry: TELEMETRY,
  });
  assert.equal(capture.table, NATIVE_SOCIAL_POST_TABLE);
  assert.equal(capture.inserted?.user_id, "user-a");
  assert.equal(capture.inserted?.request_id, "d194f4f4-4bb5-4e66-9102-fc53cdad3a23");
  assert.equal(typeof capture.inserted?.rendered_text, "string");
  assert.equal(stored.artifact.businessContext.businessName, "Dapur Salmah");
});

test("save fails closed when returned shadow row is corrupted", async () => {
  const bad = fakeAdmin(storedRow({ artifact: "not-an-object" }));
  await assert.rejects(
    () => saveNativeSocialPost({ admin: bad, userId: "user-a", requestId: crypto.randomUUID(), request: REQUEST, artifact: ARTIFACT, telemetry: TELEMETRY }),
    /native_social_post_saved_row_invalid/
  );
});

test("load scopes shadow row by id + user_id and fails closed on corruption", async () => {
  const capture: Capture = {};
  const stored = await loadNativeSocialPost({ admin: fakeAdmin(storedRow(), capture), userId: "user-a", artifactId: 7 });
  assert.ok(stored);
  assert.equal(capture.table, NATIVE_SOCIAL_POST_TABLE);
  const flat = (capture.filters ?? []).flat();
  assert.ok(flat.includes("id"));
  assert.ok(flat.includes("user_id"));
  assert.ok(flat.includes("user-a"));

  const corrupted = fakeAdmin(storedRow({ artifact: { schemaVersion: 99 } }));
  assert.equal(await loadNativeSocialPost({ admin: corrupted, userId: "user-a", artifactId: 9 }), null);
});

test("find by requestId uses direct durable equality + owner scope", async () => {
  const capture: Capture = {};
  const found = await findNativeSocialPostByRequestId({
    admin: fakeAdmin(storedRow({ id: 3 }), capture), userId: "user-a",
    requestId: "d194f4f4-4bb5-4e66-9102-fc53cdad3a23",
  });
  assert.equal(found?.id, 3);
  const flat = (capture.filters ?? []).flat();
  assert.ok(flat.includes("user_id"));
  assert.ok(flat.includes("request_id"));
  assert.ok(flat.includes("d194f4f4-4bb5-4e66-9102-fc53cdad3a23"));
});

test("update scopes by owner and changes only artifact/rendered_text/updated_at", async () => {
  const capture: Capture = {};
  const stored = { id: 7, artifact: ARTIFACT, request: REQUEST, telemetry: TELEMETRY, createdAt: NOW.toISOString() };
  const updated = await updateNativeSocialPost({ admin: fakeAdmin(storedRow(), capture), userId: "user-a", stored, artifact: ARTIFACT });
  assert.equal(updated?.id, 7);
  assert.deepEqual(Object.keys(capture.updated ?? {}).sort(), ["artifact", "rendered_text", "updated_at"]);
  const flat = (capture.filters ?? []).flat();
  assert.ok(flat.includes("user-a"));
  assert.ok(flat.includes("id"));
});
