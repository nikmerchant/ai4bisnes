import "server-only";

import { resolveSlice2Access } from "./access-policy";

type Slice2User = { id: string; email?: string | null };

export function currentSlice2Access(user: Slice2User) {
  return resolveSlice2Access({
    nodeEnv: process.env.NODE_ENV,
    deploymentTarget: process.env.AI4B_DEPLOYMENT_TARGET,
    enabled: process.env.AI4B_SLICE2_ENABLED,
    allowlist: process.env.AI4B_SLICE2_ALLOWLIST ?? process.env.AI4B_SLICE1_ALLOWLIST,
    user,
  });
}
