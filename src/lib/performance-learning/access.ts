import "server-only";
import { resolvePerformanceLearningAccess } from "./access-policy";

export function currentPerformanceLearningAccess(user: { id: string; email?: string | null }) {
  return resolvePerformanceLearningAccess({
    nodeEnv: process.env.NODE_ENV,
    deploymentTarget: process.env.AI4B_DEPLOYMENT_TARGET,
    enabled: process.env.AI4B_PERFORMANCE_LEARNING_ENABLED,
    allowlist: process.env.AI4B_PERFORMANCE_LEARNING_ALLOWLIST
      ?? process.env.AI4B_VISUAL_PACKAGING_ALLOWLIST
      ?? process.env.AI4B_CONTENT_CREATE_ALLOWLIST
      ?? process.env.AI4B_CONTENT_REVIEW_ALLOWLIST
      ?? process.env.AI4B_SLICE1_ALLOWLIST,
    user,
  });
}
