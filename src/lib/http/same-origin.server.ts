import "server-only";

type SameOriginRequest = {
  headers: { get(name: string): string | null };
  nextUrl: { origin: string };
};

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || "";
}

export function isSameOriginRequest(req: SameOriginRequest) {
  const suppliedOrigin = req.headers.get("origin");
  if (!suppliedOrigin) return true;

  let normalizedSuppliedOrigin: string;
  try {
    normalizedSuppliedOrigin = new URL(suppliedOrigin).origin;
  } catch {
    return false;
  }

  const host = firstHeaderValue(req.headers.get("host"));
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto")).toLowerCase();
  if (host && forwardedProto) {
    if (forwardedProto !== "https" && forwardedProto !== "http") return false;
    try {
      return normalizedSuppliedOrigin === new URL(`${forwardedProto}://${host}`).origin;
    } catch {
      return false;
    }
  }

  return normalizedSuppliedOrigin === req.nextUrl.origin;
}
