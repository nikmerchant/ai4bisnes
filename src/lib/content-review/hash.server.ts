import "server-only";
import { normalizeSourceText } from "./domain";
import { sha256Hex } from "./hash";

export function sha256NormalizedSourceText(sourceText: string) {
  return sha256Hex(normalizeSourceText(sourceText));
}
