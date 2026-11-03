import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { publicOrigin, safeNextPath } from "../src/lib/http/same-origin.server.ts";

function request(headers: Record<string, string>, origin = "https://localhost:3000") {
  return { headers: { get: (name: string) => headers[name] ?? null }, nextUrl: { origin } };
}

test("publicOrigin uses the proxied public host, not the container URL", () => {
  assert.equal(publicOrigin(request({ host: "ai4bisnes.com", "x-forwarded-proto": "https" })), "https://ai4bisnes.com");
  assert.equal(publicOrigin(request({ host: "ai4bisnes.com", "x-forwarded-proto": "https, http" })), "https://ai4bisnes.com");
});

test("publicOrigin falls back to nextUrl.origin without proxy headers or with a bad proto", () => {
  assert.equal(publicOrigin(request({ host: "ai4bisnes.com" }, "http://localhost:3000")), "http://localhost:3000");
  assert.equal(publicOrigin(request({ host: "ai4bisnes.com", "x-forwarded-proto": "javascript" })), "https://localhost:3000");
});

test("safeNextPath keeps internal paths and rejects off-site targets", () => {
  assert.equal(safeNextPath("/app/profil?x=1"), "/app/profil?x=1");
  for (const bad of [null, "", "https://evil.example", "//evil.example", "/\\evil.example", "app"]) {
    assert.equal(safeNextPath(bad), "/app", String(bad));
  }
});

test("portal and auth confirm build redirects from publicOrigin, not request.url", () => {
  for (const path of ["../src/app/api/stripe/portal/route.ts", "../src/app/auth/confirm/route.ts"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /publicOrigin\(/, path);
    assert.doesNotMatch(source, /new URL\([^)]*(req|request)\.url/, path);
    assert.doesNotMatch(source, /url\.origin/, path);
  }
});
