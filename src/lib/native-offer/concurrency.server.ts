import "server-only";

const globalLocks = globalThis as typeof globalThis & {
  __ai4bNativeOfferLocks?: Set<string>;
};

const locks = globalLocks.__ai4bNativeOfferLocks ?? new Set<string>();
globalLocks.__ai4bNativeOfferLocks = locks;

export class NativeOfferBusyError extends Error {
  constructor() {
    super("native_offer_busy");
  }
}

export async function withNativeOfferUserLock<T>(
  userId: string,
  task: () => Promise<T>
): Promise<T> {
  if (locks.has(userId)) throw new NativeOfferBusyError();
  locks.add(userId);
  try {
    return await task();
  } finally {
    locks.delete(userId);
  }
}
