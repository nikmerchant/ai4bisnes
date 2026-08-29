import "server-only";

import { resolveSlice3Access } from "./access-policy";

type Slice3User = { id: string; email?: string | null };

export function currentSlice3Access(user: Slice3User) {
  return resolveSlice3Access({
    nodeEnv: process.env.NODE_ENV,
    deploymentTarget: process.env.AI4B_DEPLOYMENT_TARGET,
    enabled: process.env.AI4B_SLICE3_ENABLED,
    allowlist: process.env.AI4B_SLICE3_ALLOWLIST ?? process.env.AI4B_SLICE1_ALLOWLIST,
    user,
  });
}
