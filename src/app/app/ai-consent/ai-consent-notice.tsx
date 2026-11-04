"use client";

import Link from "next/link";
import { useState } from "react";

export function AiConsentNotice({ onConsented }: { onConsented: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function agree() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/app/ai-consent/api", { method: "POST" });
      if (!response.ok) throw new Error("consent_failed");
      onConsented();
    } catch {
      setError("Persetujuan tidak dapat direkod. Cuba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-900 dark:bg-violet-950">
      <p className="font-bold">Persetujuan penjanaan AI</p>
      <p className="mt-1 text-neutral-600 dark:text-neutral-300">
        Untuk draf yang dijana oleh AI, profil perniagaan dan arahan anda akan dihantar kepada penyedia AI kami,
        DeepSeek, yang memproses data di China. Jangan masukkan data peribadi sensitif. Butiran dalam{" "}
        <Link href="/privasi" className="text-violet-600 underline">Dasar Privasi</Link>.
      </p>
      {error && <p className="mt-2 text-red-600">{error}</p>}
      <button type="button" disabled={busy} onClick={agree} className="mt-3 min-h-11 rounded-lg bg-violet-600 px-4 py-2 font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50">
        {busy ? "Merekod…" : "Saya setuju"}
      </button>
    </div>
  );
}
