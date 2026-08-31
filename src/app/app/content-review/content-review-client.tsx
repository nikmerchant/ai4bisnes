"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  CONTENT_REVIEW_DIAGNOSIS_DIMENSIONS,
  renderImprovedContentText,
  type BusinessContextSnapshot,
  type ContentReviewArtifactV1,
  type ContentReviewRequestV1,
  type GenerationTelemetry,
  type ImprovedContentDraftV1,
} from "@/lib/content-review/domain";

export type ContentReviewInitial = {
  id: number;
  artifact: ContentReviewArtifactV1;
  request: ContentReviewRequestV1;
  telemetry: GenerationTelemetry;
  sourceText: string;
} | null;

type ReviewResponse = {
  artifactId?: number;
  artifact?: ContentReviewArtifactV1;
  telemetry?: GenerationTelemetry;
  sourceText?: string;
  warning?: string | null;
  error?: string;
};

const inputClass = "min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const defaultRequest: ContentReviewRequestV1 = {
  entry: "pasted_text",
  sourceSocialPostId: null,
  sourceText: "",
  platform: "instagram",
  objective: "engagement",
  desiredAction: "",
  extraContext: "",
};

const DIMENSION_LABELS: Record<(typeof CONTENT_REVIEW_DIAGNOSIS_DIMENSIONS)[number], string> = {
  strategy: "Strategi", audience: "Audience", thesis: "Thesis", grab: "Hook", flow: "Aliran", hold: "Retention",
  show: "Show", say: "Bahasa", pack: "Packaging", move: "Tindakan", trust: "Kepercayaan", brand: "Jenama",
};

async function copyTextSafely(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    } catch {
      return false;
    }
  }
}

export function ContentReviewClient({
  business,
  initial,
  initialRequest,
}: {
  business: BusinessContextSnapshot;
  initial: ContentReviewInitial;
  initialRequest?: ContentReviewRequestV1;
}) {
  const seedRequest = initial?.request ?? initialRequest ?? defaultRequest;
  const [request, setRequest] = useState<ContentReviewRequestV1>(seedRequest);
  const [sourceText, setSourceText] = useState(initial?.sourceText ?? seedRequest.sourceText);
  const [artifactId, setArtifactId] = useState<number | null>(initial?.id ?? null);
  const [artifact, setArtifact] = useState<ContentReviewArtifactV1 | null>(initial?.artifact ?? null);
  const [telemetry, setTelemetry] = useState<GenerationTelemetry | null>(initial?.telemetry ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState(initial ? "Artifact dibuka semula." : initialRequest ? "Social Post milik anda dimuat sebagai sumber canonical." : "");
  const [busy, setBusy] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const mutationRequestIdRef = useRef<string | null>(null);

  const contextFacts = useMemo(() => [
    ["Bisnes", business.businessName],
    ["Produk", business.products],
    ["Pelanggan", business.targetCustomer],
    ["Gaya", business.toneOfVoice],
  ], [business]);

  function setField<K extends keyof ContentReviewRequestV1>(key: K, value: ContentReviewRequestV1[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  function usePastedText() {
    setRequest((current) => ({ ...current, entry: "pasted_text", sourceSocialPostId: null, sourceText: "" }));
    setSourceText("");
    setArtifact(null);
    setArtifactId(null);
    setTelemetry(null);
    setMessage("Tampal content yang mahu disemak.");
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Mendiagnosis content dan memilih satu bottleneck utama…");
    setWarning(null);
    requestIdRef.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/app/content-review/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, sourceText, requestId: requestIdRef.current }),
      });
      const data = (await response.json()) as ReviewResponse;
      if (!response.ok || !data.artifact || !data.artifactId || !data.telemetry || !data.sourceText) {
        throw new Error(data.error || "Content tidak dapat disemak.");
      }
      setArtifactId(data.artifactId);
      setArtifact(data.artifact);
      setTelemetry(data.telemetry);
      setSourceText(data.sourceText);
      setWarning(data.warning || null);
      setHasEdits(false);
      setMessage("Review disimpan sebagai DRAF. Semak diagnosis dan baiki improved draft.");
      requestIdRef.current = null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka.");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft<K extends keyof ImprovedContentDraftV1>(key: K, value: ImprovedContentDraftV1[K]) {
    setArtifact((current) => current ? { ...current, improvedDraft: { ...current.improvedDraft, [key]: value } } : current);
    setHasEdits(true);
  }

  async function mutate(action: "save" | "approve" | "reopen", copyAfter = false) {
    if (!artifact || !artifactId) return;
    setBusy(true);
    setMessage(action === "approve" ? "Meluluskan improved draft…" : action === "reopen" ? "Membuka revision DRAF baharu…" : "Menyimpan perubahan…");
    mutationRequestIdRef.current ||= crypto.randomUUID();
    try {
      const response = await fetch(`/app/content-review/api/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId: mutationRequestIdRef.current, ...artifact.improvedDraft }),
      });
      const data = (await response.json()) as ReviewResponse;
      if (!response.ok || !data.artifact || !data.artifactId) throw new Error(data.error || "Artifact tidak dapat disimpan.");
      setArtifactId(data.artifactId);
      setArtifact(data.artifact);
      setTelemetry(data.telemetry || telemetry);
      setHasEdits(false);
      mutationRequestIdRef.current = null;
      if (copyAfter) {
        const copied = await copyTextSafely(renderImprovedContentText(data.artifact.improvedDraft));
        setMessage(copied
          ? "Artifact diluluskan dan improved draft disalin."
          : "Artifact diluluskan. Salinan automatik disekat pelayar — gunakan butang Salin.");
      } else if (action === "reopen") {
        setMessage(`Revision ${data.artifact.improvedDraft.revision} dibuka sebagai DRAF baharu; approval lama tidak dimutasi.`);
      } else {
        setMessage("Perubahan disimpan sebagai DRAF.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCurrentDraft() {
    if (!artifact) return;
    const copied = await copyTextSafely(renderImprovedContentText(artifact.improvedDraft));
    setMessage(copied ? "Improved draft disalin." : "Salinan disekat pelayar. Pilih dan salin teks secara manual.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <form onSubmit={generate} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Sumber review</p><h2 className="mt-1 text-xl font-bold">Paste content atau guna Social Post</h2></div>
            {request.entry === "from_social_post" && <button type="button" onClick={usePastedText} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold dark:border-zinc-700">Tukar kepada teks tampalan</button>}
          </div>
          {request.entry === "from_social_post" && <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200">Sumber owned Social Post #{request.sourceSocialPostId}. Teks canonical server akan menggantikan teks client.</div>}
          <label className="grid gap-1 text-sm font-medium">Content sumber *
            <textarea className={inputClass} required readOnly={request.entry === "from_social_post"} rows={8} maxLength={5000} value={sourceText} onChange={(event) => { setSourceText(event.target.value); setField("sourceText", event.target.value); }} placeholder="Tampal post, caption atau draf yang mahu dibaiki…" />
            <span className="text-right text-xs text-neutral-500">{sourceText.length}/5000</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">Platform
              <select className={inputClass} value={request.platform} onChange={(event) => setField("platform", event.target.value as ContentReviewRequestV1["platform"])}>
                <option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Objektif
              <select className={inputClass} value={request.objective} onChange={(event) => setField("objective", event.target.value as ContentReviewRequestV1["objective"])}>
                <option value="awareness">Awareness</option><option value="engagement">Engagement</option><option value="leads">Leads</option><option value="sales">Jualan</option><option value="education">Pendidikan</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">Tindakan yang anda mahu pembaca ambil (pilihan)
            <input className={inputClass} maxLength={200} value={request.desiredAction} onChange={(event) => setField("desiredAction", event.target.value)} placeholder="Contoh: simpan panduan atau komen pengalaman" />
          </label>
          <label className="grid gap-1 text-sm font-medium">Konteks tambahan (pilihan)
            <textarea className={inputClass} rows={2} maxLength={500} value={request.extraContext} onChange={(event) => setField("extraContext", event.target.value)} placeholder="Nota pemilik; akan diperlakukan sebagai input tidak dipercayai" />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">Cap: 20/jam · 100/bulan · provider OFF</p>
            <button disabled={busy || !sourceText.trim()} className="min-h-11 rounded-lg bg-violet-600 px-5 py-2.5 font-bold text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Menyemak…" : "Semak & Baiki"}</button>
          </div>
        </form>

        {(message || warning) && <div className="space-y-2" aria-live="polite">
          {message && <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{message}</p>}
          {warning && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{warning}</p>}
        </div>}

        {artifact && <section className="space-y-5 rounded-2xl border-2 border-violet-300 bg-violet-50/40 p-5 dark:border-violet-900 dark:bg-violet-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase text-violet-600">Diagnosis → Improved Draft</p><h2 className="text-xl font-bold">Review content · {artifact.platform}</h2></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${artifact.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"}`}>{artifact.status === "approved" ? "DILULUSKAN" : "DRAF"} · R{artifact.improvedDraft.revision}</span>
          </div>

          <details className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <summary className="cursor-pointer font-bold">12 band diagnosis</summary>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{CONTENT_REVIEW_DIAGNOSIS_DIMENSIONS.map((dimension) => <div key={dimension} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900"><dt className="text-xs text-neutral-500">{DIMENSION_LABELS[dimension]}</dt><dd className="text-sm font-bold">{artifact.diagnosisBands[dimension] ?? "Tidak cukup bukti"}</dd></div>)}</dl>
          </details>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950"><h3 className="font-bold">Kekuatan</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{artifact.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"><h3 className="font-bold">Perlu dibaiki</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{artifact.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>

          <div className="rounded-xl border-2 border-violet-300 bg-white p-4 dark:border-violet-800 dark:bg-zinc-950"><p className="text-xs font-bold uppercase text-violet-600">Primary Creative Bottleneck</p><h3 className="mt-1 text-lg font-bold">{artifact.primaryCreativeBottleneck.replaceAll("_", " ")}</h3><p className="mt-2 text-sm">{artifact.creativeBullseye.change}</p></div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"><h3 className="font-bold">Creative Bullseye</h3><dl className="mt-3 space-y-3 text-sm"><div><dt className="font-bold">Ubah dahulu</dt><dd>{artifact.creativeBullseye.change}</dd></div><div><dt className="font-bold">Kenapa dahulu</dt><dd>{artifact.creativeBullseye.whyFirst}</dd></div><div><dt className="font-bold">Biarkan dahulu</dt><dd>{artifact.creativeBullseye.leaveAlone}</dd></div><div><dt className="font-bold">Cara uji</dt><dd>{artifact.creativeBullseye.testMethod}</dd></div><div><dt className="font-bold">Tanda berjaya</dt><dd>{artifact.creativeBullseye.successMetric}</dd></div></dl></div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"><h3 className="font-bold">Risiko claim</h3>{artifact.claimLedger.length ? <ul className="mt-3 space-y-3">{artifact.claimLedger.map((claim) => <li key={claim.claimId} className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900"><q>{claim.exactClaimText}</q><p className="mt-1 font-bold">{claim.class} · {claim.evidenceState} · {claim.action}</p><p className="text-neutral-500">Had wording: {claim.allowedWordingCeiling}</p></li>)}</ul> : <p className="mt-2 text-sm text-neutral-500">Tiada claim material dikenal pasti daripada teks.</p>}</div>

          {artifact.status === "approved" && hasEdits && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Edit ini belum disimpan. Ia akan menjadi revision DRAF baharu dan tidak akan memutasi approval sedia ada.</p>}
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="font-bold">Improved draft</h3>
            <label className="grid gap-1 text-sm font-bold">Hook<textarea className={inputClass} rows={2} maxLength={500} value={artifact.improvedDraft.hook} onChange={(event) => updateDraft("hook", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold">Body<textarea className={inputClass} rows={8} maxLength={5000} value={artifact.improvedDraft.body} onChange={(event) => updateDraft("body", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold">Call-to-action<textarea className={inputClass} rows={2} maxLength={500} value={artifact.improvedDraft.callToAction} onChange={(event) => updateDraft("callToAction", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold">Hashtag<input className={inputClass} value={artifact.improvedDraft.hashtags.join(" ")} onChange={(event) => updateDraft("hashtags", event.target.value.split(/[\s,]+/).filter(Boolean).slice(0, 10))} /></label>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {artifactId && <Link href={`/app/content-review/${artifactId}`} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium dark:border-zinc-700">Pautan buka semula</Link>}
            <button type="button" disabled={busy} onClick={copyCurrentDraft} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Salin</button>
            {artifact.status === "approved" ? <button type="button" disabled={busy} onClick={() => mutate("reopen")} className="min-h-11 rounded-lg border border-amber-400 px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-300">Buka semula sebagai Draf</button> : <>
              <button type="button" disabled={busy} onClick={() => mutate("save")} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Simpan Draf</button>
              <button type="button" disabled={busy} onClick={() => mutate("approve", true)} className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Lulus & Salin</button>
            </>}
          </div>
        </section>}
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"><h2 className="text-sm font-bold">Business Context digunakan</h2><dl className="mt-3 space-y-3">{contextFacts.map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</dt><dd className="text-sm">{value}</dd></div>)}</dl></section>
        {telemetry && <section className="rounded-2xl border border-zinc-200 p-4 text-xs dark:border-zinc-800"><h2 className="text-sm font-bold">Generation evidence</h2><dl className="mt-3 space-y-2 text-neutral-500"><div className="flex justify-between"><dt>Mode</dt><dd>{telemetry.mode}</dd></div><div className="flex justify-between"><dt>Model</dt><dd>{telemetry.model}</dd></div><div className="flex justify-between"><dt>Kos</dt><dd>{telemetry.estimatedCostRm === null ? "TBD" : `RM${telemetry.estimatedCostRm.toFixed(4)}`}</dd></div></dl></section>}
        <p className="rounded-xl bg-zinc-100 p-3 text-xs text-neutral-500 dark:bg-zinc-900">Tiada auto-publish, schedule atau send. Review berhenti pada simpan, lulus dan salin.</p>
      </aside>
    </div>
  );
}
