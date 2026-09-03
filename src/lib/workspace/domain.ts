export const WORKSPACE_BOARD_LIMIT = 30;

export type WorkspaceBoardKind = "social_post" | "offer" | "whatsapp" | "content_engine" | "wizard";
export type WorkspaceEngineKind = "content_review" | "content_create" | "visual_packaging" | "performance_learning" | null;
export type WorkspaceBoardStatus = "draft" | "approved";

export type WorkspaceBoardSourceRow = {
  id: number;
  title: string;
  status: WorkspaceBoardStatus;
  revision: number | null;
  updatedAt: string;
  engineKind?: WorkspaceEngineKind;
  platform?: string | null;
};

export type WorkspaceBoardItem = {
  kind: WorkspaceBoardKind;
  engineKind: WorkspaceEngineKind;
  artifactId: number;
  title: string;
  status: WorkspaceBoardStatus;
  revision: number | null;
  updatedAt: string;
  platform: string | null;
};

export type WorkspaceBoardSource = { kind: WorkspaceBoardKind; rows: WorkspaceBoardSourceRow[] };

/** Defensive row parsing: malformed DB rows are dropped, never crash the board. */
export function normalizeBoardRows(input: unknown): WorkspaceBoardSourceRow[] {
  if (!Array.isArray(input)) return [];
  const rows: WorkspaceBoardSourceRow[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const id = Number(row.id);
    const title = typeof row.title === "string" ? row.title : "";
    const status = row.status === "approved" ? "approved" : row.status === "draft" ? "draft" : null;
    const revision = row.revision === null || row.revision === undefined ? null : Number(row.revision);
    const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : null;
    if (!Number.isSafeInteger(id) || id < 1 || !title.trim() || !status || !updatedAt) continue;
    if (revision !== null && (!Number.isSafeInteger(revision) || revision < 1)) continue;
    const engineKind = row.engineKind === "content_review" || row.engineKind === "content_create" || row.engineKind === "visual_packaging" || row.engineKind === "performance_learning" ? row.engineKind : null;
    rows.push({ id, title: title.trim(), status, revision, updatedAt, engineKind, platform: typeof row.platform === "string" ? row.platform : null });
  }
  return rows;
}

/** Merge all sources, newest first, capped at the board limit. */
export function mergeBoardRows(sources: WorkspaceBoardSource[]): WorkspaceBoardItem[] {
  const items: WorkspaceBoardItem[] = [];
  for (const source of sources) {
    for (const row of normalizeBoardRows(source.rows)) {
      items.push({
        kind: source.kind,
        engineKind: row.engineKind ?? null,
        artifactId: row.id,
        title: row.title,
        status: row.status,
        revision: row.revision,
        updatedAt: row.updatedAt,
        platform: row.platform ?? null,
      });
    }
  }
  items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return items.slice(0, WORKSPACE_BOARD_LIMIT);
}

const KIND_LABELS: Record<WorkspaceBoardKind, string> = {
  social_post: "Social Post",
  offer: "Tawaran",
  whatsapp: "WhatsApp",
  content_engine: "Content Engine",
  wizard: "Wizard",
};

const ENGINE_LABELS: Record<Exclude<WorkspaceEngineKind, null>, string> = {
  content_review: "Semakan Kandungan",
  content_create: "Kandungan",
  visual_packaging: "Pelan Visual",
  performance_learning: "Rekod Prestasi",
};

export function describeBoardItem(item: { kind: WorkspaceBoardKind; engineKind: WorkspaceEngineKind }) {
  const engine = item.engineKind ? ENGINE_LABELS[item.engineKind] : null;
  return { label: engine ?? KIND_LABELS[item.kind] };
}

/**
 * Chaining (spec: only approved artifacts link to the next existing route).
 * Every href targets a route that already exists — the workspace itself never
 * generates anything and never writes to the database.
 */
export function boardItemChaining(item: Pick<WorkspaceBoardItem, "kind" | "artifactId" | "engineKind" | "status" | "platform">): { label: string; href: string } | null {
  if (item.status !== "approved") return null;
  if (item.kind === "social_post") return { label: "Bina Tawaran", href: `/app/native-offer?sourcePostId=${item.artifactId}` };
  if (item.kind === "offer") return { label: "Bina Content", href: `/app/content-create?sourceOfferId=${item.artifactId}` };
  if (item.kind === "content_engine" && item.engineKind === "content_create") {
    if (item.platform === "tiktok") return { label: "Bina Visual Plan", href: `/app/content-create/${item.artifactId}` };
    return { label: "Rekod Prestasi", href: `/app/performance?sourceContentCreateId=${item.artifactId}` };
  }
  return null;
}
