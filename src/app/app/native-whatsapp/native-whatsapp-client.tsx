"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  renderWhatsAppDraftText,
  type WhatsAppBusinessContextSnapshot,
  type GenerationTelemetry,
  type NativeWhatsAppRequest,
  type WhatsAppDraftArtifact,
} from "@/lib/native-whatsapp/domain";

export type NativeWhatsAppInitial = {
  id: number;
  artifact: WhatsAppDraftArtifact;
  request: NativeWhatsAppRequest;
  telemetry: GenerationTelemetry;
} | null;

export type ApprovedOfferOption = { id: number; headline: string };

type GenerateResponse = {
  artifactId?: number;
  artifact?: WhatsAppDraftArtifact;
  telemetry?: GenerationTelemetry;
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

const INTENT_LABELS: Record<NativeWhatsAppRequest["replyIntent"], string> = {
  answer_inquiry: "Jawab pertanyaan",
  send_offer: "Hantar tawaran",
  follow_up: "Follow-up",
  booking_confirm: "Sahkan tempahan",
};

export function NativeWhatsAppClient({
  business,
  initial,
  initialRequest,
  approvedOffers,
  sourceOfferLabel,
}: {
  business: WhatsAppBusinessContextSnapshot;
  initial: NativeWhatsAppInitial;
  initialRequest?: NativeWhatsAppRequest;
  approvedOffers: ApprovedOfferOption[];
  sourceOfferLabel?: string;
}) {
  const [request, setRequest] = useState<NativeWhatsAppRequest>(initial?.request ?? initialRequest ?? {
    entry: "standalone",
    sourceOfferId: null,
    replyIntent: "answer_inquiry",
    customerMessage: "",
    customerName: "",
    extraNote: "",
  });
  const [artifactId, setArtifactId] = useState<number | null>(initial?.id ?? null);
  const [artifact, setArtifact] = useState<WhatsAppDraftArtifact | null>(initial?.artifact ?? null);
  const [telemetry, setTelemetry] = useState<GenerationTelemetry | null>(initial?.telemetry ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState(initial ? "Artifact dibuka semula." : "");
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  function setField<K extends keyof NativeWhatsAppRequest>(key: K, value: NativeWhatsAppRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Menyediakan draf balasan daripada Business Context…");
    setWarning(null);
    requestIdRef.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/app/native-whatsapp/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestIdRef.current,
          entry: request.entry,
          source_offer_id: request.sourceOfferId,
          reply_intent: request.replyIntent,
          customer_message: request.customerMessage,
          customer_name: request.customerName,
          extra_note: request.extraNote,
        }),
      });
      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || !data.artifact || !data.artifactId || !data.telemetry) {
        throw new Error(data.error || "Draf balasan tidak dapat dijana.");
      }
      setArtifactId(data.artifactId);
      setArtifact(data.artifact);
      setTelemetry(data.telemetry);
      setWarning(data.warning || null);
      setMessage("Draf balasan dijana dan disimpan sebagai DRAF. Semak, luluskan, kemudian salin ke WhatsApp anda.");
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
      const response = await fetch(`/app/native-whatsapp/api/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...artifact, status }),
      });
      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || !data.artifact) throw new Error(data.error || "Artifact tidak dapat disimpan.");
      setArtifact(data.artifact);
      setTelemetry(data.telemetry || telemetry);
      const copied = copyAfter ? await copyTextSafely(renderWhatsAppDraftText(data.artifact)) : false;
      setMessage(copyAfter
        ? copied
          ? "Artifact diluluskan dan disalin. Tampal ke WhatsApp anda."
          : "Artifact diluluskan. Salinan automatik disekat pelayar — gunakan butang Salin."
        : "Perubahan disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka.");
    } finally {
      setBusy(false);
    }
  }

  function updateArtifact<K extends keyof WhatsAppDraftArtifact>(key: K, value: WhatsAppDraftArtifact[K]) {
    setArtifact((current) => current ? { ...current, [key]: value } : current);
  }

  async function copyCurrentArtifact() {
    if (!artifact) return;
    const copied = await copyTextSafely(renderWhatsAppDraftText(artifact));
    setMessage(copied ? "Draf disalin. Tampal ke WhatsApp anda." : "Salinan disekat pelayar. Pilih dan salin teks secara manual.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <form onSubmit={generate} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Goal Launcher</p>
            <h2 className="mt-1 text-xl font-bold">Balas WhatsApp</h2>
            <p className="mt-1 text-sm text-neutral-500">Tampal mesej pelanggan. Draf balasan disediakan — anda semak, luluskan dan salin sendiri. Tiada penghantaran automatik.</p>
          </div>
          {request.sourceOfferId && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            Merujuk Offer diluluskan #{request.sourceOfferId}{sourceOfferLabel ? `: ${sourceOfferLabel}` : ""}.
          </div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">Niat balasan
              <select className={inputClass} value={request.replyIntent} onChange={(event) => setField("replyIntent", event.target.value as NativeWhatsAppRequest["replyIntent"])}>
                {(Object.keys(INTENT_LABELS) as NativeWhatsAppRequest["replyIntent"][]).map((intent) => (
                  <option key={intent} value={intent}>{INTENT_LABELS[intent]}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Rujuk Offer diluluskan (pilihan)
              <select
                className={inputClass}
                value={request.sourceOfferId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setRequest((current) => ({
                    ...current,
                    sourceOfferId: value ? Number(value) : null,
                    entry: value ? "from_offer" : "standalone",
                  }));
                }}
              >
                <option value="">— Tiada —</option>
                {approvedOffers.map((offer) => (
                  <option key={offer.id} value={offer.id}>#{offer.id} · {offer.headline.slice(0, 60)}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">Mesej pelanggan *
            <textarea className={inputClass} rows={4} required maxLength={800} value={request.customerMessage} onChange={(event) => setField("customerMessage", event.target.value)} placeholder="Tampal mesej WhatsApp yang anda terima di sini" />
          </label>
          <label className="grid gap-1 text-sm font-medium">Nama pelanggan (pilihan)
            <input className={inputClass} maxLength={80} value={request.customerName} onChange={(event) => setField("customerName", event.target.value)} placeholder="Contoh: Puan Aisyah" />
          </label>
          <label className="grid gap-1 text-sm font-medium">Nota tambahan (pilihan)
            <textarea className={inputClass} rows={2} maxLength={300} value={request.extraNote} onChange={(event) => setField("extraNote", event.target.value)} placeholder="Contoh: Stok tinggal 3, boleh pos esok" />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">Cap: 20/jam · 100/bulan · tiada penghantaran automatik</p>
            <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-emerald-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
              {busy ? "Menyiapkan…" : "Jana Draf Balasan"}
            </button>
          </div>
        </form>

        {(message || warning) && <div className="space-y-2" aria-live="polite">
          {message && <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{message}</p>}
          {warning && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{warning}</p>}
        </div>}

        {artifact && <section className="space-y-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase text-emerald-600">Draf Balasan WhatsApp</p><h2 className="text-xl font-bold">{INTENT_LABELS[artifact.replyIntent]}</h2></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${artifact.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"}`}>{artifact.status === "approved" ? "DILULUSKAN" : "DRAF"}</span>
          </div>
          <label className="grid gap-1 text-sm font-bold">Sapaan
            <input className={inputClass} maxLength={400} value={artifact.greeting} onChange={(event) => updateArtifact("greeting", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Pengesahan
            <textarea className={inputClass} rows={2} maxLength={500} value={artifact.acknowledgment} onChange={(event) => updateArtifact("acknowledgment", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Badan mesej
            <textarea className={inputClass} rows={6} maxLength={1200} value={artifact.body} onChange={(event) => updateArtifact("body", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Langkah seterusnya
            <textarea className={inputClass} rows={2} maxLength={400} value={artifact.nextStep} onChange={(event) => updateArtifact("nextStep", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Tandatangan
            <input className={inputClass} maxLength={120} value={artifact.signOff} onChange={(event) => updateArtifact("signOff", event.target.value)} />
          </label>
          {artifact.assumptions.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><strong>Andaian:</strong> {artifact.assumptions.join(" ")}</div>}
          <div className="flex flex-wrap justify-end gap-2">
            {artifactId && <Link href={`/app/native-whatsapp/${artifactId}`} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium dark:border-zinc-700">Pautan buka semula</Link>}
            <button type="button" disabled={busy} onClick={copyCurrentArtifact} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Salin</button>
            <button type="button" disabled={busy} onClick={() => save("draft")} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Simpan Draf</button>
            <button type="button" disabled={busy} onClick={() => save("approved", true)} className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Lulus & Salin</button>
          </div>
        </section>}
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-bold">Business Context digunakan</h2>
          <dl className="mt-3 space-y-3">
            {[["Bisnes", business.businessName], ["Produk", business.products], ["Pelanggan", business.targetCustomer], ["Julat harga", business.priceRange || "—"]].map(([label, value]) => (
              <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</dt><dd className="text-sm">{value}</dd></div>
            ))}
          </dl>
        </section>
        {telemetry && <section className="rounded-2xl border border-zinc-200 p-4 text-xs dark:border-zinc-800">
          <h2 className="text-sm font-bold">Generation evidence</h2>
          <dl className="mt-3 space-y-2 text-neutral-500"><div className="flex justify-between"><dt>Mode</dt><dd>{telemetry.mode}</dd></div><div className="flex justify-between"><dt>Model</dt><dd>{telemetry.model}</dd></div><div className="flex justify-between"><dt>Latency</dt><dd>{telemetry.latencyMs}ms</dd></div><div className="flex justify-between"><dt>Kos</dt><dd>{telemetry.estimatedCostRm === null ? "TBD" : `RM${telemetry.estimatedCostRm.toFixed(4)}`}</dd></div></dl>
        </section>}
        <p className="rounded-xl bg-zinc-100 p-3 text-xs text-neutral-500 dark:bg-zinc-900">Draf sahaja — penghantaran WhatsApp dibuat oleh anda secara manual. Tiada mesej dihantar secara automatik.</p>
      </aside>
    </div>
  );
}
