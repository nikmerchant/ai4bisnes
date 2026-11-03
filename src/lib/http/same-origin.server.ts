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

// Behind the Coolify proxy, request.url is the container address (localhost:3000).
// Absolute redirects must use the public host the browser actually requested.
export function publicOrigin(req: SameOriginRequest) {
  const host = firstHeaderValue(req.headers.get("host"));
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto")).toLowerCase();
  if (host && (forwardedProto === "https" || forwardedProto === "http")) {
    try {
      return new URL(`${forwardedProto}://${host}`).origin;
    } catch {
      // fall through to the framework origin
    }
  }
  return req.nextUrl.origin;
}

// Only same-site paths; anything else (absolute, protocol-relative, backslash) goes to /app.
export function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/app";
  return next;
}
