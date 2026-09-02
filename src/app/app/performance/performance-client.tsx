"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { renderPerformanceLearningReport, type ApprovedPerformanceSourceSnapshotV1, type GenerationTelemetry, type PerformanceLearningArtifactV1, type PerformanceLearningMetricName, type PerformanceLearningRequestV1 } from "@/lib/performance-learning/domain";

export type PerformanceInitial = { id: number; artifact: PerformanceLearningArtifactV1; request: PerformanceLearningRequestV1; telemetry: GenerationTelemetry; sourceText: string } | null;
type ApiResponse = { artifactId?: number; artifact?: PerformanceLearningArtifactV1; telemetry?: GenerationTelemetry; warning?: string | null; error?: string };
const inputClass = "min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const panelClass = "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const METRIC_FIELDS: Array<{ name: PerformanceLearningMetricName; label: string }> = [
  { name: "impressions", label: "Impressions" },
  { name: "clicks", label: "Clicks" },
  { name: "saves", label: "Saves" },
  { name: "shares", label: "Shares" },
  { name: "leads", label: "Leads" },
];

async function copyTextSafely(value: string) {
  try { await navigator.clipboard.writeText(value); return true; }
  catch {
    try { const area = document.createElement("textarea"); area.value = value; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); const copied = document.execCommand("copy"); area.remove(); return copied; }
    catch { return false; }
  }
}

export function PerformanceClient({ source, initial, initialRequest }: { source: ApprovedPerformanceSourceSnapshotV1; initial: PerformanceInitial; initialRequest?: PerformanceLearningRequestV1 }) {
  const [request, setRequest] = useState<PerformanceLearningRequestV1>(initial?.request ?? initialRequest ?? { entry: "from_content_create", sourceContentCreateId: source.id, metrics: { impressions: 0, clicks: 0, saves: 0, shares: 0, leads: 0 }, platformWindowDays: 7, snapshotNote: "" });
  const [artifactId, setArtifactId] = useState<number | null>(initial?.id ?? null);
  const [artifact, setArtifact] = useState<PerformanceLearningArtifactV1 | null>(initial?.artifact ?? null);
  const [telemetry, setTelemetry] = useState<GenerationTelemetry | null>(initial?.telemetry ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState(initial ? "Rekod prestasi dibuka." : "Masukkan snapshot metrik daripada platform anda untuk content yang diluluskan ini.");
  const [busy, setBusy] = useState(false);
  const requestId = useRef<string | null>(null);
  const mutationRequestId = useRef<string | null>(null);

  function updateMetric(name: PerformanceLearningMetricName, value: string) {
    const parsed = value === "" ? 0 : Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) return;
    setRequest((current) => ({ ...current, metrics: { ...current.metrics, [name]: parsed } }));
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("Membina diagnosis deterministic…"); setWarning(null); requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/app/performance/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: requestId.current, ...request }) });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.artifact || !data.artifactId || !data.telemetry) throw new Error(data.error || "Rekod prestasi tidak dapat dibina.");
      setArtifactId(data.artifactId); setArtifact(data.artifact); setTelemetry(data.telemetry); setWarning(data.warning || null); setMessage("Rekod prestasi disimpan sebagai DRAF."); requestId.current = null;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka."); }
    finally { setBusy(false); }
  }

  async function mutate(action: "save" | "approve" | "reopen", copyAfter = false) {
    if (!artifact || !artifactId) return;
    setBusy(true); setMessage(action === "approve" ? "Meluluskan rekod prestasi…" : action === "reopen" ? "Membuka revision DRAF baharu…" : "Menyimpan nota…"); mutationRequestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch(`/app/performance/api/${artifactId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, requestId: mutationRequestId.current, snapshotNote: artifact.snapshotNote }) });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.artifact || !data.artifactId) throw new Error(data.error || "Artifact tidak dapat disimpan.");
      setArtifactId(data.artifactId); setArtifact(data.artifact); setTelemetry(data.telemetry || telemetry); mutationRequestId.current = null;
      if (copyAfter) { const copied = await copyTextSafely(renderPerformanceLearningReport(data.artifact)); setMessage(copied ? "Rekod prestasi diluluskan dan safe-copy disalin." : "Rekod prestasi diluluskan. Salinan automatik disekat pelayar."); }
      else if (action === "reopen") setMessage(`Revision ${data.artifact.revision} dibuka sebagai DRAF baharu; approval lama kekal immutable.`);
      else setMessage("Nota snapshot disimpan. Metrik kekal immutable.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka."); }
    finally { setBusy(false); }
  }

  async function copyCurrent() { if (artifact) setMessage(await copyTextSafely(renderPerformanceLearningReport(artifact)) ? "Laporan prestasi disalin." : "Salinan disekat pelayar."); }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
    <div className="space-y-6">
      <form onSubmit={generate} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Sumber protected · Approved Content #{source.id} · {source.platform}</p><h2 className="mt-1 text-xl font-bold">{source.draftHook}</h2><p className="mt-1 text-sm text-neutral-500">{source.objective} · {source.contentRole} · {source.audience}</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {METRIC_FIELDS.map((field) => <label key={field.name} className="grid gap-1 text-sm font-medium">{field.label}<input className={`${inputClass} tabular-nums`} type="number" inputMode="numeric" min={0} step={1} value={request.metrics[field.name]} onChange={(event) => updateMetric(field.name, event.target.value)} /></label>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">Tetingkap platform<select className={inputClass} value={request.platformWindowDays} onChange={(event) => setRequest((current) => ({ ...current, platformWindowDays: Number(event.target.value) as PerformanceLearningRequestV1["platformWindowDays"] }))}><option value={7}>7 hari lepas</option><option value={14}>14 hari lepas</option><option value={30}>30 hari lepas</option></select></label>
          <p className="self-end text-xs text-neutral-500">Angka mesti integer ≥ 0; clicks/saves/shares ≤ impressions dan leads ≤ clicks.</p>
        </div>
        <label className="grid gap-1 text-sm font-medium">Nota snapshot (pilihan, tidak dipercayai)<textarea className={inputClass} rows={3} maxLength={300} value={request.snapshotNote} onChange={(event) => setRequest((current) => ({ ...current, snapshotNote: event.target.value }))} /><span className="text-right text-xs text-neutral-500 tabular-nums">{request.snapshotNote.length}/300</span></label>
        <p className="text-xs text-neutral-500">Nota anda dipagar sebagai input tidak dipercayai; ia tidak pernah dianggap bukti dan tidak mengubah diagnosis.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-neutral-500">Cap: 20/jam · 100/bulan · provider/connector OFF</p><button disabled={busy} className="min-h-11 rounded-lg bg-violet-600 px-5 py-2.5 font-bold text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Memproses…" : "Bina Rekod Prestasi"}</button></div>
      </form>

      <div aria-live="polite" className="space-y-2">{message && <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{message}</p>}{warning && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{warning}</p>}</div>

      {artifact && <section className="space-y-5 rounded-2xl border-2 border-violet-300 bg-violet-50/40 p-5 dark:border-violet-900 dark:bg-violet-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-violet-600">Prestasi → Pembelajaran</p><h2 className="text-xl font-bold">Diagnosis &amp; Cadangan</h2></div><span className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${artifact.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"}`}>{artifact.status === "approved" ? "DILULUSKAN" : "DRAF"} · R{artifact.revision}</span></div>

        <div className={panelClass}><h3 className="font-bold">Diagnosis (deterministic)</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-500">Bottleneck</dt><dd className="font-bold">{artifact.diagnosis.bottleneck}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-500">Keyakinan</dt><dd>{artifact.diagnosis.confidence} (tidak pernah tinggi daripada satu snapshot)</dd></div><div className="grid gap-1 tabular-nums sm:grid-cols-2"><div className="flex justify-between"><dt className="text-neutral-500">CTR</dt><dd>{(artifact.diagnosis.derivedRates.ctrClicksPerImpressions * 100).toFixed(2)}%</dd></div><div className="flex justify-between"><dt className="text-neutral-500">Save + share</dt><dd>{(artifact.diagnosis.derivedRates.engagementRatePerImpressions * 100).toFixed(2)}%</dd></div><div className="flex justify-between"><dt className="text-neutral-500">Lead / klik</dt><dd>{(artifact.diagnosis.derivedRates.leadRatePerClick * 100).toFixed(2)}%</dd></div><div className="flex justify-between"><dt className="text-neutral-500">Tetingkap</dt><dd>{artifact.platformWindowDays} hari</dd></div></div>{artifact.diagnosis.hypothesisNote && <p className="text-neutral-500">{artifact.diagnosis.hypothesisNote}</p>}</dl></div>

        <div className={panelClass}><h3 className="font-bold">Pembelajaran</h3><p className="mt-3 text-sm">{artifact.learning.patternObserved}</p><p className="mt-2 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900"><strong>Hipotesis seterusnya (satu sahaja):</strong> {artifact.learning.hypothesisNext}</p></div>

        <div className={panelClass}><h3 className="font-bold">Next Best Content (cadangan teks sahaja)</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-500">Format</dt><dd className="font-bold">{artifact.nextBestContent.format}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-500">Intent</dt><dd>{artifact.nextBestContent.intent}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-500">Role</dt><dd>{artifact.nextBestContent.role}</dd></div><p className="text-neutral-500">{artifact.nextBestContent.reason}</p><p className="text-neutral-500">{artifact.nextBestContent.generatorHint}</p><p className="rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950"><strong>Promise ceiling:</strong> {artifact.nextBestContent.promiseCeiling}</p></dl></div>

        <div className={panelClass}><h3 className="font-bold">Nota snapshot</h3><label className="mt-3 grid gap-1 text-sm font-medium">{artifact.status === "draft" ? "Boleh diedit sebelum kelulusan (metrik immutable)" : "Immutable selepas kelulusan"}<textarea className={inputClass} rows={3} maxLength={300} value={artifact.snapshotNote} disabled={artifact.status === "approved"} onChange={(event) => setArtifact({ ...artifact, snapshotNote: event.target.value })} /></label><span className="text-right text-xs text-neutral-500 tabular-nums">{artifact.snapshotNote.length}/300</span>{artifact.snapshotFencing.flaggedPatterns.length > 0 && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">Nota mengandungi corak tidak dipercayai ({artifact.snapshotFencing.flaggedPatterns.join(", ")}) dan telah dipagar; ia tidak dianggap bukti.</p>}</div>

        <div className="flex flex-wrap justify-end gap-2">{artifactId && <Link href={`/app/performance/${artifactId}`} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium dark:border-zinc-700">Pautan buka semula</Link>}<button type="button" disabled={busy} onClick={copyCurrent} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Salin laporan</button>{artifact.status === "approved" ? <button type="button" disabled={busy} onClick={() => mutate("reopen")} className="min-h-11 rounded-lg border border-amber-400 px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-300">Buka semula sebagai Draf</button> : <><button type="button" disabled={busy} onClick={() => mutate("save")} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Simpan Draf</button><button type="button" disabled={busy} onClick={() => mutate("approve", true)} className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">{"Lulus & Salin"}</button></>}</div>
      </section>}
    </div>
    <aside className="space-y-4"><section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"><h2 className="text-sm font-bold">Approved Content protected</h2><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-neutral-500">Platform</dt><dd>{source.platform} · {source.objective} · {source.contentRole}</dd></div><div><dt className="text-xs text-neutral-500">Audience</dt><dd>{source.audience}</dd></div><div><dt className="text-xs text-neutral-500">Tesis</dt><dd>{source.coreThesis}</dd></div><div><dt className="text-xs text-neutral-500">CTA</dt><dd>{source.callToAction}</dd></div></dl></section>{telemetry && <section className="rounded-2xl border border-zinc-200 p-4 text-xs dark:border-zinc-800"><h2 className="text-sm font-bold">Generation evidence</h2><dl className="mt-3 space-y-2 text-neutral-500"><div className="flex justify-between"><dt>Mode</dt><dd>{telemetry.mode}</dd></div><div className="flex justify-between"><dt>Model</dt><dd>{telemetry.model}</dd></div><div className="flex justify-between"><dt>Kos</dt><dd>{telemetry.estimatedCostRm === null ? "TBD" : `RM${telemetry.estimatedCostRm.toFixed(4)}`}</dd></div></dl></section>}<p className="rounded-xl bg-zinc-100 p-3 text-xs text-neutral-500 dark:bg-zinc-900">Snapshot ialah owner-asserted dan bukan bukti tersahkan. Diagnosis deterministic sahaja; tiada panggilan luar dibuat.</p></aside>
  </div>;
}
