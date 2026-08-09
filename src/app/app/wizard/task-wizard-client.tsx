"use client";

import { useState } from "react";

/* Client component — form wizard + copy output */
export function TaskWizardClient({
  slug,
  taskTitle,
  taskEmoji,
  fields,
}: {
  slug: string;
  taskTitle: string;
  taskEmoji: string;
  fields: {
    name: string;
    label: string;
    type: "text" | "textarea" | "select" | "number";
    placeholder?: string;
    options?: string[];
    required?: boolean;
    defaultValue?: string;
  }[];
}) {
  const [generated, setGenerated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("slug", slug);

    try {
      const res = await fetch("/app/wizard/api", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setGenerated(data.prompt);
    } catch {
      setGenerated("Maaf, ralat berlaku. Sila cuba lagi.");
    }
    setLoading(false);
  }

  function copyToClipboard() {
    if (!generated) return;
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputCls =
    "rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <div className="flex flex-col gap-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
        <span className={generated ? "text-emerald-500" : "text-violet-600"}>
          ① Isi borang
        </span>
        <span>→</span>
        <span className={generated ? "text-violet-600" : ""}>② Copy prompt</span>
        <span>→</span>
        <span className={generated ? "text-violet-600" : ""}>
          ③ Tampal ke ChatGPT
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {fields.map((f) => (
          <label key={f.name} className="flex flex-col gap-1 text-sm font-medium">
            {f.label}
            {f.required && <span className="text-red-500">*</span>}
            {f.type === "textarea" ? (
              <textarea
                name={f.name}
                rows={3}
                placeholder={f.placeholder}
                required={f.required}
                defaultValue={f.defaultValue}
                className={inputCls}
              />
            ) : f.type === "select" ? (
              <select
                name={f.name}
                required={f.required}
                defaultValue={f.defaultValue || ""}
                className={inputCls}
              >
                <option value="">— Pilih —</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={f.name}
                type={f.type === "number" ? "number" : "text"}
                placeholder={f.placeholder}
                required={f.required}
                defaultValue={f.defaultValue}
                className={inputCls}
              />
            )}
          </label>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-violet-600 py-2.5 font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "⏳ Menjana..." : `${taskEmoji} Jana Prompt`}
        </button>
      </form>

      {/* Output */}
      {generated && (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border-2 border-violet-300 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">📝 Prompt anda siap!</span>
              <button
                onClick={copyToClipboard}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all active:opacity-80 ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-violet-600 text-white hover:scale-105"
                }`}
              >
                {copied ? "✅ Disalin!" : "📋 Copy"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {generated}
            </pre>
          </div>

          {/* Next steps */}
          <div className="rounded-xl bg-zinc-100 p-3 text-xs text-neutral-600 dark:bg-zinc-900 dark:text-neutral-400">
            <p className="font-bold">Langkah seterusnya:</p>
            <ol className="ml-4 mt-1 list-decimal space-y-0.5">
              <li>Copy prompt di atas</li>
              <li>
                Buka{" "}
                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  className="text-violet-600 underline"
                >
                  ChatGPT
                </a>{" "}
                /{" "}
                <a
                  href="https://claude.ai"
                  target="_blank"
                  className="text-violet-600 underline"
                >
                  Claude
                </a>
              </li>
              <li>Tampal &amp; hantar</li>
              <li>Copy hasil balik &amp; guna untuk bisnes anda</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
