import { getProgressData } from "./progress-data";
import { dapatkanProfil } from "./shared";

export async function BusinessProgress() {
  const { supabase, user, profil } = await dapatkanProfil();
  const progress = await getProgressData(supabase, user.id, profil.tier);

  const progressBars = [
    { label: "Tools digunakan bulan ini", value: progress.toolsUsedThisMonth, max: 10, emoji: "⚡" },
    { label: "Aset pemasaran dihasilkan", value: progress.assetsCreatedTotal, max: 20, emoji: "📝" },
  ];

  return (
    <div className="mb-8 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 dark:border-violet-900 dark:from-violet-950 dark:to-zinc-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight">
          🏆 Progres Bisnes Anda
        </h2>
        {progress.streakDays > 0 && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 dark:bg-orange-900 dark:text-orange-300">
            🔥 {progress.streakDays} hari berturut!
          </span>
        )}
      </div>

      {/* Statistik ringkas */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {progressBars.map((bar) => {
          const pct = Math.min(100, Math.round((bar.value / bar.max) * 100));
          return (
            <div
              key={bar.label}
              className="rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <span>{bar.emoji}</span>
                <span>{bar.label}</span>
              </div>
              <div className="mt-1.5 flex items-end gap-1">
                <span className="text-2xl font-extrabold tabular-nums">
                  {bar.value}
                </span>
                <span className="mb-1 text-xs text-zinc-400">/{bar.max}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Kempen aktif */}
      {progress.activeCampaign && (
        <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              📣 {progress.activeCampaign.title}
            </span>
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
              {progress.activeCampaign.progress}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
              style={{ width: `${progress.activeCampaign.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tindakan disyorkan */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-violet-100 p-3 dark:bg-violet-900/50">
        <span className="text-lg">💡</span>
        <div>
          <p className="text-xs font-bold text-violet-900 dark:text-violet-200">
            Tindakan seterusnya
          </p>
          <p className="text-xs text-violet-700 dark:text-violet-300">
            {progress.nextAction}
          </p>
        </div>
      </div>
    </div>
  );
}
