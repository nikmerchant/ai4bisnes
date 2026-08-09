import { redirect } from "next/navigation";
import { dapatkanProfil, PANGKAT } from "@/app/app/shared";
import { TASKS, getTask, generatePrompt } from "./tasks";
import { TaskWizardClient } from "./task-wizard-client";

const inputCls =
  "rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

/* Halaman utama wizard — senarai semua task */
export default async function WizardHub() {
  const { profil } = await dapatkanProfil();
  const pangkat = PANGKAT[profil.tier];

  const categories = [
    { id: "content", label: "Content", emoji: "🎬" },
    { id: "sales", label: "Sales", emoji: "💬" },
    { id: "marketing", label: "Marketing", emoji: "📈" },
    { id: "copywriting", label: "Copywriting", emoji: "✍️" },
  ] as const;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">Pilih Tugasan AI</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pilih apa yang anda mahu siapkan hari ini. Kami sediakan prompt siap —
        anda cuma copy ke ChatGPT/Claude.
      </p>

      {categories.map((cat) => {
        const tasks = TASKS.filter((t) => t.category === cat.id);
        if (tasks.length === 0) return null;

        return (
          <div key={cat.id} className="mt-8">
            <h2 className="mb-3 text-lg font-bold">
              {cat.emoji} {cat.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {tasks.map((t) => {
                const locked = PANGKAT[t.tier] > pangkat;
                const tierBadge =
                  t.tier === "max"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                    : "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300";

                if (locked) {
                  return (
                    <a
                      key={t.slug}
                      href="/naik-taraf"
                      className="block rounded-2xl border-2 border-dashed border-zinc-300 p-4 text-left transition-colors hover:border-violet-400 dark:border-zinc-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{t.emoji}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tierBadge}`}>
                          {t.tier === "max" ? "🏆 MAX" : "⚡ PRO"}
                        </span>
                      </div>
                      <h3 className="mt-2 font-bold">{t.title}</h3>
                      <p className="text-xs text-neutral-500">{t.desc}</p>
                      <p className="mt-2 text-xs font-medium text-violet-600">🔒 Naik taraf</p>
                    </a>
                  );
                }

                return (
                  <a
                    key={t.slug}
                    href={`/app/wizard/${t.slug}`}
                    className="block rounded-2xl border-2 border-zinc-200 bg-white p-4 text-left transition-all hover:scale-[1.02] hover:border-violet-400 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{t.emoji}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tierBadge}`}>
                        {t.tier === "max" ? "🏆 MAX" : "⚡ PRO"}
                      </span>
                    </div>
                    <h3 className="mt-2 font-bold">{t.title}</h3>
                    <p className="text-xs text-neutral-500">{t.desc}</p>
                    <p className="mt-2 text-xs font-medium text-violet-600">Mula →</p>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}
    </main>
  );
}
