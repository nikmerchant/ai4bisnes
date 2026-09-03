import "server-only";
import { resolveWorkspaceAccess } from "./access-policy";

export function currentWorkspaceAccess(user: { id: string; email?: string | null }) {
  return resolveWorkspaceAccess({
    nodeEnv: process.env.NODE_ENV,
    deploymentTarget: process.env.AI4B_DEPLOYMENT_TARGET,
    enabled: process.env.AI4B_WORKSPACE_ENABLED,
    allowlist: process.env.AI4B_WORKSPACE_ALLOWLIST
      ?? process.env.AI4B_PERFORMANCE_LEARNING_ALLOWLIST
      ?? process.env.AI4B_VISUAL_PACKAGING_ALLOWLIST
      ?? process.env.AI4B_CONTENT_CREATE_ALLOWLIST
      ?? process.env.AI4B_CONTENT_REVIEW_ALLOWLIST
      ?? process.env.AI4B_SLICE1_ALLOWLIST,
    user,
  });
}
