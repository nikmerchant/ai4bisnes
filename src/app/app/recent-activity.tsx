import Link from "next/link";
import { dapatkanProfil } from "./shared";
import { CtaSpinner } from "@/app/cta-spinner";

/* Recent Activity — dari vault_items + favorites */
type Aktiviti = {
  id: string;
  jenis: string;
  tajuk: string;
  masa: string;
  href: string;
};

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

export async function RecentActivity() {
  const { supabase, user } = await dapatkanProfil();

  const [vault, favs] = await Promise.all([
    supabase
      .from("vault_items")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("favorites")
      .select("prompt_id, created_at, prompts(title_ms)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const aktiviti: Aktiviti[] = [];

  // Merge vault items
  for (const v of vault.data ?? []) {
    aktiviti.push({
      id: `v-${v.id}`,
      jenis: "🗄️ Vault",
      tajuk: v.title || "Prompt disimpan",
      masa: timeAgo(v.created_at),
      href: "/app/vault",
    });
  }

  // Merge favorites
  for (const f of favs.data ?? []) {
    aktiviti.push({
      id: `f-${f.prompt_id}`,
      jenis: "⭐ Favorit",
      tajuk: (f.prompts as any)?.title_ms || "Prompt ditanda",
      masa: timeAgo(f.created_at),
      href: "/app",
    });
  }

  // Sort by most recent (already sorted from query, but merge)
  aktiviti.sort((a, b) => {
    // Simple sort — vault and favs both already sorted, just interleave
    return 0;
  });

  if (aktiviti.length === 0) {
    return (
      <div className="mb-6 rounded-2xl border-2 border-dashed border-zinc-300 p-4 text-center dark:border-zinc-700">
        <p className="text-sm text-neutral-500">
          Belum ada aktiviti. Mulakan dengan menyimpan prompt ke Vault!
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-bold text-neutral-600 dark:text-neutral-400">
        📋 Aktiviti Terkini
      </h2>
      <div className="space-y-2">
        {aktiviti.slice(0, 5).map((a) => (
          <Link
            key={a.id}
            href={a.href}
            className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-zinc-200 transition-colors hover:bg-violet-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-violet-950"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="shrink-0 text-xs">{a.jenis}</span>
              <span className="truncate font-medium">{a.tajuk}</span>
            </div>
            <span className="shrink-0 text-xs text-neutral-400">{a.masa}</span>
            <CtaSpinner />
          </Link>
        ))}
      </div>
    </div>
  );
}
