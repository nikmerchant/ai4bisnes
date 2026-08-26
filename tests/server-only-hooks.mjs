// Resolve hook untuk ujian node --test:
// 1. "server-only"/"client-only" → stub kosong (biasanya disediakan Next.js).
// 2. Import relatif tanpa ekstensi (gaya bundler, cth "./domain") → cuba .ts
//    relatif kepada parentURL, meniru resolusi TypeScript/Next.
import {} from "node:url";

const STUB_URL = new URL("./server-only-stub.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only" || specifier === "client-only") {
    return { url: STUB_URL, shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) {
      try {
        return await nextResolve(`${specifier}.ts`, context);
      } catch {
        // biar ralat asal tersebar
      }
    }
    throw error;
  }
}


