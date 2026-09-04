import assert from "node:assert/strict";
import test from "node:test";

import { callClaudeJudge, callDeepSeekCandidate } from "../scripts/provider-benchmark/transports.ts";

test("DeepSeek transport uses fixed official host, allowlisted model and bounded JSON request", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fakeFetch: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ choices: [{ message: { content: "{\"hook\":\"Hai\"}" } }], usage: { prompt_tokens: 100, completion_tokens: 20 } }), { status: 200, headers: { "x-request-id": "ds-1" } });
  };
  const result = await callDeepSeekCandidate({ apiKey: "secret-ds", modelId: "deepseek-v4-flash", prompt: "Uji BM", fetchImpl: fakeFetch });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.deepseek.com/chat/completions");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer secret-ds");
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual({ model: body.model, temperature: body.temperature, max_tokens: body.max_tokens, response_format: body.response_format }, { model: "deepseek-v4-flash", temperature: 0.4, max_tokens: 8192, response_format: { type: "json_object" } });
  assert.deepEqual(result, { raw: "{\"hook\":\"Hai\"}", inputTokens: 100, outputTokens: 20, requestId: "ds-1" });
  assert.equal(JSON.stringify(result).includes("secret-ds"), false);
});

test("DeepSeek transport rejects missing secret, wrong model and oversized prompt before fetch", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => { calls += 1; return new Response("{}"); };
  await assert.rejects(callDeepSeekCandidate({ apiKey: "", modelId: "deepseek-v4-flash", prompt: "x", fetchImpl: fakeFetch }), /deepseek_config_invalid/);
  await assert.rejects(callDeepSeekCandidate({ apiKey: "secret", modelId: "other-model", prompt: "x", fetchImpl: fakeFetch }), /deepseek_model_not_allowed/);
  await assert.rejects(callDeepSeekCandidate({ apiKey: "secret", modelId: "deepseek-v4-pro", prompt: "x".repeat(50_001), fetchImpl: fakeFetch }), /benchmark_prompt_invalid/);
  assert.equal(calls, 0);
});

test("DeepSeek transport fails closed on HTTP, malformed and oversized responses without leaking secret", async () => {
  const base = { apiKey: "do-not-leak", modelId: "deepseek-v4-flash" as const, prompt: "x" };
  await assert.rejects(callDeepSeekCandidate({ ...base, fetchImpl: async () => new Response("bad", { status: 429 }) }), (error: unknown) => error instanceof Error && error.message === "deepseek_http_429" && !error.message.includes("do-not-leak"));
  await assert.rejects(callDeepSeekCandidate({ ...base, fetchImpl: async () => new Response("not-json", { status: 200 }) }), /deepseek_response_invalid/);
  await assert.rejects(callDeepSeekCandidate({ ...base, fetchImpl: async () => new Response("x".repeat(40_000), { status: 200 }) }), /provider_response_too_large/);
});

test("DeepSeek transport reports reasoning-truncation distinctly (finish_reason=length)", async () => {
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "" }, finish_reason: "length" }], usage: {} }), { status: 200 });
  await assert.rejects(callDeepSeekCandidate({ apiKey: "k", modelId: "deepseek-v4-flash", prompt: "x", fetchImpl: fakeFetch }), /deepseek_truncated_reasoning/);
});

test("Claude judge transport uses fixed host, Sonnet 5 model prefix and blind JSON contract", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fakeFetch: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ content: [{ type: "text", text: "{\"preferredCandidate\":\"A\"}" }], usage: { input_tokens: 500, output_tokens: 80 } }), { status: 200, headers: { "request-id": "cl-1" } });
  };
  const result = await callClaudeJudge({ apiKey: "secret-cl", modelId: "claude-sonnet-5", prompt: "Candidate A dan B", fetchImpl: fakeFetch });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers["x-api-key"], "secret-cl");
  assert.equal(headers["anthropic-version"], "2023-06-01");
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.model, "claude-sonnet-5");
  assert.equal(body.max_tokens, 1200);
  assert.deepEqual(result, { raw: "{\"preferredCandidate\":\"A\"}", inputTokens: 500, outputTokens: 80, requestId: "cl-1" });
  assert.equal(JSON.stringify(result).includes("secret-cl"), false);
});

test("Claude judge rejects non-Sonnet-5 model and invalid content before returning", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => { calls += 1; return new Response("{}"); };
  await assert.rejects(callClaudeJudge({ apiKey: "secret", modelId: "claude-opus-5", prompt: "x", fetchImpl: fakeFetch }), /claude_judge_model_not_allowed/);
  assert.equal(calls, 0);
  await assert.rejects(callClaudeJudge({ apiKey: "secret", modelId: "claude-sonnet-5", prompt: "x", fetchImpl: async () => new Response(JSON.stringify({ content: [] }), { status: 200 }) }), /claude_response_invalid/);
});

test("mock-only proof: transports never touch global fetch when an injected fetch is supplied", async () => {
  const original = globalThis.fetch;
  let globalCalls = 0;
  globalThis.fetch = async () => { globalCalls += 1; throw new Error("network forbidden"); };
  try {
    const mock: typeof fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }], usage: {} }), { status: 200 });
    await callDeepSeekCandidate({ apiKey: "secret", modelId: "deepseek-v4-pro", prompt: "x", fetchImpl: mock });
    assert.equal(globalCalls, 0);
  } finally { globalThis.fetch = original; }
});
