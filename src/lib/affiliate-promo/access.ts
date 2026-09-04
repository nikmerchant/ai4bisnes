import "server-only";
import { resolveAffiliatePromoAccess } from "./access-policy";

export function currentAffiliatePromoAccess(user: { id: string; email?: string | null }) {
  return resolveAffiliatePromoAccess({
    nodeEnv: process.env.NODE_ENV,
    deploymentTarget: process.env.AI4B_DEPLOYMENT_TARGET,
    enabled: process.env.AI4B_AFFILIATE_PROMO_ENABLED,
    allowlist: process.env.AI4B_AFFILIATE_PROMO_ALLOWLIST
      ?? process.env.AI4B_WORKSPACE_ALLOWLIST,
    user,
  });
}
