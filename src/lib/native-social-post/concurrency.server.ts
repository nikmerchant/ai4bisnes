import "server-only";

const globalLocks = globalThis as typeof globalThis & {
  __ai4bNativeSocialPostLocks?: Set<string>;
};

const locks = globalLocks.__ai4bNativeSocialPostLocks ?? new Set<string>();
globalLocks.__ai4bNativeSocialPostLocks = locks;

export class NativeSocialPostBusyError extends Error {
  constructor() {
    super("native_social_post_busy");
  }
}

export async function withNativeSocialPostUserLock<T>(
  userId: string,
  task: () => Promise<T>
): Promise<T> {
  if (locks.has(userId)) throw new NativeSocialPostBusyError();
  locks.add(userId);
  try {
    return await task();
  } finally {
    locks.delete(userId);
  }
}
