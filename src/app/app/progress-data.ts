
export type ProgressData = {
  toolsUsedThisMonth: number;
  assetsCreatedTotal: number;
  assetsThisMonth: number;
  streakDays: number;
  lastActive: string | null;
  completedPek: number;
  totalPek: number;
  activeCampaign: { title: string; progress: number } | null;
  nextAction: string;
};

// Aktiviti yang dikira sebagai "tool digunakan"
const TOOL_ACTIVITIES = [
    "view_prompt",
    "copy_prompt",
    "save_vault",
    "ajar_ai",
    "pek_open",
    "coaching_open",
] as const;

// Tindakan disyorkan berdasarkan aktiviti
function getNextAction(stats: {
  daysSinceLastActive: number;
  vaultCount: number;
  hasFavs: boolean;
  tier: string;
  pekOpened: boolean;
}): string {
  if (stats.daysSinceLastActive >= 7)
    return "Selamat datang kembali! Lihat prompt terbaru di Library.";
  if (stats.tier === "basic" && stats.vaultCount === 0)
    return "Simpan prompt pertama anda ke Vault untuk mula.";

  // Cek jika ada pek bulanan belum dibuka
  const now = new Date();
  const dayOfMonth = now.getDate();
  if (dayOfMonth >= 5 && !stats.pekOpened)
    return "Pek Kempen bulanan sedia! Buka sekarang untuk bersedia.";

  if (!stats.hasFavs)
    return "Tanda prompt kegemaran untuk akses pantas.";

  if (stats.vaultCount < 3)
    return "Tambah lagi prompt ke Vault untuk toolkit lengkap.";

  return "Cuba prompt Marketing & Iklan untuk kempen baru!";
}

export async function getProgressData(
  supabase: any,
  userId: string,
  tier: string
): Promise<ProgressData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Parallel queries for everything we need
  const [vaultItems, favorites, ajarAICount, pekVisits] = await Promise.all([
    // Vault items
    supabase
      .from("vault_items")
      .select("id, created_at")
      .eq("user_id", userId),

    // Favourites
    supabase
      .from("favorites")
      .select("prompt_id, created_at")
      .eq("user_id", userId),

    // Ajar-AI saves
    supabase
      .from("ajar_ai_sessions")
      .select("id, created_at")
      .eq("user_id", userId)
      .maybeSingle(),

    // Pek visits (if we track this)
    Promise.resolve({ data: null }),
  ]);

  // Calculate metrics
  const vaultAll = vaultItems.data ?? [];
  const vaultThisMonth = vaultAll.filter(
    (v: any) => v.created_at >= startOfMonth
  );
  const favAll = favorites.data ?? [];
  const favThisMonth = favAll.filter(
    (f: any) => f.created_at >= startOfMonth
  );

  // Tools used = unique activities this month
  const toolsThisMonth =
    vaultThisMonth.length + favThisMonth.length + (ajarAICount.data ? 1 : 0);

  // Total assets created
  const assetsTotal = vaultAll.length + favAll.length;

  // Days since last active (from most recent activity)
  const allDates = [
    ...vaultAll.map((v: any) => v.created_at),
    ...favAll.map((f: any) => f.created_at),
  ].filter(Boolean);

  const lastActive = allDates.length
    ? allDates.sort().reverse()[0]
    : null;

  const daysSinceLastActive = lastActive
    ? Math.floor((now.getTime() - new Date(lastActive).getTime()) / 86400000)
    : 999;

  // Simple streak calculation
  const streakDays = daysSinceLastActive < 2 ? (daysSinceLastActive === 0 ? 2 : 1) : 0;

  // Active campaign — use current month's pek
  const monthNames = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember",
  ];
  const currentMonth = monthNames[now.getMonth()];

  // Determine campaign progress
  let campaign: { title: string; progress: number } | null = null;

  if (tier !== "basic") {
    // Progress based on how many prompts they've used this month
    const progressPct = Math.min(
      100,
      Math.round((toolsThisMonth / 5) * 100)
    );
    campaign = {
      title: `Kempen ${currentMonth}`,
      progress: progressPct,
    };
  }

  // Get next recommended action
  const nextAction = getNextAction({
    daysSinceLastActive,
    vaultCount: vaultAll.length,
    hasFavs: favAll.length > 0,
    tier,
    pekOpened: !!pekVisits.data,
  });

  return {
    toolsUsedThisMonth: toolsThisMonth,
    assetsCreatedTotal: assetsTotal,
    assetsThisMonth: vaultThisMonth.length + favThisMonth.length,
    streakDays,
    lastActive,
    completedPek: 0,
    totalPek: 0,
    activeCampaign: campaign,
    nextAction,
  };
}
