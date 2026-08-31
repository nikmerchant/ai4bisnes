import "server-only";
import { resolveContentReviewAccess } from "./access-policy";

export function currentContentReviewAccess(user: { id: string; email?: string | null }) {
  return resolveContentReviewAccess({
    nodeEnv: process.env.NODE_ENV,
    deploymentTarget: process.env.AI4B_DEPLOYMENT_TARGET,
    enabled: process.env.AI4B_CONTENT_REVIEW_ENABLED,
    allowlist: process.env.AI4B_CONTENT_REVIEW_ALLOWLIST ?? process.env.AI4B_SLICE1_ALLOWLIST,
    user,
  });
}
