import assert from "node:assert/strict";
import test from "node:test";

import { isSameOriginRequest } from "../src/lib/http/same-origin.server.ts";

function request(input: {
  origin?: string;
  host?: string;
  forwardedProto?: string;
  nextOrigin?: string;
}) {
  const headers = new Headers();
  if (input.origin !== undefined) headers.set("origin", input.origin);
  if (input.host !== undefined) headers.set("host", input.host);
  if (input.forwardedProto !== undefined) headers.set("x-forwarded-proto", input.forwardedProto);
  return {
    headers,
    nextUrl: { origin: input.nextOrigin ?? "http://127.0.0.1:3001" },
  };
}

test("accepts the public origin reconstructed from trusted proxy headers", () => {
  assert.equal(isSameOriginRequest(request({
    origin: "https://ai4bisnes.com",
    host: "ai4bisnes.com",
    forwardedProto: "https",
  })), true);
});

test("rejects an external origin even when the internal Next origin differs", () => {
  assert.equal(isSameOriginRequest(request({
    origin: "https://attacker.example",
    host: "ai4bisnes.com",
    forwardedProto: "https",
  })), false);
});

test("accepts a direct same-origin request without proxy headers", () => {
  assert.equal(isSameOriginRequest(request({
    origin: "http://127.0.0.1:3001",
    nextOrigin: "http://127.0.0.1:3001",
  })), true);
});

test("rejects malformed origins and keeps non-browser requests compatible", () => {
  assert.equal(isSameOriginRequest(request({ origin: "not a url" })), false);
  assert.equal(isSameOriginRequest(request({})), true);
});
