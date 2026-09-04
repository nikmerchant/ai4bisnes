import "server-only";

const locks = new Map<string, Promise<void>>();
export class AffiliatePromoBusyError extends Error { constructor() { super("affiliate_promo_user_busy"); } }

export async function withAffiliatePromoUserLock<T>(userId: string, work: () => Promise<T>) {
  if (locks.has(userId)) throw new AffiliatePromoBusyError();
  let release!: () => void;
  const lock = new Promise<void>((resolve) => { release = resolve; });
  locks.set(userId, lock);
  try { return await work(); }
  finally { release(); if (locks.get(userId) === lock) locks.delete(userId); }
}
