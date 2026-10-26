import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type Stripe from "stripe";

type Write = {
  table: string;
  kind: "update" | "upsert";
  value: unknown;
  options?: unknown;
  filters: [string, unknown][];
};

// Execute the real handler/action, replacing only framework and I/O boundaries.
// Unknown imports and fetch fail closed; no Stripe/Supabase SDK is instantiated.
function loadModule(
  relativePath: string,
  modules: Record<string, unknown>,
  env: Record<string, string | undefined>,
) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: relativePath,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(diagnostics?.length ?? 0, 0);
  const exports: Record<string, unknown> = {};
  let networkCalls = 0;
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      assert.ok(Object.hasOwn(modules, name), `Unexpected runtime import: ${name}`);
      return modules[name];
    },
    process: { env },
    Response,
    Date,
    console: { log() {}, error() {} },
    fetch() {
      networkCalls++;
      throw new Error("Network forbidden in billing fixtures");
    },
  }, { filename: relativePath, timeout: 1000 });
  return { exports, assertOffline: () => assert.equal(networkCalls, 0) };
}

function database(referrer: string | null = null, failWrite = false) {
  const writes: Write[] = [];
  return {
    writes,
    admin: {
      from(table: string) {
        let write: Write | undefined;
        const chain = {
          update(value: unknown) {
            if (failWrite) throw new Error("fixture database failure");
            write = { table, kind: "update", value: structuredClone(value), filters: [] };
            writes.push(write);
            return chain;
          },
          upsert(value: unknown, options: unknown) {
            if (failWrite) throw new Error("fixture database failure");
            write = {
              table, kind: "upsert", value: structuredClone(value),
              options: structuredClone(options), filters: [],
            };
            writes.push(write);
            return chain;
          },
          eq(column: string, value: unknown) {
            write?.filters.push([column, value]);
            return chain;
          },
          select() { return chain; },
          single() { return Promise.resolve({ data: { referred_by: referrer } }); },
        };
        return chain;
      },
    },
  };
}

type FixtureEvent = { type: Stripe.Event.Type; data: { object: Record<string, unknown> } };

async function deliver(
  event: FixtureEvent,
  options: { referrer?: string; failWrite?: boolean; invalidSignature?: boolean; missingKey?: boolean } = {},
) {
  const db = database(options.referrer, options.failWrite);
  let adminCalls = 0;
  const loaded = loadModule("../src/app/api/stripe/webhook/route.ts", {
    "@/lib/stripe": {
      dapatkanStripe: () => ({ webhooks: {
        constructEvent(body: string, signature: string, secret: string) {
          assert.equal(body, JSON.stringify(event));
          assert.equal(signature, "fixture-signature");
          assert.equal(secret, "fixture-webhook-secret");
          if (options.invalidSignature) throw new Error("fixture signature failure");
          return JSON.parse(body);
        },
      } }),
    },
    "@supabase/supabase-js": {
      createClient(url: string, key: string) {
        assert.equal(url, "https://fixture.invalid");
        assert.equal(key, "fixture-service-key");
        adminCalls++;
        return db.admin;
      },
    },
  }, {
    STRIPE_WEBHOOK_SECRET: "fixture-webhook-secret",
    SUPABASE_SERVICE_ROLE_KEY: options.missingKey ? undefined : "fixture-service-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid",
  });
  const post = loaded.exports.POST as (req: Request) => Promise<Response>;
  const response = await post(new Request("https://fixture.invalid/webhook", {
    method: "POST", headers: { "stripe-signature": "fixture-signature" },
    body: JSON.stringify(event),
  }));
  loaded.assertOffline();
  return { response, writes: db.writes, adminCalls };
}

const subscription = {
  id: "sub_fixture", object: "subscription", status: "active",
  metadata: { user_id: "user-fixture" },
  current_period_end: 1800000000,
  items: { object: "list", data: [{ id: "si_fixture", current_period_end: 1900000000 }] },
};

function subscriptionEvent(type: Stripe.Event.Type, changes: Record<string, unknown> = {}): FixtureEvent {
  return { type, data: { object: { ...subscription, ...changes } } };
}

function invoiceEvent(type: Stripe.Event.Type, changes: Record<string, unknown> = {}): FixtureEvent {
  return { type, data: { object: {
    id: "in_fixture", object: "invoice", subscription: "sub_fixture", ...changes,
  } } };
}

test("checkout.session.completed preserves billing, profile and affiliate writes", async () => {
  const { response, writes } = await deliver({
    type: "checkout.session.completed", data: { object: {
      id: "cs_fixture", object: "checkout.session", subscription: "sub_fixture",
      customer: "cus_fixture", metadata: { user_id: "user-fixture", tier: "pro", period: "bulanan" },
    } },
  }, { referrer: "referrer-fixture" });
  assert.equal(await response.text(), "ok");
  assert.equal(response.status, 200);
  const value = writes[0].value as Record<string, unknown>;
  assert.equal(typeof value.starts_at, "string");
  assert.ok(Number.isFinite(Date.parse(String(value.starts_at))));
  const { starts_at, ...billing } = value;
  assert.ok(starts_at);
  assert.deepEqual(billing, {
    user_id: "user-fixture", tier: "pro", period: "bulanan", price_rm: 49,
    status: "active", stripe_subscription_id: "sub_fixture", stripe_customer_id: "cus_fixture",
  });
  assert.equal(writes.length, 3);
  assert.equal(writes[0].table, "subscriptions");
  assert.equal(writes[0].kind, "upsert");
  assert.deepEqual(writes[0].options, { onConflict: "user_id,tier", ignoreDuplicates: false });
  assert.deepEqual(writes[1], {
    table: "profiles", kind: "update", value: { tier: "pro" },
    filters: [["id", "user-fixture"]],
  });
  assert.deepEqual(writes[2], {
    table: "affiliate_commissions", kind: "upsert", value: {
      referrer_id: "referrer-fixture", referred_user_id: "user-fixture",
      subscription_id: "user-fixture", amount_rm: 9.8,
    }, options: { onConflict: "subscription_id", ignoreDuplicates: true }, filters: [],
  });
});

for (const [tier, period, price] of [
  ["pro", "tahunan", 490], ["max", "bulanan", 69], ["max", "tahunan", 690],
] as const) {
  test(`checkout preserves ${tier}/${period} price and skips absent affiliate`, async () => {
    const { writes } = await deliver({ type: "checkout.session.completed", data: { object: {
      id: "cs_fixture", subscription: "sub_fixture", customer: "cus_fixture",
      metadata: { user_id: "user-fixture", tier, period },
    } } });
    assert.equal((writes[0].value as Record<string, unknown>).price_rm, price);
    assert.equal(writes.length, 2);
  });
}

test("incomplete checkout metadata is acknowledged without writes", async () => {
  const { writes, response } = await deliver({
    type: "checkout.session.completed", data: { object: { id: "cs_fixture", metadata: {} } },
  });
  assert.deepEqual(writes, []);
  assert.equal(await response.text(), "ok");
});

test("subscription.updated preserves the top-level expiry even when item expiry differs", async () => {
  const { writes } = await deliver(subscriptionEvent("customer.subscription.updated"));
  assert.deepEqual(writes, [{
    table: "subscriptions", kind: "update",
    value: { status: "active", expires_at: "2027-01-15T08:00:00.000Z" },
    filters: [["stripe_subscription_id", "sub_fixture"]],
  }]);
});

for (const end of [undefined, 0]) {
  test(`subscription.updated does not substitute item expiry for top-level ${String(end)}`, async () => {
    const { writes } = await deliver(subscriptionEvent("customer.subscription.updated", { current_period_end: end }));
    assert.deepEqual(writes[0].value, { status: "active" });
  });
}

for (const [status, stored, downgrade] of [
  ["past_due", "past_due", false], ["canceled", "cancelled", true],
  ["unpaid", "unpaid", true], ["trialing", "incomplete", false],
] as const) {
  test(`subscription.updated preserves ${status} mapping and profile side effects`, async () => {
    const { writes } = await deliver(subscriptionEvent("customer.subscription.updated", { status }));
    assert.deepEqual(writes[0].value, { status: stored, expires_at: "2027-01-15T08:00:00.000Z" });
    assert.equal(writes.length, downgrade ? 2 : 1);
    if (downgrade) assert.deepEqual(writes[1], {
      table: "profiles", kind: "update", value: { tier: "basic" }, filters: [["id", "user-fixture"]],
    });
  });
}

test("subscription.deleted uses the first matching case and its supplied legacy expiry", async () => {
  const { writes } = await deliver(subscriptionEvent("customer.subscription.deleted", { status: "canceled" }));
  assert.deepEqual(writes, [
    { table: "subscriptions", kind: "update", value: {
      status: "cancelled", expires_at: "2027-01-15T08:00:00.000Z",
    }, filters: [["stripe_subscription_id", "sub_fixture"]] },
    { table: "profiles", kind: "update", value: { tier: "basic" }, filters: [["id", "user-fixture"]] },
  ]);
});

test("subscription without user metadata is acknowledged without writes", async () => {
  const { writes } = await deliver(subscriptionEvent("customer.subscription.updated", { metadata: {} }));
  assert.deepEqual(writes, []);
});

test("invoice.payment_succeeded remains an acknowledged no-op", async () => {
  const { writes, response } = await deliver(invoiceEvent("invoice.payment_succeeded"));
  assert.deepEqual(writes, []);
  assert.equal(await response.text(), "ok");
});

for (const [type, status] of [["invoice.paid", "active"], ["invoice.payment_failed", "past_due"]] as const) {
  test(`${type} preserves its top-level subscription update`, async () => {
    const { writes } = await deliver(invoiceEvent(type));
    assert.deepEqual(writes, [{
      table: "subscriptions", kind: "update", value: { status },
      filters: [["stripe_subscription_id", "sub_fixture"]],
    }]);
  });
  test(`${type} does not substitute a modern nested subscription`, async () => {
    const { writes } = await deliver(invoiceEvent(type, {
      subscription: undefined,
      parent: { type: "subscription_details", subscription_details: { subscription: "sub_nested" } },
    }));
    assert.deepEqual(writes, []);
  });
}

test("invalid webhook signature cannot construct an admin client", async () => {
  const { response, writes, adminCalls } = await deliver(invoiceEvent("invoice.paid"), { invalidSignature: true });
  assert.equal(response.status, 400);
  assert.equal(adminCalls, 0);
  assert.deepEqual(writes, []);
});

test("missing service key refuses the webhook before admin construction", async () => {
  const { response, adminCalls } = await deliver(invoiceEvent("invoice.paid"), { missingKey: true });
  assert.equal(response.status, 500);
  assert.equal(adminCalls, 0);
});

test("database errors retain the existing webhook acknowledgement", async () => {
  const { response } = await deliver(invoiceEvent("invoice.payment_failed"), { failWrite: true });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");
});

async function saveProfile(options: { user?: boolean; valid?: boolean; key?: boolean } = {}) {
  const db = database();
  const order: string[] = [];
  const env: Record<string, string | undefined> = {
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid",
    get SUPABASE_SERVICE_ROLE_KEY() {
      order.push("read-key");
      return options.key === false ? undefined : "fixture-service-key";
    },
  };
  const loaded = loadModule("../src/app/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect(path: string): never { throw new Error(`redirect:${path}`); } },
    "next/headers": { cookies() { throw new Error("Unexpected cookies access"); } },
    "@/lib/harga": {}, "@/lib/resend": {}, "@/lib/stripe": {},
    "@/lib/supabase/server": { createClient: async () => ({ auth: {
      getUser: async () => {
        order.push("get-user");
        return { data: { user: options.user === false ? null : { id: "user-fixture" } } };
      },
    } }) },
    "@supabase/supabase-js": { createClient(url: string, key: string) {
      order.push("create-admin");
      assert.equal(url, "https://fixture.invalid");
      assert.equal(key, "fixture-service-key");
      return db.admin;
    } },
  }, env);
  assert.deepEqual(order, []);
  const form = new FormData();
  if (options.valid !== false) {
    form.set("business_name", "  Kedai Fixture  ");
    form.set("category_id", "3");
    form.append("platforms", "WhatsApp");
    form.append("platforms", "Instagram");
  }
  const action = loaded.exports.simpanProfil as (input: FormData) => Promise<void>;
  await assert.rejects(action(form), /redirect:/);
  loaded.assertOffline();
  return { writes: db.writes, order };
}

test("simpanProfil does not read the service key or create admin before authentication", async () => {
  const { writes, order } = await saveProfile({ user: false });
  assert.deepEqual(order, ["get-user"]);
  assert.deepEqual(writes, []);
});

test("simpanProfil does not read the service key before validating required fields", async () => {
  const { writes, order } = await saveProfile({ valid: false });
  assert.deepEqual(order, ["get-user"]);
  assert.deepEqual(writes, []);
});

test("simpanProfil refuses missing service key without constructing admin", async () => {
  const { writes, order } = await saveProfile({ key: false });
  assert.deepEqual(order, ["get-user", "read-key"]);
  assert.deepEqual(writes, []);
});

test("simpanProfil retains delayed admin construction and owner-scoped profile update", async () => {
  const { writes, order } = await saveProfile();
  assert.deepEqual(order, ["get-user", "read-key", "create-admin"]);
  assert.deepEqual(writes, [{
    table: "profiles", kind: "update", value: {
      business_name: "Kedai Fixture", category_id: 3, products: "", target_customer: "",
      location: "", usp: "", tone_of_voice: "", main_competitors: "", price_range: "",
      platforms: "WhatsApp, Instagram", website: "", onboarded: true,
    }, filters: [["id", "user-fixture"]],
  }]);
});
