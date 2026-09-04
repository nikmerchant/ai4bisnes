"use client";

import { useRef, useState } from "react";
import type { AffiliatePromoArtifact, AffiliatePromoRequest, AffiliatePromoVariant } from "@/lib/affiliate-promo/domain";
import type { GenerationTelemetry } from "@/lib/native-social-post/domain";

type FormRequest = Omit<AffiliatePromoRequest, "referralCode">;
type ApiResponse = { artifactId?: number; artifact?: AffiliatePromoArtifact; telemetry?: GenerationTelemetry; warning?: string | null; error?: string };
const inputClass = "min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const ANGLES = [
  ["blank_page", "Tak tahu nak mula"], ["generic_ai", "Jawapan AI generic"], ["prompt_320", "320 prompt BM"], ["auto_isi", "Profil auto-isi"], ["kalendar_30hari", "Kalendar 30 hari"], ["jimat_konsultan", "Jimat kos konsultan"], ["usahawan_biasa", "AI untuk usahawan biasa"],
] as const;
const NICHES = [["fnb", "F&B"], ["retail", "Retail"], ["ecommerce", "E-dagang"], ["servis", "Servis"], ["kontraktor", "Kontraktor"], ["umum", "Umum"]] as const;
const TONES = [["mesra", "Mesra"], ["profesional", "Profesional"], ["lucu", "Santai/lucu"], ["bernas", "Bernas"]] as const;

async function copyTextSafely(value: string) {
  try { await navigator.clipboard.writeText(value); return true; }
  catch {
    try { const area = document.createElement("textarea"); area.value = value; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); const copied = document.execCommand("copy"); area.remove(); return copied; }
    catch { return false; }
  }
}

function variantText(variant: AffiliatePromoVariant, artifact: AffiliatePromoArtifact) {
  return `${variant.hook}\n${variant.body}\n${variant.callToAction}\n${artifact.referralLink}\n${variant.hashtags.join(" ")}\n${artifact.disclosure}`;
}

export function AffiliatePromoClient({ referralLink }: { referralLink: string }) {
  const [request, setRequest] = useState<FormRequest>({ platform: "tiktok", angle: "blank_page", niche: "umum", tone: "mesra", personalNote: null });
  const [artifactId, setArtifactId] = useState<number | null>(null);
  const [artifact, setArtifact] = useState<AffiliatePromoArtifact | null>(null);
  const [telemetry, setTelemetry] = useState<GenerationTelemetry | null>(null);
  const [message, setMessage] = useState("Pilih konteks promosi untuk mula.");
  const [busy, setBusy] = useState(false);
  const requestId = useRef<string | null>(null);
  const mutationRequestId = useRef<string | null>(null);

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("Membina dua varian deterministic…"); requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/app/affiliate-promo/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: requestId.current, ...request }) });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.artifact || !data.artifactId) throw new Error(data.error || "Promosi tidak dapat dibina.");
      setArtifactId(data.artifactId); setArtifact(data.artifact); setTelemetry(data.telemetry ?? null); setMessage("Dua varian disimpan sebagai DRAF."); requestId.current = null;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka."); }
    finally { setBusy(false); }
  }

  async function mutate(action: "save" | "approve" | "reopen") {
    if (!artifact || !artifactId) return;
    setBusy(true); mutationRequestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch(`/app/affiliate-promo/api/${artifactId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, requestId: mutationRequestId.current, variants: artifact.variants }) });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.artifact || !data.artifactId) throw new Error(data.error || "Artifact tidak dapat disimpan.");
      setArtifactId(data.artifactId); setArtifact(data.artifact); mutationRequestId.current = null;
      if (action === "approve") {
        const copied = await copyTextSafely(variantText(data.artifact.variants[0], data.artifact));
        setMessage(copied ? "Diluluskan. Varian A disalin bersama referral dan disclosure." : "Diluluskan; salinan automatik disekat pelayar.");
      } else if (action === "reopen") setMessage(`Revision ${data.artifact.revision} dibuka sebagai DRAF baharu.`);
      else setMessage("Perubahan disimpan sebagai DRAF.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka."); }
    finally { setBusy(false); }
  }

  function updateVariant(index: number, key: "hook" | "body" | "callToAction", value: string) {
    if (!artifact || artifact.status === "approved") return;
    setArtifact({ ...artifact, variants: artifact.variants.map((variant, current) => current === index ? { ...variant, [key]: value } : variant) });
  }

  async function copyVariant(index: number) {
    if (!artifact) return;
    setMessage(await copyTextSafely(variantText(artifact.variants[index], artifact)) ? `Varian ${index === 0 ? "A" : "B"} disalin lengkap.` : "Salinan disekat pelayar.");
  }

  return <div className="space-y-6">
    <form onSubmit={generate} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium">Platform<select className={inputClass} value={request.platform} onChange={(event) => setRequest((current) => ({ ...current, platform: event.target.value as FormRequest["platform"] }))}><option value="tiktok">TikTok</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></label>
        <label className="grid gap-1 text-sm font-medium">Angle<select className={inputClass} value={request.angle} onChange={(event) => setRequest((current) => ({ ...current, angle: event.target.value as FormRequest["angle"] }))}>{ANGLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Niche<select className={inputClass} value={request.niche} onChange={(event) => setRequest((current) => ({ ...current, niche: event.target.value as FormRequest["niche"] }))}>{NICHES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Nada<select className={inputClass} value={request.tone} onChange={(event) => setRequest((current) => ({ ...current, tone: event.target.value as FormRequest["tone"] }))}>{TONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <label className="grid gap-1 text-sm font-medium">Nota untuk rujukan sahaja (pilihan)<textarea className={inputClass} rows={3} maxLength={200} value={request.personalNote ?? ""} onChange={(event) => setRequest((current) => ({ ...current, personalNote: event.target.value || null }))} /><span className="flex justify-between gap-3 text-xs font-normal text-neutral-500"><span>Disimpan bersama draf, tetapi tidak dimasukkan ke ayat promosi v1.</span><span className="tabular-nums">{request.personalNote?.length ?? 0}/200</span></span></label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="break-all text-xs text-neutral-500">Referral protected: {referralLink}</p><p className="text-xs text-neutral-500">Cap 5/hari · 30/bulan · 2 varian · provider/publish OFF</p></div><button disabled={busy} className="min-h-11 rounded-lg bg-violet-600 px-5 py-2.5 font-bold text-white disabled:opacity-50">{busy ? "Membina…" : "Bina Promosi"}</button></div>
    </form>

    <p aria-live="polite" className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{message}</p>

    {artifact && <section className="space-y-5 rounded-2xl border-2 border-violet-300 bg-violet-50/40 p-5 dark:border-violet-900 dark:bg-violet-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Dua varian siap salin</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${artifact.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{artifact.status === "approved" ? "DILULUSKAN" : "DRAF"} · R{artifact.revision}</span></div>
      <div className="grid gap-4 lg:grid-cols-2">{artifact.variants.map((variant, index) => <article key={index} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"><h3 className="font-bold">Varian {index === 0 ? "A" : "B"}</h3><label className="grid gap-1 text-xs font-bold">Hook<textarea disabled={artifact.status === "approved"} className={inputClass} rows={2} maxLength={2000} value={variant.hook} onChange={(event) => updateVariant(index, "hook", event.target.value)} /></label><label className="grid gap-1 text-xs font-bold">Isi<textarea disabled={artifact.status === "approved"} className={inputClass} rows={6} maxLength={2000} value={variant.body} onChange={(event) => updateVariant(index, "body", event.target.value)} /></label><label className="grid gap-1 text-xs font-bold">CTA<textarea disabled={artifact.status === "approved"} className={inputClass} rows={2} maxLength={2000} value={variant.callToAction} onChange={(event) => updateVariant(index, "callToAction", event.target.value)} /></label>{variant.audioSuggestion && <p className="text-xs text-neutral-500"><strong>Audio:</strong> {variant.audioSuggestion}</p>}<p className="text-sm">{variant.hashtags.join(" ")}</p><p className="break-all text-sm font-medium">{artifact.referralLink}</p><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{artifact.disclosure}</p><button type="button" onClick={() => copyVariant(index)} className="min-h-11 w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-bold dark:border-zinc-700">Salin Varian {index === 0 ? "A" : "B"}</button></article>)}</div>
      <div className="flex flex-wrap justify-end gap-2">{artifact.status === "approved" ? <button type="button" disabled={busy} onClick={() => mutate("reopen")} className="min-h-11 rounded-lg border border-amber-400 px-4 py-2.5 text-sm font-bold text-amber-700">Buka Semula sebagai Draf</button> : <><button type="button" disabled={busy} onClick={() => mutate("save")} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Simpan Draf</button><button type="button" disabled={busy} onClick={() => mutate("approve")} className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Lulus & Salin A</button></>}</div>
      {telemetry && <p className="text-xs text-neutral-500">Generation: {telemetry.model} · RM0 · tiada provider call</p>}
    </section>}
  </div>;
}
