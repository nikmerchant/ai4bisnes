import "server-only";
import { resolveVisualPackagingAccess } from "./access-policy";

export function currentVisualPackagingAccess(user: { id: string; email?: string | null }) {
  return resolveVisualPackagingAccess({
    nodeEnv: process.env.NODE_ENV,
    deploymentTarget: process.env.AI4B_DEPLOYMENT_TARGET,
    enabled: process.env.AI4B_VISUAL_PACKAGING_ENABLED,
    allowlist: process.env.AI4B_VISUAL_PACKAGING_ALLOWLIST
      ?? process.env.AI4B_CONTENT_CREATE_ALLOWLIST
      ?? process.env.AI4B_CONTENT_REVIEW_ALLOWLIST
      ?? process.env.AI4B_SLICE1_ALLOWLIST,
    user,
  });
}
