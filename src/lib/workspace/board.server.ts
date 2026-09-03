import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeBoardRows, type WorkspaceBoardItem, type WorkspaceBoardSource, type WorkspaceBoardSourceRow } from "./domain";

/**
 * Read-only owner-scoped board aggregation. The workspace NEVER writes:
 * every query below is a SELECT with an explicit user_id filter, run
 * through the caller's client after authentication.
 */

type RawRow = Record<string, unknown>;

function pickString(value: unknown, keys: string[]): string {
  for (const key of keys) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = (value as RawRow)[key];
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }
  return "";
}

function artifactRow(raw: RawRow): WorkspaceBoardSourceRow {
  const artifact = (raw.artifact ?? {}) as RawRow;
  return {
    id: Number(raw.id),
    title: pickString(artifact, ["headline", "draftHook", "hook", "patternObserved", "customerName", "championTitle", "title"]),
    status: artifact.status === "approved" ? "approved" : "draft",
    revision: typeof artifact.revision === "number" ? artifact.revision : null,
    updatedAt: typeof raw.updated_at === "string" ? raw.updated_at : typeof raw.created_at === "string" ? raw.created_at : "",
    engineKind: typeof artifact.kind === "string" && ["content_review", "content_create", "visual_packaging", "performance_learning"].includes(artifact.kind)
      ? (artifact.kind as WorkspaceBoardSourceRow["engineKind"])
      : null,
    platform: typeof artifact.platform === "string" ? artifact.platform : null,
  };
}

function wizardRow(raw: RawRow): WorkspaceBoardSourceRow {
  return {
    id: Number(raw.id),
    title: typeof raw.task_title === "string" && raw.task_title.trim() ? raw.task_title.trim() : "Output wizard",
    status: "draft",
    revision: null,
    updatedAt: typeof raw.created_at === "string" ? raw.created_at : "",
    engineKind: null,
    platform: null,
  };
}

export async function loadWorkspaceBoard(admin: SupabaseClient, userId: string): Promise<WorkspaceBoardItem[]> {
  const [socialPosts, offers, whatsapp, contentEngine, wizard] = await Promise.all([
    admin.from("native_social_post_artifacts").select("id, updated_at, created_at, artifact").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
    admin.from("native_offer_artifacts").select("id, updated_at, created_at, artifact").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
    admin.from("native_whatsapp_draft_artifacts").select("id, updated_at, created_at, artifact").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
    admin.from("native_content_engine_artifacts").select("id, updated_at, created_at, artifact").eq("user_id", userId).order("updated_at", { ascending: false }).limit(40),
    admin.from("generated_outputs").select("id, task_title, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
  ]);

  const sources: WorkspaceBoardSource[] = [
    { kind: "social_post", rows: ((socialPosts.data ?? []) as RawRow[]).map(artifactRow) },
    { kind: "offer", rows: ((offers.data ?? []) as RawRow[]).map(artifactRow) },
    { kind: "whatsapp", rows: ((whatsapp.data ?? []) as RawRow[]).map(artifactRow) },
    { kind: "content_engine", rows: ((contentEngine.data ?? []) as RawRow[]).map(artifactRow) },
    { kind: "wizard", rows: ((wizard.data ?? []) as RawRow[]).map(wizardRow) },
  ];
  return mergeBoardRows(sources);
}
