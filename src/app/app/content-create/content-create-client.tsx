"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  renderContentCreateDraft,
  type ApprovedOfferSnapshotV1,
  type BusinessContextSnapshot,
  type ContentCreateArtifactV1,
  type ContentCreateDraftV1,
  type ContentCreateRequestV1,
  type GenerationTelemetry,
} from "@/lib/content-create/domain";

export type ContentCreateInitial = {
  id: number;
  artifact: ContentCreateArtifactV1;
  request: ContentCreateRequestV1;
  telemetry: GenerationTelemetry;
  sourceText: string;
} | null;

type ContentCreateResponse = {
  artifactId?: number;
  artifact?: ContentCreateArtifactV1;
  telemetry?: GenerationTelemetry;
  sourceText?: string;
  warning?: string | null;
  error?: string;
};

const inputClass = "min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

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

export function ContentCreateClient({
  business,
  sourceOffer,
  initial,
  initialRequest,
}: {
  business: BusinessContextSnapshot;
  sourceOffer: ApprovedOfferSnapshotV1;
  initial: ContentCreateInitial;
  initialRequest?: ContentCreateRequestV1;
}) {
  const seedRequest = initial?.request ?? initialRequest ?? {
    entry: "from_offer" as const,
    sourceOfferId: sourceOffer.id,
    platform: "facebook" as const,
    objective: "sales" as const,
    contentRole: "convert" as const,
    proofNote: "",
    extraContext: "",
  };
  const [request, setRequest] = useState<ContentCreateRequestV1>(seedRequest);
  const [artifactId, setArtifactId] = useState<number | null>(initial?.id ?? null);
  const [artifact, setArtifact] = useState<ContentCreateArtifactV1 | null>(initial?.artifact ?? null);
  const [telemetry, setTelemetry] = useState<GenerationTelemetry | null>(initial?.telemetry ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState(initial ? "Artifact dibuka semula." : "Approved Offer milik anda dimuat sebagai sumber canonical.");
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

  function setField<K extends keyof ContentCreateRequestV1>(key: K, value: ContentCreateRequestV1[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Membina strategi dan draf daripada Approved Offer…");
    setWarning(null);
    requestIdRef.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/app/content-create/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestIdRef.current,
          entry: request.entry,
          sourceOfferId: request.sourceOfferId,
          platform: request.platform,
          objective: request.objective,
          contentRole: request.contentRole,
          proofNote: request.proofNote,
          extraContext: request.extraContext,
        }),
      });
      const data = (await response.json()) as ContentCreateResponse;
      if (!response.ok || !data.artifact || !data.artifactId || !data.telemetry) throw new Error(data.error || "Content tidak dapat dijana.");
      setArtifactId(data.artifactId);
      setArtifact(data.artifact);
      setTelemetry(data.telemetry);
      setWarning(data.warning || null);
      setHasEdits(false);
      setMessage("Strategi dan draf disimpan sebagai DRAF.");
      requestIdRef.current = null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka.");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft<K extends keyof ContentCreateDraftV1>(key: K, value: ContentCreateDraftV1[K]) {
    setArtifact((current) => current ? { ...current, draft: { ...current.draft, [key]: value } } : current);
    setHasEdits(true);
  }

  async function mutate(action: "save" | "approve" | "reopen", copyAfter = false) {
    if (!artifact || !artifactId) return;
    setBusy(true);
    setMessage(action === "approve" ? "Meluluskan draf…" : action === "reopen" ? "Membuka revision DRAF baharu…" : "Menyimpan perubahan…");
    mutationRequestIdRef.current ||= crypto.randomUUID();
    try {
      const response = await fetch(`/app/content-create/api/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId: mutationRequestIdRef.current, ...artifact.draft }),
      });
      const data = (await response.json()) as ContentCreateResponse;
      if (!response.ok || !data.artifact || !data.artifactId) throw new Error(data.error || "Artifact tidak dapat disimpan.");
      setArtifactId(data.artifactId);
      setArtifact(data.artifact);
      setTelemetry(data.telemetry || telemetry);
      setHasEdits(false);
      mutationRequestIdRef.current = null;
      if (copyAfter) {
        const copied = await copyTextSafely(renderContentCreateDraft(data.artifact.draft));
        setMessage(copied ? "Artifact diluluskan dan draf disalin." : "Artifact diluluskan. Salinan automatik disekat pelayar — gunakan butang Salin.");
      } else if (action === "reopen") {
        setMessage(`Revision ${data.artifact.draft.revision} dibuka sebagai DRAF baharu; approval lama kekal immutable.`);
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
    const copied = await copyTextSafely(renderContentCreateDraft(artifact.draft));
    setMessage(copied ? "Draf social disalin." : "Salinan disekat pelayar. Pilih dan salin teks secara manual.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <form onSubmit={generate} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Sumber canonical · Approved Offer #{sourceOffer.id}</p>
            <h2 className="mt-1 text-xl font-bold">{sourceOffer.headline}</h2>
            <p className="mt-1 text-sm text-neutral-500">{sourceOffer.product} · {sourceOffer.audience}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
            <p className="font-bold">Offer dilindungi (read-only)</p>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              <div><dt className="text-xs text-neutral-500">Harga</dt><dd>{sourceOffer.priceNote || "Tidak dinyatakan"}</dd></div>
              <div><dt className="text-xs text-neutral-500">Tarikh sah</dt><dd>{sourceOffer.validUntil || "Tidak dinyatakan"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-neutral-500">Terma</dt><dd className="whitespace-pre-line">{sourceOffer.terms || "Tidak dinyatakan"}</dd></div>
            </dl>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium">Platform
              <select className={inputClass} value={request.platform} onChange={(event) => setField("platform", event.target.value as ContentCreateRequestV1["platform"])}>
                <option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Objektif
              <select className={inputClass} value={request.objective} onChange={(event) => setField("objective", event.target.value as ContentCreateRequestV1["objective"])}>
                <option value="awareness">Awareness</option><option value="engagement">Engagement</option><option value="leads">Leads</option><option value="sales">Jualan</option><option value="education">Pendidikan</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Content role
              <select className={inputClass} value={request.contentRole} onChange={(event) => setField("contentRole", event.target.value as ContentCreateRequestV1["contentRole"])}>
                <option value="attract">Attract</option><option value="educate">Educate</option><option value="trust">Trust</option><option value="convert">Convert</option>
              </select>
            </label>
          </div>
          <details className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <summary className="cursor-pointer font-bold">Lebih Kawalan</summary>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm font-medium">Nota bukti pemilik (pilihan)
                <textarea className={inputClass} rows={3} maxLength={500} value={request.proofNote} onChange={(event) => setField("proofNote", event.target.value)} placeholder="Owner-asserted sahaja; tidak dianggap bukti bebas" />
                <span className="text-right text-xs text-neutral-500">{request.proofNote.length}/500</span>
              </label>
              <label className="grid gap-1 text-sm font-medium">Konteks tambahan (pilihan)
                <textarea className={inputClass} rows={3} maxLength={500} value={request.extraContext} onChange={(event) => setField("extraContext", event.target.value)} placeholder="Input tidak dipercayai; tidak boleh mengubah Offer" />
                <span className="text-right text-xs text-neutral-500">{request.extraContext.length}/500</span>
              </label>
            </div>
          </details>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">Cap: 20/jam · 100/bulan · provider OFF</p>
            <button disabled={busy} className="min-h-11 rounded-lg bg-violet-600 px-5 py-2.5 font-bold text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Membina…" : "Bina Strategi & Draf"}</button>
          </div>
        </form>

        {(message || warning) && <div className="space-y-2" aria-live="polite">
          {message && <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{message}</p>}
          {warning && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{warning}</p>}
        </div>}

        {artifact && <section className="space-y-5 rounded-2xl border-2 border-violet-300 bg-violet-50/40 p-5 dark:border-violet-900 dark:bg-violet-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase text-violet-600">Strategi → Draf Social</p><h2 className="text-xl font-bold">Bina Content · {artifact.platform}</h2></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${artifact.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"}`}>{artifact.status === "approved" ? "DILULUSKAN" : "DRAF"} · R{artifact.draft.revision}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"><h3 className="font-bold">Strategi content</h3><dl className="mt-3 space-y-3 text-sm"><div><dt className="font-bold">Audience</dt><dd>{artifact.strategy.audience}</dd></div><div><dt className="font-bold">Core thesis</dt><dd>{artifact.strategy.coreThesis}</dd></div><div><dt className="font-bold">Belief shift</dt><dd>{artifact.strategy.desiredBeliefShift.before} → {artifact.strategy.desiredBeliefShift.after}</dd></div></dl></div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950"><h3 className="font-bold">Strategi bukti</h3><p className="mt-2 text-sm font-bold">{artifact.strategy.proofStrategy.state}</p><p className="mt-1 text-sm">{artifact.strategy.proofStrategy.note}</p></div>
          </div>
          <div className="rounded-xl border-2 border-violet-300 bg-white p-4 dark:border-violet-800 dark:bg-zinc-950"><h3 className="font-bold">Jambatan ke tawaran</h3><p className="mt-2 text-sm">{artifact.strategy.offerBridge}</p></div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"><h3 className="font-bold">Risiko claim</h3>{artifact.claimLedger.length ? <ul className="mt-3 space-y-2">{artifact.claimLedger.map((claim) => <li key={claim.claimId} className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900"><q>{claim.exactClaimText}</q><p className="mt-1 font-bold">{claim.origin} · {claim.evidenceState} · {claim.action}</p><p className="text-neutral-500">Had wording: {claim.allowedWordingCeiling}</p></li>)}</ul> : <p className="mt-2 text-sm text-neutral-500">Tiada claim material selain fakta Offer.</p>}</div>

          {artifact.status === "approved" && hasEdits && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Edit belum disimpan. Ia akan menjadi revision DRAF baharu; row diluluskan tidak dimutasi.</p>}
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="font-bold">Draf social</h3>
            <label className="grid gap-1 text-sm font-bold">Hook<textarea className={inputClass} rows={2} maxLength={500} value={artifact.draft.hook} onChange={(event) => updateDraft("hook", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold">Body<textarea className={inputClass} rows={9} maxLength={5000} value={artifact.draft.body} onChange={(event) => updateDraft("body", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold">Call-to-action<textarea className={inputClass} rows={2} maxLength={500} value={artifact.draft.callToAction} onChange={(event) => updateDraft("callToAction", event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-bold">Hashtag<input className={inputClass} value={artifact.draft.hashtags.join(" ")} onChange={(event) => updateDraft("hashtags", event.target.value.split(/[\s,]+/).filter(Boolean).slice(0, 10))} /></label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {artifactId && <Link href={`/app/content-create/${artifactId}`} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium dark:border-zinc-700">Pautan buka semula</Link>}
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
        <p className="rounded-xl bg-zinc-100 p-3 text-xs text-neutral-500 dark:bg-zinc-900">Tiada visual, imej, video, publish, schedule atau send. Aliran berhenti pada simpan, lulus, salin dan buka revision.</p>
      </aside>
    </div>
  );
}
