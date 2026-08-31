import "server-only";

const locks = new Map<string, Promise<void>>();

export class ContentCreateBusyError extends Error {
  constructor() {
    super("content_create_user_busy");
  }
}

export async function withContentCreateUserLock<T>(userId: string, work: () => Promise<T>) {
  if (locks.has(userId)) throw new ContentCreateBusyError();
  let release!: () => void;
  const lock = new Promise<void>((resolve) => { release = resolve; });
  locks.set(userId, lock);
  try {
    return await work();
  } finally {
    release();
    if (locks.get(userId) === lock) locks.delete(userId);
  }
}
