export type ProviderTransportResult = {
  raw: string;
  inputTokens: number;
  outputTokens: number;
  requestId: string | null;
};

type FetchLike = typeof fetch;
const RESPONSE_CAP_BYTES = 32_768;
const PROMPT_CAP_CHARS = 50_000;
const TIMEOUT_MS = 30_000;

function validPrompt(value: string) {
  if (typeof value !== "string" || !value.trim() || value.length > PROMPT_CAP_CHARS) throw new Error("benchmark_prompt_invalid");
}

function tokens(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

async function boundedJson(response: Response): Promise<Record<string, unknown>> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > RESPONSE_CAP_BYTES) throw new Error("provider_response_too_large");
  const text = await response.text();
  if (new TextEncoder().encode(text).length > RESPONSE_CAP_BYTES) throw new Error("provider_response_too_large");
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not_object");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === "provider_response_too_large") throw error;
    throw new Error("provider_response_invalid");
  }
}

async function requestWithTimeout(input: { url: string; init: RequestInit; fetchImpl: FetchLike; provider: "deepseek" | "claude" }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await input.fetchImpl(input.url, { ...input.init, signal: controller.signal, cache: "no-store" });
  } catch {
    throw new Error(`${input.provider}_transport_failed`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function callDeepSeekCandidate(input: {
  apiKey: string;
  modelId: "deepseek-v4-flash" | "deepseek-v4-pro" | string;
  prompt: string;
  fetchImpl?: FetchLike;
}): Promise<ProviderTransportResult> {
  if (typeof input.apiKey !== "string" || !input.apiKey.trim()) throw new Error("deepseek_config_invalid");
  if (input.modelId !== "deepseek-v4-flash" && input.modelId !== "deepseek-v4-pro") throw new Error("deepseek_model_not_allowed");
  validPrompt(input.prompt);
  const response = await requestWithTimeout({
    url: "https://api.deepseek.com/chat/completions",
    fetchImpl: input.fetchImpl ?? fetch,
    provider: "deepseek",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.apiKey}` },
      body: JSON.stringify({
        model: input.modelId,
        temperature: 0.4,
        // v4 always thinks; reasoning + JSON must both fit under max_tokens.
        // Flash occasionally reasons past 6000 on hard fixtures; 8192 clears it.
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: input.prompt }],
      }),
    },
  });
  if (!response.ok) throw new Error(`deepseek_http_${response.status}`);
  let payload: Record<string, unknown>;
  try { payload = await boundedJson(response); } catch (error) {
    if (error instanceof Error && error.message === "provider_response_too_large") throw error;
    throw new Error("deepseek_response_invalid");
  }
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const first = choices[0] && typeof choices[0] === "object" ? choices[0] as Record<string, unknown> : {};
  const message = first.message && typeof first.message === "object" ? first.message as Record<string, unknown> : {};
  if (first.finish_reason === "length") throw new Error("deepseek_truncated_reasoning");
  if (typeof message.content !== "string" || !message.content.trim() || message.content.length > 20_000) throw new Error("deepseek_response_invalid");
  const usage = payload.usage && typeof payload.usage === "object" ? payload.usage as Record<string, unknown> : {};
  return { raw: message.content, inputTokens: tokens(usage.prompt_tokens), outputTokens: tokens(usage.completion_tokens), requestId: response.headers.get("x-request-id") };
}

export async function callClaudeJudge(input: {
  apiKey: string;
  modelId: string;
  prompt: string;
  fetchImpl?: FetchLike;
}): Promise<ProviderTransportResult> {
  if (typeof input.apiKey !== "string" || !input.apiKey.trim()) throw new Error("claude_config_invalid");
  if (!/^claude-sonnet-5(?:[-.][a-z0-9]+)*$/i.test(input.modelId)) throw new Error("claude_judge_model_not_allowed");
  validPrompt(input.prompt);
  const response = await requestWithTimeout({
    url: "https://api.anthropic.com/v1/messages",
    fetchImpl: input.fetchImpl ?? fetch,
    provider: "claude",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": input.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: input.modelId, max_tokens: 1200, temperature: 0, messages: [{ role: "user", content: input.prompt }] }),
    },
  });
  if (!response.ok) throw new Error(`claude_http_${response.status}`);
  let payload: Record<string, unknown>;
  try { payload = await boundedJson(response); } catch (error) {
    if (error instanceof Error && error.message === "provider_response_too_large") throw error;
    throw new Error("claude_response_invalid");
  }
  const content = Array.isArray(payload.content) ? payload.content : [];
  const textBlock = content.find((entry) => entry && typeof entry === "object" && (entry as Record<string, unknown>).type === "text") as Record<string, unknown> | undefined;
  if (!textBlock || typeof textBlock.text !== "string" || !textBlock.text.trim() || textBlock.text.length > 20_000) throw new Error("claude_response_invalid");
  const usage = payload.usage && typeof payload.usage === "object" ? payload.usage as Record<string, unknown> : {};
  return { raw: textBlock.text, inputTokens: tokens(usage.input_tokens), outputTokens: tokens(usage.output_tokens), requestId: response.headers.get("request-id") };
}
