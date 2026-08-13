"use client";

import { useEffect, useState } from "react";
import type { ContentCalendarInputs, PlanArtifact, PlanItem, SavedPlan } from "../plan-engine/types";

const DRAFT_KEY = "ai4bisnes-content-calendar-draft-v1";
const PLATFORMS = ["Facebook", "Instagram", "TikTok", "LinkedIn", "WhatsApp"];
const inputClass = "rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

type Draft = {
  generatedOutputId?: number;
  prompt?: string;
  rawResponse?: string;
  inputs?: {
    startDate: string;
    platforms: string[];
    frequency: "3 seminggu" | "5 seminggu" | "Setiap hari";
    objective: string;
    notes: string;
  };
};

async function post(body: Record<string, unknown>) {
  const res = await fetch("/app/content-calendar/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ralat berlaku.");
  return data;
}

function ItemCard({ item, onChange }: { item: PlanItem; onChange: (next: PlanItem) => void }) {
  const [open, setOpen] = useState(false);
  const date = new Intl.DateTimeFormat("ms-MY", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(`${item.date}T00:00:00+08:00`));
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
          <span>Hari {item.day_number} · {date}</span>
          <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-700 dark:bg-violet-950 dark:text-violet-300">{item.status}</span>
        </div>
        <h3 className="mt-2 font-bold">{item.headline}</h3>
        <p className="mt-1 text-xs text-neutral-500">{item.channel || "Platform"} · {item.format || "Format"}</p>
      </button>
      {open && (
        <div className="mt-4 grid gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <label className="grid gap-1 text-xs font-medium">Tarikh<input className={inputClass} type="date" value={item.date} onChange={(e) => onChange({ ...item, date: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-medium">Tajuk<input className={inputClass} value={item.headline} maxLength={240} onChange={(e) => onChange({ ...item, headline: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-xs font-medium">Platform<input className={inputClass} value={item.channel} maxLength={60} onChange={(e) => onChange({ ...item, channel: e.target.value })} /></label>
            <label className="grid gap-1 text-xs font-medium">Format<input className={inputClass} value={item.format} maxLength={60} onChange={(e) => onChange({ ...item, format: e.target.value })} /></label>
          </div>
          <label className="grid gap-1 text-xs font-medium">Idea / arahan<textarea className={inputClass} rows={3} value={item.details} maxLength={2000} onChange={(e) => onChange({ ...item, details: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-medium">Kapsyen<textarea className={inputClass} rows={4} value={item.caption} maxLength={5000} onChange={(e) => onChange({ ...item, caption: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-medium">CTA<input className={inputClass} value={item.cta} maxLength={500} onChange={(e) => onChange({ ...item, cta: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-medium">Status<select className={inputClass} value={item.status} onChange={(e) => onChange({ ...item, status: e.target.value as PlanItem["status"] })}>{["planned", "drafted", "approved", "scheduled", "published", "skipped"].map((status) => <option key={status}>{status}</option>)}</select></label>
        </div>
      )}
    </article>
  );
}

export function ContentCalendarClient({ savedPlans }: { savedPlans: SavedPlan[] }) {
  const [draft, setDraft] = useState<Draft>({});
  const [prompt, setPrompt] = useState("");
  const [generatedOutputId, setGeneratedOutputId] = useState<number>();
  const [rawResponse, setRawResponse] = useState("");
  const [artifact, setArtifact] = useState<PlanArtifact>();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [inputs, setInputs] = useState<Draft["inputs"]>({ startDate: new Date().toISOString().slice(0, 10), platforms: ["Facebook"], frequency: "Setiap hari", objective: "Dapatkan pertanyaan WhatsApp", notes: "" });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      try {
        const value = JSON.parse(saved) as Draft;
        setDraft(value);
        if (value.inputs) setInputs(value.inputs);
        if (value.prompt) setPrompt(value.prompt);
        if (value.generatedOutputId) setGeneratedOutputId(value.generatedOutputId);
        if (value.rawResponse) setRawResponse(value.rawResponse);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function persist(next: Draft) {
    setDraft(next);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  }

  function togglePlatform(platform: string) {
    if (!inputs) return;
    const platforms = inputs.platforms.includes(platform) ? inputs.platforms.filter((item) => item !== platform) : [...inputs.platforms, platform];
    setInputs({ ...inputs, platforms });
  }

  async function preparePrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!inputs) return;
    setLoading(true); setMessage("");
    try {
      const data = await post({ action: "prompt", inputs });
      setPrompt(data.prompt); setGeneratedOutputId(data.generatedOutputId);
      persist({ inputs, prompt: data.prompt, generatedOutputId: data.generatedOutputId });
    } catch (err) { setMessage(err instanceof Error ? err.message : "Ralat berlaku."); }
    setLoading(false);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  async function importResponse() {
    if (!generatedOutputId) return;
    setLoading(true); setMessage("");
    try {
      const data = await post({ action: "import", generatedOutputId, rawResponse });
      setArtifact(data.artifact);
      persist({ ...draft, inputs, prompt, generatedOutputId, rawResponse });
      setMessage(`${data.artifact.items.length} item berjaya disusun. Semak sebelum simpan perubahan.`);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Ralat berlaku."); }
    setLoading(false);
  }

  function updateItem(index: number, item: PlanItem) {
    if (!artifact) return;
    setArtifact({ ...artifact, items: artifact.items.map((current, i) => i === index ? item : current) });
  }

  async function saveChanges() {
    if (!artifact || !generatedOutputId) return;
    setLoading(true); setMessage("");
    try {
      await post({ action: "update", outputId: generatedOutputId, artifact });
      setMessage("✓ Kalendar kandungan telah disimpan.");
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Ralat berlaku."); }
    setLoading(false);
  }

  function loadSaved(plan: SavedPlan) {
    setGeneratedOutputId(plan.outputId);
    setArtifact(plan.artifact);
    setPrompt("");
    setRawResponse("");
    setMessage("");
  }

  function startNew() {
    setGeneratedOutputId(undefined);
    setArtifact(undefined);
    setPrompt("");
    setRawResponse("");
    setMessage("");
    persist({ inputs });
  }

  return (
    <div className="grid gap-6">
      {!prompt && !artifact && savedPlans.length > 0 && (
        <section className="grid gap-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-bold">Kalendar tersimpan</h2>
          {savedPlans.map((plan) => (
            <button key={plan.outputId} type="button" onClick={() => loadSaved(plan)} className="rounded-xl bg-zinc-100 p-3 text-left dark:bg-zinc-900">
              <span className="font-medium">{plan.artifact.title}</span>
              <span className="mt-1 block text-xs text-neutral-500">{plan.artifact.items.length} item · {plan.artifact.start_date} hingga {plan.artifact.end_date}</span>
            </button>
          ))}
          <p className="text-xs text-neutral-500">Atau cipta kalendar baharu menggunakan borang di bawah.</p>
        </section>
      )}
      {!prompt && !artifact && (
        <form onSubmit={preparePrompt} className="grid gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div><h2 className="font-bold">1. Sediakan kalendar</h2><p className="text-xs text-neutral-500">Profil bisnes digunakan secara automatik. Tiada data dihantar ke AI.</p></div>
          <label className="grid gap-1 text-sm font-medium">Tarikh mula<input type="date" className={inputClass} required value={inputs?.startDate} onChange={(e) => inputs && setInputs({ ...inputs, startDate: e.target.value })} /></label>
          <fieldset className="grid gap-2"><legend className="text-sm font-medium">Platform</legend><div className="flex flex-wrap gap-2">{PLATFORMS.map((platform) => <button type="button" key={platform} onClick={() => togglePlatform(platform)} className={`rounded-full border px-3 py-1.5 text-xs ${inputs?.platforms.includes(platform) ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>{platform}</button>)}</div></fieldset>
          <label className="grid gap-1 text-sm font-medium">Kekerapan<select className={inputClass} value={inputs?.frequency} onChange={(e) => inputs && setInputs({ ...inputs, frequency: e.target.value as ContentCalendarInputs["frequency"] })}><option>3 seminggu</option><option>5 seminggu</option><option>Setiap hari</option></select></label>
          <label className="grid gap-1 text-sm font-medium">Matlamat kandungan<input className={inputClass} maxLength={120} required value={inputs?.objective} onChange={(e) => inputs && setInputs({ ...inputs, objective: e.target.value })} /></label>
          <label className="grid gap-1 text-sm font-medium">Nota tambahan (pilihan)<textarea className={inputClass} maxLength={1000} rows={3} value={inputs?.notes} onChange={(e) => inputs && setInputs({ ...inputs, notes: e.target.value })} /></label>
          <button disabled={loading} className="rounded-full bg-violet-600 py-3 font-bold text-white disabled:opacity-50">{loading ? "Menyediakan..." : "Sediakan arahan untuk AI"}</button>
        </form>
      )}

      {prompt && !artifact && (
        <section className="grid gap-4 rounded-2xl border-2 border-violet-300 p-5 dark:border-violet-800">
          <div><h2 className="font-bold">2. Jana dengan AI</h2><p className="text-xs text-neutral-500">Salin arahan, buka AI pilihan, kemudian kembali dan tampal jawapannya.</p></div>
          <button onClick={copyPrompt} className="rounded-full bg-violet-600 py-3 font-bold text-white">{copied ? "✓ Arahan disalin" : "Salin arahan"}</button>
          <div className="flex flex-wrap gap-3 text-sm"><a className="underline" target="_blank" href="https://chatgpt.com">Buka ChatGPT ↗</a><a className="underline" target="_blank" href="https://gemini.google.com">Buka Gemini ↗</a><a className="underline" target="_blank" href="https://claude.ai">Buka Claude ↗</a></div>
          <details><summary className="cursor-pointer text-xs text-neutral-500">Lihat arahan penuh</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-zinc-100 p-3 text-xs dark:bg-zinc-900">{prompt}</pre></details>
          <label className="grid gap-1 text-sm font-medium">3. Tampal jawapan AI di sini<textarea className={inputClass} rows={10} maxLength={262144} placeholder="Tampal keseluruhan jawapan daripada AI. Tidak mengapa jika ada penerangan tambahan." value={rawResponse} onChange={(e) => { setRawResponse(e.target.value); persist({ ...draft, inputs, prompt, generatedOutputId, rawResponse: e.target.value }); }} /></label>
          <button disabled={loading || !rawResponse.trim()} onClick={importResponse} className="rounded-full bg-emerald-600 py-3 font-bold text-white disabled:opacity-50">{loading ? "Menyemak..." : "Semak jawapan"}</button>
          <button onClick={() => { setPrompt(""); setGeneratedOutputId(undefined); persist({ inputs }); }} className="text-xs text-neutral-500 underline">Ubah input</button>
        </section>
      )}

      {artifact && (
        <section className="grid gap-4">
          <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-950"><h2 className="font-bold">4. Semak & simpan</h2><p className="text-sm">{artifact.title} · {artifact.items.length} item</p></div>
          {artifact.items.map((item, index) => <ItemCard key={`${item.date}-${index}`} item={item} onChange={(next) => updateItem(index, next)} />)}
          <button disabled={loading} onClick={saveChanges} className="sticky bottom-4 rounded-full bg-violet-600 py-3 font-bold text-white shadow-lg disabled:opacity-50">{loading ? "Menyimpan..." : "Simpan kalendar"}</button>
          <button type="button" onClick={startNew} className="text-sm text-neutral-500 underline">Cipta kalendar baharu</button>
        </section>
      )}
      {message && <p role="status" className={`rounded-xl p-3 text-sm ${message.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{message}</p>}
    </div>
  );
}
