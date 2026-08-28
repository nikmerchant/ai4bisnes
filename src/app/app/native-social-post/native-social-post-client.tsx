"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  renderSocialPostText,
  type BusinessContextSnapshot,
  type GenerationTelemetry,
  type NativeSocialPostRequest,
  type SocialPostArtifact,
} from "@/lib/native-social-post/domain";

export type NativeSocialPostInitial = {
  id: number;
  artifact: SocialPostArtifact;
  request: NativeSocialPostRequest;
  telemetry: GenerationTelemetry;
} | null;

type GenerateResponse = {
  artifactId?: number;
  artifact?: SocialPostArtifact;
  telemetry?: GenerationTelemetry;
  warning?: string | null;
  error?: string;
};

const inputClass = "min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function NativeSocialPostClient({
  business,
  initial,
}: {
  business: BusinessContextSnapshot;
  initial: NativeSocialPostInitial;
}) {
  const [request, setRequest] = useState<NativeSocialPostRequest>(initial?.request ?? {
    platform: "instagram",
    objective: "sales",
    angle: "problem_solution",
    topic: "",
    offer: "",
    extraInstruction: "",
  });
  const [artifactId, setArtifactId] = useState<number | null>(initial?.id ?? null);
  const [artifact, setArtifact] = useState<SocialPostArtifact | null>(initial?.artifact ?? null);
  const [telemetry, setTelemetry] = useState<GenerationTelemetry | null>(initial?.telemetry ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState(initial ? "Artifact dibuka semula." : "");
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  const contextFacts = useMemo(() => [
    ["Bisnes", business.businessName],
    ["Produk", business.products],
    ["Pelanggan", business.targetCustomer],
    ["Gaya", business.toneOfVoice],
  ], [business]);

  function setField<K extends keyof NativeSocialPostRequest>(key: K, value: NativeSocialPostRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Memahami matlamat dan menggunakan Business Context…");
    setWarning(null);
    requestIdRef.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/app/native-social-post/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestIdRef.current, ...request }),
      });
      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || !data.artifact || !data.artifactId || !data.telemetry) {
        throw new Error(data.error || "Social Post tidak dapat dijana.");
      }
      setArtifactId(data.artifactId);
      setArtifact(data.artifact);
      setTelemetry(data.telemetry);
      setWarning(data.warning || null);
      setMessage("Social Post dijana dan disimpan sebagai DRAF.");
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
      const response = await fetch(`/app/native-social-post/api/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...artifact, status }),
      });
      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || !data.artifact) throw new Error(data.error || "Artifact tidak dapat disimpan.");
      setArtifact(data.artifact);
      setTelemetry(data.telemetry || telemetry);
      if (copyAfter) await navigator.clipboard.writeText(renderSocialPostText(data.artifact));
      setMessage(copyAfter ? "Artifact diluluskan dan disalin." : "Perubahan disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ralat tidak dijangka.");
    } finally {
      setBusy(false);
    }
  }

  function updateArtifact<K extends keyof SocialPostArtifact>(key: K, value: SocialPostArtifact[K]) {
    setArtifact((current) => current ? { ...current, [key]: value } : current);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <form onSubmit={generate} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Goal Launcher</p>
            <h2 className="mt-1 text-xl font-bold">Sediakan Social Post</h2>
            <p className="mt-1 text-sm text-neutral-500">Business Context diisi automatik. Jawab hanya perkara yang khusus untuk post ini.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium">Platform
              <select className={inputClass} value={request.platform} onChange={(event) => setField("platform", event.target.value as NativeSocialPostRequest["platform"])}>
                <option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Objektif
              <select className={inputClass} value={request.objective} onChange={(event) => setField("objective", event.target.value as NativeSocialPostRequest["objective"])}>
                <option value="sales">Jualan</option><option value="engagement">Engagement</option><option value="awareness">Awareness</option><option value="leads">Leads</option><option value="education">Pendidikan</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Angle
              <select className={inputClass} value={request.angle} onChange={(event) => setField("angle", event.target.value as NativeSocialPostRequest["angle"])}>
                <option value="problem_solution">Masalah → Penyelesaian</option><option value="story">Cerita</option><option value="education">Pendidikan</option><option value="social_proof">Bukti sosial</option><option value="promotion">Promosi</option><option value="behind_scenes">Di sebalik tabir</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">Topik *
            <input className={inputClass} required maxLength={200} value={request.topic} onChange={(event) => setField("topic", event.target.value)} placeholder="Contoh: Promosi set lunch minggu ini" />
          </label>
          <label className="grid gap-1 text-sm font-medium">Tawaran (pilihan)
            <input className={inputClass} maxLength={300} value={request.offer} onChange={(event) => setField("offer", event.target.value)} placeholder="Contoh: Set lunch RM12" />
          </label>
          <label className="grid gap-1 text-sm font-medium">Arahan tambahan (pilihan)
            <textarea className={inputClass} rows={2} maxLength={300} value={request.extraInstruction} onChange={(event) => setField("extraInstruction", event.target.value)} placeholder="Contoh: Ringkas, sesuai untuk pekerja pejabat" />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">Candidate cap: 20/jam · 100/bulan · tiada post dihantar</p>
            <button disabled={busy} className="min-h-11 rounded-lg bg-violet-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50">
              {busy ? "Menyiapkan…" : "Jana Social Post"}
            </button>
          </div>
        </form>

        {(message || warning) && <div className="space-y-2" aria-live="polite">
          {message && <p className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{message}</p>}
          {warning && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{warning}</p>}
        </div>}

        {artifact && <section className="space-y-4 rounded-2xl border-2 border-violet-300 bg-violet-50/40 p-5 dark:border-violet-900 dark:bg-violet-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase text-violet-600">Structured Artifact</p><h2 className="text-xl font-bold">Social Post · {artifact.platform}</h2></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${artifact.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"}`}>{artifact.status === "approved" ? "DILULUSKAN" : "DRAF"}</span>
          </div>
          <label className="grid gap-1 text-sm font-bold">Hook
            <textarea className={inputClass} rows={2} maxLength={500} value={artifact.hook} onChange={(event) => updateArtifact("hook", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Body
            <textarea className={inputClass} rows={5} maxLength={2000} value={artifact.body} onChange={(event) => updateArtifact("body", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Call-to-action
            <textarea className={inputClass} rows={2} maxLength={500} value={artifact.callToAction} onChange={(event) => updateArtifact("callToAction", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">Hashtag
            <input className={inputClass} value={artifact.hashtags.join(" ")} onChange={(event) => updateArtifact("hashtags", event.target.value.split(/[\s,]+/).filter(Boolean).slice(0, 10))} />
          </label>
          {artifact.assumptions.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><strong>Andaian:</strong> {artifact.assumptions.join(" ")}</div>}
          <div className="flex flex-wrap justify-end gap-2">
            {artifactId && <Link href={`/app/native-social-post/${artifactId}`} className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium dark:border-zinc-700">Pautan buka semula</Link>}
            {artifactId && artifact.status === "approved" && <Link href={`/app/native-offer?sourcePostId=${artifactId}`} className="min-h-11 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200">Bina Tawaran →</Link>}
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
        <p className="rounded-xl bg-zinc-100 p-3 text-xs text-neutral-500 dark:bg-zinc-900">Slice 1 lokal/staging sahaja. Tiada publish, scheduling atau WhatsApp send.</p>
      </aside>
    </div>
  );
}
