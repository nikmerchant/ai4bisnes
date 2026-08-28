type Slice2User = { id: string; email?: string | null };

type Slice2AccessInput = {
  nodeEnv: string | undefined;
  deploymentTarget: string | undefined;
  enabled: string | undefined;
  allowlist: string | undefined;
  user: Slice2User;
};

export type Slice2AccessDecision = {
  allowed: boolean;
  reason:
    | "local_default"
    | "disabled"
    | "allowlisted_staging"
    | "allowlisted_production_canary"
    | "allowlist_required"
    | "not_allowlisted"
    | "production_forbidden"
    | "unknown_environment";
};

function parseBoolean(value: string | undefined) {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function parseAllowlist(value: string | undefined) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function resolveSlice2Access(input: Slice2AccessInput): Slice2AccessDecision {
  const enabled = parseBoolean(input.enabled);
  const target = input.deploymentTarget?.trim().toLowerCase();
  const isLocalRuntime = input.nodeEnv === "development" || input.nodeEnv === "test";

  if (enabled === false) return { allowed: false, reason: "disabled" };
  if (target === "production") return { allowed: false, reason: "production_forbidden" };

  if (isLocalRuntime && (target === undefined || target === "" || target === "local")) {
    return { allowed: true, reason: "local_default" };
  }

  if (input.nodeEnv === "production" && (target === "staging" || target === "production-canary")) {
    if (enabled !== true) return { allowed: false, reason: "disabled" };
    const allowlist = parseAllowlist(input.allowlist);
    if (allowlist.size === 0) return { allowed: false, reason: "allowlist_required" };
    if (allowlist.has(input.user.id.trim().toLowerCase())) {
      return {
        allowed: true,
        reason: target === "production-canary" ? "allowlisted_production_canary" : "allowlisted_staging",
      };
    }
    return { allowed: false, reason: "not_allowlisted" };
  }

  return { allowed: false, reason: "unknown_environment" };
}
