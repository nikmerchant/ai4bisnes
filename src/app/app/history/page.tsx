import Link from "next/link";
import { dapatkanProfil } from "@/app/app/shared";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffH = Math.floor((now - then) / 3600000);
  if (diffH < 1) return "Baru sahaja";
  if (diffH < 24) return `${diffH} jam lalu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Semalam";
  if (diffD < 7) return `${diffD} hari lalu`;
  return new Date(dateStr).toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "short",
  });
}

const TASK_EMOJIS: Record<string, string> = {
  "tiktok-script": "🎬",
  "social-post": "📱",
  "whatsapp-reply": "💬",
  "follow-up": "🔥",
  "product-desc": "✍️",
  "ad-copy": "📢",
  "closing-script": "💰",
  "offer-generator": "🎁",
  "objection-handler": "🛡️",
  "customer-persona": "🎯",
};

export default async function HistoryPage() {
  const { supabase, user } = await dapatkanProfil();

  const { data: outputs } = await supabase
    .from("generated_outputs")
    .select("id, task_slug, task_title, inputs, prompt_text, feedback, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Count this month's usage
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  const { count } = await supabase
    .from("generated_outputs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link href="/app" className="mb-4 inline-block text-sm text-neutral-500 underline">
        ← Dashboard
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📋 Sejarah Tugasan</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Semua prompt yang anda telah jana.
          </p>
        </div>
        <div className="rounded-xl bg-violet-100 px-4 py-2 text-center dark:bg-violet-900">
          <p className="text-2xl font-extrabold text-violet-700 dark:text-violet-300">
            {count ?? 0}
          </p>
          <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
            bulan ini
          </p>
        </div>
      </div>

      {(outputs ?? []).length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-4xl">📭</p>
          <p className="mt-2 text-sm text-neutral-500">
            Belum ada sejarah. Mulakan dengan menjana prompt baharu!
          </p>
          <Link
            href="/app/wizard"
            className="mt-4 inline-block rounded-full bg-violet-600 px-6 py-2 text-sm font-bold text-white"
          >
            Pilih Tugasan →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(outputs ?? []).map((item: any) => {
            const emoji = TASK_EMOJIS[item.task_slug] || "📝";
            const inputs = item.inputs || {};
            const inputSummary = Object.values(inputs)
              .filter(Boolean)
              .slice(0, 2)
              .map((v: any) => String(v).slice(0, 40))
              .join(" · ");

            return (
              <details
                key={item.id}
                className="group rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <summary className="flex cursor-pointer items-center justify-between p-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-xl">{emoji}</span>
                    <div className="overflow-hidden">
                      <p className="truncate text-sm font-bold">
                        {item.task_title}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {inputSummary || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.feedback === "good" && (
                      <span className="text-xs">👍</span>
                    )}
                    {item.feedback === "bad" && (
                      <span className="text-xs">👎</span>
                    )}
                    <span className="text-xs text-neutral-400">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                </summary>

                <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
                  <pre className="whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                    {item.prompt_text}
                  </pre>

                  {/* Copy + Feedback */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(item.prompt_text);
                      }}
                    >
                      📋 Copy
                    </button>

                    {!item.feedback && (
                      <>
                        <button
                          className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                          onClick={async (e) => {
                            e.preventDefault();
                            await fetch("/app/wizard/feedback", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                id: item.id,
                                feedback: "good",
                              }),
                            });
                            window.location.reload();
                          }}
                        >
                          👍 Bagus
                        </button>
                        <button
                          className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-900 dark:text-red-300"
                          onClick={async (e) => {
                            e.preventDefault();
                            await fetch("/app/wizard/feedback", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                id: item.id,
                                feedback: "bad",
                              }),
                            });
                            window.location.reload();
                          }}
                        >
                          👎 Tak relevan
                        </button>
                      </>
                    )}
                    {item.feedback && (
                      <span className="text-xs text-neutral-400">
                        Feedback: {item.feedback === "good" ? "👍" : "👎"}
                      </span>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
