"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { renderVisualPackagingPlan, type ApprovedContentCreateSnapshotV1, type CoverDirectionV1, type GenerationTelemetry, type VisualPackagingArtifactV1, type VisualPackagingRequestV1 } from "@/lib/visual-packaging/domain";

export type VisualPlanInitial = { id: number; artifact: VisualPackagingArtifactV1; request: VisualPackagingRequestV1; telemetry: GenerationTelemetry; sourceText: string } | null;
type ApiResponse = { artifactId?: number; artifact?: VisualPackagingArtifactV1; telemetry?: GenerationTelemetry; warning?: string | null; error?: string };
const inputClass = "min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const panelClass = "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";

async function copyTextSafely(value: string) {
  try { await navigator.clipboard.writeText(value); return true; }
  catch {
    try { const area = document.createElement("textarea"); area.value = value; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); const copied = document.execCommand("copy"); area.remove(); return copied; }
    catch { return false; }
  }
}

function CoverEditor({ value, onChange }: { value: CoverDirectionV1; onChange: (value: CoverDirectionV1) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="grid gap-1 text-sm font-bold">Focal point<textarea className={inputClass} rows={3} maxLength={500} value={value.focalPoint} onChange={(event) => onChange({ ...value, focalPoint: event.target.value })} /></label>
    <label className="grid gap-1 text-sm font-bold">Overlay ≤6 perkataan<input className={inputClass} maxLength={120} value={value.textOverlay} onChange={(event) => onChange({ ...value, textOverlay: event.target.value })} /></label>
    <label className="grid gap-1 text-sm font-bold">Hierarchy<textarea className={inputClass} rows={2} maxLength={500} value={value.hierarchy} onChange={(event) => onChange({ ...value, hierarchy: event.target.value })} /></label>
    <label className="grid gap-1 text-sm font-bold">Emotion<textarea className={inputClass} rows={2} maxLength={500} value={value.emotion} onChange={(event) => onChange({ ...value, emotion: event.target.value })} /></label>
    <label className="grid gap-1 text-sm font-bold">Background<textarea className={inputClass} rows={2} maxLength={500} value={value.background} onChange={(event) => onChange({ ...value, background: event.target.value })} /></label>
    <label className="grid gap-1 text-sm font-bold">Neutral brand cue<textarea className={inputClass} rows={2} maxLength={500} value={value.brandCue} onChange={(event) => onChange({ ...value, brandCue: event.target.value })} /></label>
    <label className="grid gap-1 text-sm font-bold sm:col-span-2">Mobile readability<textarea className={inputClass} rows={2} maxLength={500} value={value.mobileReadabilityCheck} onChange={(event) => onChange({ ...value, mobileReadabilityCheck: event.target.value })} /></label>
  </div>;
}

export function VisualPlanClient({ source, initial, initialRequest }: { source: ApprovedContentCreateSnapshotV1; initial: VisualPlanInitial; initialRequest?: VisualPackagingRequestV1 }) {
  const [request, setRequest] = useState(initial?.request ?? initialRequest ?? { entry: "from_content_create", sourceContentCreateId: source.id, format: "short_video", packagingIntent: "attention", productionConstraints: "" });
  const [artifactId, setArtifactId] = useState<number | null>(initial?.id ?? null);
  const [artifact, setArtifact] = useState<VisualPackagingArtifactV1 | null>(initial?.artifact ?? null);
  const [telemetry, setTelemetry] = useState<GenerationTelemetry | null>(initial?.telemetry ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState(initial ? "Visual plan dibuka." : "Approved TikTok Content milik anda dimuat sebagai sumber protected.");
  const [busy, setBusy] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);
  const requestId = useRef<string | null>(null);
  const mutationRequestId = useRef<string | null>(null);

  function edit(next: VisualPackagingArtifactV1) { setArtifact(next); setHasEdits(true); }
  function updatePackaging(key: keyof VisualPackagingArtifactV1["packaging"], value: string | string[]) {
    if (!artifact) return;
    const packaging = { ...artifact.packaging, [key]: value };
    if (key === "championTitle" && typeof value === "string") packaging.titleOptions = [value, ...artifact.packaging.titleOptions.slice(1)];
    edit({ ...artifact, packaging });
  }
  function updateCover(coverDirection: CoverDirectionV1) {
    if (!artifact || artifact.formatPlan.format === "static_post") return;
    edit({ ...artifact, formatPlan: { ...artifact.formatPlan, coverDirection } });
  }
  function updateBeatDirection(index: number, visualDirection: string) {
    if (!artifact || artifact.formatPlan.format !== "short_video") return;
    const visualBeats = artifact.formatPlan.visualBeats.map((item, current) => current === index ? { ...item, visualDirection } : item);
    edit({ ...artifact, formatPlan: { ...artifact.formatPlan, visualBeats, firstFrame: visualBeats[0] } });
  }
  function updateCanvas(key: "focalPoint" | "textOverlay" | "hierarchy" | "background", value: string) {
    if (!artifact || artifact.formatPlan.format !== "static_post") return;
    edit({ ...artifact, formatPlan: { ...artifact.formatPlan, canvasDirection: { ...artifact.formatPlan.canvasDirection, [key]: value } } });
  }
  function updateSlide(index: number, key: "heading" | "bodyDirection", value: string) {
    if (!artifact || artifact.formatPlan.format !== "carousel") return;
    const slides = artifact.formatPlan.slides.map((item, current) => current === index ? { ...item, [key]: value } : item);
    edit({ ...artifact, formatPlan: { ...artifact.formatPlan, slides } });
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("Membina visual plan deterministic…"); setWarning(null); requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/app/visual-plan/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: requestId.current, ...request }) });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.artifact || !data.artifactId || !data.telemetry) throw new Error(data.error || "Visual plan tidak dapat dibina.");
      setArtifactId(data.artifactId); setArtifact(data.artifact); setTelemetry(data.telemetry); setWarning(data.warning || null); setHasEdits(false); setMessage("Visual plan disimpan sebagai DRAF."); requestId.current = null;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka."); }
    finally { setBusy(false); }
  }

  async function mutate(action: "save" | "approve" | "reopen", copyAfter = false) {
    if (!artifact || !artifactId) return;
    setBusy(true); setMessage(action === "approve" ? "Meluluskan visual plan…" : action === "reopen" ? "Membuka revision DRAF baharu…" : "Menyimpan perubahan…"); mutationRequestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch(`/app/visual-plan/api/${artifactId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, requestId: mutationRequestId.current, packaging: artifact.packaging, formatPlan: artifact.formatPlan }) });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.artifact || !data.artifactId) throw new Error(data.error || "Artifact tidak dapat disimpan.");
      setArtifactId(data.artifactId); setArtifact(data.artifact); setTelemetry(data.telemetry || telemetry); setHasEdits(false); mutationRequestId.current = null;
      if (copyAfter) { const copied = await copyTextSafely(renderVisualPackagingPlan(data.artifact)); setMessage(copied ? "Visual plan diluluskan dan safe-copy disalin." : "Visual plan diluluskan. Salinan automatik disekat pelayar."); }
      else if (action === "reopen") setMessage(`Revision ${data.artifact.revision} dibuka sebagai DRAF baharu; approval lama kekal immutable.`);
      else setMessage("Perubahan disimpan sebagai DRAF.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka."); }
    finally { setBusy(false); }
  }

  async function copyCurrent() { if (artifact) setMessage(await copyTextSafely(renderVisualPackagingPlan(artifact)) ? "Arahan produksi disalin." : "Salinan disekat pelayar."); }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
    <div className="space-y-6">
      <form onSubmit={generate} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Sumber protected · Approved TikTok Content #{source.id}</p><h2 className="mt-1 text-xl font-bold">{source.draft.hook}</h2><p className="mt-1 text-sm text-neutral-500">{source.audience} · Content R{source.draft.revision}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">Format<select className={inputClass} value={request.format} onChange={(event) => setRequest((current) => ({ ...current, format: event.target.value as VisualPackagingRequestV1["format"] }))}><option value="short_video">Short video</option><option value="static_post">Static post</option><option value="carousel">Carousel</option></select></label>
          <label className="grid gap-1 text-sm font-medium">Packaging intent<select className={inputClass} value={request.packagingIntent} onChange={(event) => setRequest((current) => ({ ...current, packagingIntent: event.target.value as VisualPackagingRequestV1["packagingIntent"] }))}><option value="attention">Attention</option><option value="authority">Authority</option><option value="search">Search</option><option value="conversion">Conversion</option></select></label>
        </div>
        <details className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"><summary className="cursor-pointer font-bold">Lebih Kawalan</summary><label className="mt-4 grid gap-1 text-sm font-medium">Kekangan produksi pemilik (pilihan)<textarea className={inputClass} rows={3} maxLength={500} value={request.productionConstraints} onChange={(event) => setRequest((current) => ({ ...current, productionConstraints: event.target.value }))} /><span className="text-right text-xs text-neutral-500 tabular-nums">{request.productionConstraints.length}/500</span></label><p className="mt-2 text-xs text-neutral-500">Input tidak dipercayai; ia tidak boleh mencipta bukti, claim atau aset.</p></details>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-neutral-500">Cap: 20/jam · 100/bulan · provider/media OFF</p><button disabled={busy} className="min-h-11 rounded-lg bg-violet-600 px-5 py-2.5 font-bold text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Membina…" : "Bina Visual Plan"}</button></div>
      </form>

      <div aria-live="polite" className="space-y-2">{message && <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{message}</p>}{warning && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{warning}</p>}</div>

      {artifact && <section className="space-y-5 rounded-2xl border-2 border-violet-300 bg-violet-50/40 p-5 dark:border-violet-900 dark:bg-violet-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-violet-600">Packaging → Production direction</p><h2 className="text-xl font-bold">Bina Visual Plan</h2></div><span className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${artifact.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"}`}>{artifact.status === "approved" ? "DILULUSKAN" : "DRAF"} · R{artifact.revision}</span></div>
        {artifact.status === "approved" && hasEdits && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Edit akan menjadi revision DRAF baharu; row diluluskan tidak dimutasi.</p>}
        <div className={panelClass}><h3 className="font-bold">Packaging bersama</h3><div className="mt-3 grid gap-3"><label className="grid gap-1 text-sm font-bold">Champion title<input className={inputClass} maxLength={120} value={artifact.packaging.championTitle} onChange={(event) => updatePackaging("championTitle", event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Audience fit<textarea className={inputClass} rows={2} maxLength={500} value={artifact.packaging.audienceFit} onChange={(event) => updatePackaging("audienceFit", event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Expectation accuracy<textarea className={inputClass} rows={2} maxLength={500} value={artifact.packaging.expectationAccuracy} onChange={(event) => updatePackaging("expectationAccuracy", event.target.value)} /></label><p className="rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950"><strong>Promise ceiling:</strong> {artifact.packaging.promiseCeiling}</p></div></div>

        {artifact.formatPlan.format === "short_video" && <div className={panelClass}><h3 className="font-bold">Pelan short video</h3><div className="mt-3 space-y-4"><CoverEditor value={artifact.formatPlan.coverDirection} onChange={updateCover} />{artifact.formatPlan.visualBeats.map((beat, index) => <div key={beat.beatNumber} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"><p className="text-xs font-bold uppercase tabular-nums">Beat {beat.beatNumber} · {beat.purpose} · {beat.proofSource}</p><textarea className={`${inputClass} mt-2 w-full`} rows={2} maxLength={500} value={beat.visualDirection} onChange={(event) => updateBeatDirection(index, event.target.value)} /></div>)}</div></div>}

        {artifact.formatPlan.format === "static_post" && <div className={panelClass}><h3 className="font-bold">Pelan static post</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Focal point<textarea className={inputClass} rows={3} maxLength={500} value={artifact.formatPlan.canvasDirection.focalPoint} onChange={(event) => updateCanvas("focalPoint", event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Overlay ≤6 perkataan<input className={inputClass} maxLength={120} value={artifact.formatPlan.canvasDirection.textOverlay} onChange={(event) => updateCanvas("textOverlay", event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Hierarchy<textarea className={inputClass} rows={2} maxLength={500} value={artifact.formatPlan.canvasDirection.hierarchy} onChange={(event) => updateCanvas("hierarchy", event.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Background<textarea className={inputClass} rows={2} maxLength={500} value={artifact.formatPlan.canvasDirection.background} onChange={(event) => updateCanvas("background", event.target.value)} /></label><p className="text-sm sm:col-span-2"><strong>Proof:</strong> {artifact.formatPlan.canvasDirection.proofSource} · {artifact.formatPlan.accessibilityAltTextDirection}</p></div></div>}

        {artifact.formatPlan.format === "carousel" && <div className={panelClass}><h3 className="font-bold">Pelan carousel</h3><div className="mt-3 space-y-4"><CoverEditor value={artifact.formatPlan.coverDirection} onChange={updateCover} />{artifact.formatPlan.slides.map((slide, index) => <div key={slide.slideNumber} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"><p className="text-xs font-bold uppercase tabular-nums">Slide {slide.slideNumber} · {slide.purpose} · {slide.proofSource}</p><input className={`${inputClass} mt-2 w-full`} maxLength={80} value={slide.heading} onChange={(event) => updateSlide(index, "heading", event.target.value)} /><textarea className={`${inputClass} mt-2 w-full`} rows={2} maxLength={300} value={slide.bodyDirection} onChange={(event) => updateSlide(index, "bodyDirection", event.target.value)} /></div>)}</div></div>}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"><h3 className="font-bold">Keselamatan visual</h3><p className="mt-2 text-sm"><strong>Promise ceiling:</strong> {artifact.safety.promiseCeiling}</p>{artifact.safety.unsupportedVisualClaims.length ? <ul className="mt-2 space-y-2 text-sm">{artifact.safety.unsupportedVisualClaims.map((item, index) => <li key={`${item.action}-${index}`}><strong>{item.action}:</strong> {item.claim} — {item.reason}</li>)}</ul> : <p className="mt-2 text-sm">Tiada claim visual tambahan.</p>}<p className="mt-2 text-xs text-neutral-500">Elak: {artifact.safety.aiClichesAvoided.join(", ")}</p></div>
        <div className="flex flex-wrap justify-end gap-2">{artifactId && <Link href={`/app/visual-plan/${artifactId}`} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium dark:border-zinc-700">Pautan buka semula</Link>}<button type="button" disabled={busy} onClick={copyCurrent} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Salin arahan</button>{artifact.status === "approved" ? <button type="button" disabled={busy} onClick={() => mutate("reopen")} className="min-h-11 rounded-lg border border-amber-400 px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-300">Buka semula sebagai Draf</button> : <><button type="button" disabled={busy} onClick={() => mutate("save")} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Simpan Draf</button><button type="button" disabled={busy} onClick={() => mutate("approve", true)} className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Lulus & Salin</button></>}</div>
      </section>}
    </div>
    <aside className="space-y-4"><section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"><h2 className="text-sm font-bold">Approved Content protected</h2><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-neutral-500">Audience</dt><dd>{source.audience}</dd></div><div><dt className="text-xs text-neutral-500">Tesis</dt><dd>{source.coreThesis}</dd></div><div><dt className="text-xs text-neutral-500">CTA</dt><dd>{source.callToAction}</dd></div></dl></section>{telemetry && <section className="rounded-2xl border border-zinc-200 p-4 text-xs dark:border-zinc-800"><h2 className="text-sm font-bold">Generation evidence</h2><dl className="mt-3 space-y-2 text-neutral-500"><div className="flex justify-between"><dt>Mode</dt><dd>{telemetry.mode}</dd></div><div className="flex justify-between"><dt>Model</dt><dd>{telemetry.model}</dd></div><div className="flex justify-between"><dt>Kos</dt><dd>{telemetry.estimatedCostRm === null ? "TBD" : `RM${telemetry.estimatedCostRm.toFixed(4)}`}</dd></div></dl></section>}<p className="rounded-xl bg-zinc-100 p-3 text-xs text-neutral-500 dark:bg-zinc-900">Tiada penjanaan media, upload, render, publish, schedule atau send. Output ialah production direction sahaja.</p></aside>
  </div>;
}
