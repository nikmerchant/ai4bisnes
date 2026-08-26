import "server-only";

import { resolveSlice1Access } from "./access-policy";

type Slice1User = { id: string; email?: string | null };

export function currentSlice1Access(user: Slice1User) {
  return resolveSlice1Access({
    nodeEnv: process.env.NODE_ENV,
    deploymentTarget: process.env.AI4B_DEPLOYMENT_TARGET,
    enabled: process.env.AI4B_SLICE1_ENABLED,
    allowlist: process.env.AI4B_SLICE1_ALLOWLIST,
    user,
  });
}
