import "server-only";

const locks = new Map<string, Promise<void>>();
export class PerformanceLearningBusyError extends Error { constructor() { super("performance_learning_user_busy"); } }

export async function withPerformanceLearningUserLock<T>(userId: string, work: () => Promise<T>) {
  if (locks.has(userId)) throw new PerformanceLearningBusyError();
  let release!: () => void;
  const lock = new Promise<void>((resolve) => { release = resolve; });
  locks.set(userId, lock);
  try { return await work(); }
  finally { release(); if (locks.get(userId) === lock) locks.delete(userId); }
}
