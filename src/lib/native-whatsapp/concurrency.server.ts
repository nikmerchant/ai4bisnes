import "server-only";

const globalLocks = globalThis as typeof globalThis & {
  __ai4bNativeWhatsAppLocks?: Set<string>;
};

const locks = globalLocks.__ai4bNativeWhatsAppLocks ?? new Set<string>();
globalLocks.__ai4bNativeWhatsAppLocks = locks;

export class NativeWhatsAppBusyError extends Error {
  constructor() {
    super("native_whatsapp_busy");
  }
}

export async function withNativeWhatsAppUserLock<T>(
  userId: string,
  task: () => Promise<T>
): Promise<T> {
  if (locks.has(userId)) throw new NativeWhatsAppBusyError();
  locks.add(userId);
  try {
    return await task();
  } finally {
    locks.delete(userId);
  }
}
