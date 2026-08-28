"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  renderOfferText,
  type OfferBusinessContextSnapshot,
  type GenerationTelemetry,
  type NativeOfferRequest,
  type OfferArtifact,
} from "@/lib/native-offer/domain";

export type NativeOfferInitial = {
  id: number;
  artifact: OfferArtifact;
  request: NativeOfferRequest;
  telemetry: GenerationTelemetry;
} | null;

type GenerateResponse = {
  artifactId?: number;
  artifact?: OfferArtifact;
  telemetry?: GenerationTelemetry;
  warning?: string | null;
  error?: string;
};

const inputClass = "min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const OFFER_TYPE_LABELS: Record<NativeOfferRequest["offerType"], string> = {
  promotion: "Promosi",
  bundle: "Bundle",
  guarantee: "Jaminan",
  value_stack: "Nilai Ditambah",
  seasonal: "Musim/Perayaan",
};

export function NativeOfferClient({
  business,
  initial,
  initialRequest,
  sourcePostLabel,
}: {
  business: OfferBusinessContextSnapshot;
  initial: NativeOfferInitial;
  initialRequest?: NativeOfferRequest;
  sourcePostLabel?: string;
}) {
  const [request, setRequest] = useState<NativeOfferRequest>(initial?.request ?? initialRequest ?? {
    entry: "standalone",
    sourcePostId: null,
    offerType: "promotion",
    product: "",
    goal: "sales",
    validUntil: "",
    extraNote: "",
    audience: "",
    priceGuidance: "",
  });
  const [artifactId, setArtifactId] = useState<number | null>(initial?.id ?? null);
  const [artifact, setArtifact] = useState<OfferArtifact | null>(initial?.artifact ?? null);
  const [telemetry, setTelemetry] = useState<GenerationTelemetry | null>(initial?.telemetry ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState(initial ? "Artifact dibuka semula." : "");
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  const contextFacts = useMemo(() => [
    ["Bisnes", business.businessName],
    ["Produk", business.products],
    ["Pelanggan", business.targetCustomer],
    ["Julat harga", business.priceRange || "—"],
  ], [business]);

  function setField<K extends keyof NativeOfferRequest>(key: K, value: NativeOfferRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Menyusun komponen tawaran daripada Business Context…");
    setWarning(null);
    requestIdRef.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/app/native-offer/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestIdRef.current,
          entry: request.entry,
          source_post_id: request.sourcePostId,
          offer_type: request.offerType,
          product: request.product,
          goal: request.goal,
          valid_until: request.validUntil,
          extra_note: request.extraNote,
          audience: request.audience,
          priceGuidance: request.priceGuidance,
        }),
      });
      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || !data.artifact || !data.artifactId || !data.telemetry) {
        throw new Error(data.error || "Tawaran tidak dapat dijana.");
      }
      setArtifactId(data.artifactId);
      setArtifact(data.artifact);
      setTelemetry(data.telemetry);
      setWarning(data.warning || null);
      setMessage("Tawaran dijana dan disimpan sebagai DRAF.");
      requestIdRef.current = null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka.");
    } finally {
      setBusy(false);
    }
  }

  async function save(status: "draft" | "approved", copyAfter = false) {
    if (!artifact || !artifactId) return;
    setBusy(true);
    setMessage(status === "approved" ? "Meluluskan artifact…" : "Menyimpan perubahan…");
    try {
      const response = await fetch(`/app/native-offer/api/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...artifact, status }),
      });
      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || !data.artifact) throw new Error(data.error || "Artifact tidak dapat disimpan.");
      setArtifact(data.artifact);
      setTelemetry(data.telemetry || telemetry);
      if (copyAfter) await navigator.clipboard.writeText(renderOfferText(data.artifact));
      setMessage(copyAfter ? "Artifact diluluskan dan disalin." : "Perubahan disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka.");
    } finally {
      setBusy(false);
    }
  }

  function updateArtifact<K extends keyof OfferArtifact>(key: K, value: OfferArtifact[K]) {
    setArtifact((current) => current ? { ...current, [key]: value } : current);
  }

  function updateComponentList(key: "valueStack" | "terms", value: string) {
    const max = key === "valueStack" ? 5 : 8;
    const list = value.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, max);
    updateArtifact(key, list);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <form onSubmit={generate} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Goal Launcher</p>
            <h2 className="mt-1 text-xl font-bold">Bina Tawaran</h2>
            <p className="mt-1 text-sm text-neutral-500">Business Context diisi automatik. Nyatakan matlamat dan fakta tawaran sebenar.</p>
          </div>
          {request.sourcePostId && <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200">
            Dibina daripada Social Post diluluskan #{request.sourcePostId}{sourcePostLabel ? `: ${sourcePostLabel}` : ""}.
          </div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">Jenis tawaran
              <select className={inputClass} value={request.offerType} onChange={(event) => setField("offerType", event.target.value as NativeOfferRequest["offerType"])}>
                {(Object.keys(OFFER_TYPE_LABELS) as NativeOfferRequest["offerType"][]).map((type) => (
                  <option key={type} value={type}>{OFFER_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Matlamat
              <select className={inputClass} value={request.goal} onChange={(event) => setField("goal", event.target.value as NativeOfferRequest["goal"])}>
                <option value="sales">Jualan</option>
                <option value="leads">Leads</option>
                <option value="repeat_purchase">Pembelian semula</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Sah hingga (pilihan)
              <input type="date" className={inputClass} value={request.validUntil} onChange={(event) => setField("validUntil", event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium">Julat harga (pilihan)
              <input className={inputClass} maxLength={200} value={request.priceGuidance} onChange={(event) => setField("priceGuidance", event.target.value)} placeholder="Contoh: RM12–RM25" />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">Produk / servis *
            <input className={inputClass} required maxLength={200} value={request.product} onChange={(event) => setField("product", event.target.value)} placeholder="Contoh: Set lunch ayam goreng" />
          </label>
          <label className="grid gap-1 text-sm font-medium">Audience (pilihan)
            <input className={inputClass} maxLength={200} value={request.audience} onChange={(event) => setField("audience", event.target.value)} placeholder="Kosongkan untuk guna pelanggan sasaran Business Context" />
          </label>
          <label className="grid gap-1 text-sm font-medium">Nota tambahan (pilihan)
            <textarea className={inputClass} rows={2} maxLength={300} value={request.extraNote} onChange={(event) => setField("extraNote", event.target.value)} placeholder="Contoh: Polisi sebenar, syarat atau butiran produk" />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">Cap: 20/jam · 100/bulan · tiada publish</p>
            <button disabled={busy} className="min-h-11 rounded-lg bg-violet-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50">
              {busy ? "Menyiapkan…" : "Jana Tawaran"}
            </button>
          </div>
        </form>

        {(message || warning) && <div className="space-y-2" aria-live="polite">
          {message && <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{message}</p>}
          {warning && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{warning}</p>}
        </div>}

        {artifact && <section className="space-y-4 rounded-2xl border-2 border-violet-300 bg-violet-50/40 p-5 dark:border-violet-900 dark:bg-violet-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase text-violet-600">Structured Artifact</p><h2 className="text-xl font-bold">Tawaran · {OFFER_TYPE_LABELS[artifact.offerType]}</h2></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${artifact.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"}`}>{artifact.status === "approved" ? "DILULUSKAN" : "DRAF"}</span>
          </div>
          <label className="grid gap-1 text-sm font-bold">Headline
            <input className={inputClass} maxLength={300} value={artifact.headline} onChange={(event) => updateArtifact("headline", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Promise
            <textarea className={inputClass} rows={3} maxLength={2000} value={artifact.promise} onChange={(event) => updateArtifact("promise", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Value stack (3–5, satu per baris)
            <textarea className={inputClass} rows={5} value={artifact.valueStack.join("\n")} onChange={(event) => updateComponentList("valueStack", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Syarat (pilihan, satu per baris)
            <textarea className={inputClass} rows={3} value={artifact.terms.join("\n")} onChange={(event) => updateComponentList("terms", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Risk reversal (hanya polisi sebenar)
            <textarea className={inputClass} rows={2} maxLength={2000} value={artifact.riskReversal} onChange={(event) => updateArtifact("riskReversal", event.target.value)} />
          </label>
          {artifact.urgencyNote && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><strong>Urgency daripada tarikh anda:</strong> {artifact.urgencyNote}</div>}
          <label className="grid gap-1 text-sm font-bold">Harga
            <input className={inputClass} maxLength={300} value={artifact.priceNote} onChange={(event) => updateArtifact("priceNote", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Call-to-action
            <textarea className={inputClass} rows={2} maxLength={500} value={artifact.callToAction} onChange={(event) => updateArtifact("callToAction", event.target.value)} />
          </label>
          {artifact.assumptions.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><strong>Andaian:</strong> {artifact.assumptions.join(" ")}</div>}
          <div className="flex flex-wrap justify-end gap-2">
            {artifactId && <Link href={`/app/native-offer/${artifactId}`} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium dark:border-zinc-700">Pautan buka semula</Link>}
            <button disabled={busy} onClick={() => save("draft")} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Simpan Draf</button>
            <button disabled={busy} onClick={() => save("approved", true)} className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Lulus & Salin</button>
          </div>
        </section>}
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-bold">Business Context digunakan</h2>
          <dl className="mt-3 space-y-3">{contextFacts.map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</dt><dd className="text-sm">{value}</dd></div>)}</dl>
        </section>
        {telemetry && <section className="rounded-2xl border border-zinc-200 p-4 text-xs dark:border-zinc-800">
          <h2 className="text-sm font-bold">Generation evidence</h2>
          <dl className="mt-3 space-y-2 text-neutral-500"><div className="flex justify-between"><dt>Mode</dt><dd>{telemetry.mode}</dd></div><div className="flex justify-between"><dt>Model</dt><dd>{telemetry.model}</dd></div><div className="flex justify-between"><dt>Latency</dt><dd>{telemetry.latencyMs}ms</dd></div><div className="flex justify-between"><dt>Kos</dt><dd>{telemetry.estimatedCostRm === null ? "TBD" : `RM${telemetry.estimatedCostRm.toFixed(4)}`}</dd></div></dl>
        </section>}
        <p className="rounded-xl bg-zinc-100 p-3 text-xs text-neutral-500 dark:bg-zinc-900">Slice 2 lokal/staging sahaja. Tiada publish, scheduling atau WhatsApp send.</p>
      </aside>
    </div>
  );
}
