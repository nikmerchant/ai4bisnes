"use client";

import { useLinkStatus } from "next/link";

// Diletak sebagai anak <Link> — Next.js isi status pending secara automatik
// semasa navigasi sedang berlaku, walaupun sekejap sahaja.
export function CtaSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]"
    />
  );
}
