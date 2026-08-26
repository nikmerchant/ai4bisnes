export async function readBoundedJsonRequest(
  request: Pick<Request, "headers" | "body">,
  maxBytes: number
): Promise<Record<string, unknown>> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const declaredBytes = Number(declared);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new Error("body_too_large");
    }
  }
  if (!request.body) throw new Error("invalid_json");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel("body_too_large");
      throw new Error("body_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not_object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("invalid_json");
  }
}
