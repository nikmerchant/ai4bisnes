import "server-only";
import { resolveContentCreateAccess } from "./access-policy";

export function currentContentCreateAccess(user: { id: string; email?: string | null }) {
  return resolveContentCreateAccess({
    nodeEnv: process.env.NODE_ENV,
    deploymentTarget: process.env.AI4B_DEPLOYMENT_TARGET,
    enabled: process.env.AI4B_CONTENT_CREATE_ENABLED,
    allowlist: process.env.AI4B_CONTENT_CREATE_ALLOWLIST
      ?? process.env.AI4B_CONTENT_REVIEW_ALLOWLIST
      ?? process.env.AI4B_SLICE1_ALLOWLIST,
    user,
  });
}
