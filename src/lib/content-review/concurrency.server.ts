import "server-only";

const locks = new Map<string, Promise<void>>();
export class ContentReviewBusyError extends Error { constructor() { super("content_review_user_busy"); } }

export async function withContentReviewUserLock<T>(userId: string, work: () => Promise<T>) {
  if (locks.has(userId)) throw new ContentReviewBusyError();
  let release!: () => void;
  const lock = new Promise<void>((resolve) => { release = resolve; });
  locks.set(userId, lock);
  try { return await work(); }
  finally { release(); if (locks.get(userId) === lock) locks.delete(userId); }
}
