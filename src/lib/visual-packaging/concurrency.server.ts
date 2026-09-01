import "server-only";

const locks = new Map<string, Promise<void>>();
export class VisualPackagingBusyError extends Error { constructor() { super("visual_packaging_user_busy"); } }

export async function withVisualPackagingUserLock<T>(userId: string, work: () => Promise<T>) {
  if (locks.has(userId)) throw new VisualPackagingBusyError();
  let release!: () => void;
  const lock = new Promise<void>((resolve) => { release = resolve; });
  locks.set(userId, lock);
  try { return await work(); }
  finally { release(); if (locks.get(userId) === lock) locks.delete(userId); }
}
