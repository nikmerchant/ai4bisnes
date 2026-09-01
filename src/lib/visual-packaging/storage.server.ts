import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeGenerationTelemetry } from "../native-social-post/domain";
import { sha256Hex } from "../content-review/hash";
import { parseVisualPackagingRequest, renderLegacyVisualPackagingPlan, renderVisualPackagingPlan, validateVisualPackagingArtifact, type GenerationTelemetry, type VisualPackagingArtifactV1, type VisualPackagingRequestV1 } from "./domain";

export const VISUAL_PACKAGING_TABLE = "native_content_engine_artifacts";
export type StoredVisualPackaging = { id: number; artifact: VisualPackagingArtifactV1; request: VisualPackagingRequestV1; telemetry: GenerationTelemetry; sourceText: string; createdAt: string };
type StoredRow = { id?: unknown; request?: unknown; artifact?: unknown; generation?: unknown; before_text?: unknown; improved_text?: unknown; created_at?: unknown };
const RETURNING = "id, request, artifact, generation, before_text, improved_text, created_at";

function parseStoredRow(value: unknown): StoredVisualPackaging | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as StoredRow;
  if (!Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1) return null;
  const validation = validateVisualPackagingArtifact(row.artifact);
  if (!validation.ok) return null;
  let request: VisualPackagingRequestV1;
  try { request = parseVisualPackagingRequest(row.request); } catch { return null; }
  if (request.sourceContentCreateId !== validation.artifact.sourceContentCreateId || request.format !== validation.artifact.formatPlan.format || request.packagingIntent !== validation.artifact.packaging.packagingIntent) return null;
  if (!row.generation || typeof row.generation !== "object" || Array.isArray(row.generation) || typeof row.before_text !== "string" || !row.before_text.trim()) return null;
  if (sha256Hex(row.before_text) !== validation.artifact.sourceSnapshot.sourceContentHash) return null;
  if (typeof row.improved_text !== "string") return null;
  const canonicalPlan = renderVisualPackagingPlan(validation.artifact);
  if (row.improved_text !== canonicalPlan && row.improved_text !== renderLegacyVisualPackagingPlan(validation.artifact)) return null;
  return { id: Number(row.id), artifact: validation.artifact, request, telemetry: sanitizeGenerationTelemetry(row.generation as Record<string, unknown>), sourceText: row.before_text, createdAt: typeof row.created_at === "string" ? row.created_at : validation.artifact.createdAt };
}

export async function saveVisualPackagingArtifact(input: { admin: SupabaseClient; userId: string; requestId: string; request: VisualPackagingRequestV1; artifact: VisualPackagingArtifactV1; telemetry: GenerationTelemetry; sourceText: string }) {
  const sourceText = input.sourceText.trim();
  if (!sourceText || sha256Hex(sourceText) !== input.artifact.sourceSnapshot.sourceContentHash) throw new Error("visual_packaging_source_hash_mismatch");
  const { data, error } = await input.admin.from(VISUAL_PACKAGING_TABLE).insert({
    user_id: input.userId,
    request_id: input.requestId,
    request: input.request,
    artifact: input.artifact,
    generation: input.telemetry,
    source_social_post_id: null,
    source_social_post_status: null,
    source_text_hash: input.artifact.sourceSnapshot.sourceContentHash,
    before_text: sourceText,
    improved_text: renderVisualPackagingPlan(input.artifact),
    updated_at: input.artifact.updatedAt,
  }).select(RETURNING).single();
  if (error || !data) throw error ?? new Error("visual_packaging_save_failed");
  const stored = parseStoredRow(data);
  if (!stored) throw new Error("visual_packaging_saved_row_invalid");
  return stored;
}

export async function loadVisualPackagingArtifact(input: { admin: SupabaseClient; userId: string; artifactId: number }) {
  const { data, error } = await input.admin.from(VISUAL_PACKAGING_TABLE).select(RETURNING).eq("id", input.artifactId).eq("user_id", input.userId).maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function findVisualPackagingByRequestId(input: { admin: SupabaseClient; userId: string; requestId: string }) {
  const { data, error } = await input.admin.from(VISUAL_PACKAGING_TABLE).select(RETURNING).eq("user_id", input.userId).eq("request_id", input.requestId).maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function updateVisualPackagingArtifact(input: { admin: SupabaseClient; userId: string; stored: StoredVisualPackaging; artifact: VisualPackagingArtifactV1 }) {
  if (input.stored.artifact.status === "approved") throw new Error("visual_packaging_approved_immutable");
  const { data, error } = await input.admin.from(VISUAL_PACKAGING_TABLE).update({ artifact: input.artifact, improved_text: renderVisualPackagingPlan(input.artifact), updated_at: input.artifact.updatedAt }).eq("id", input.stored.id).eq("user_id", input.userId).select(RETURNING).maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function saveVisualPackagingRevision(input: { admin: SupabaseClient; userId: string; requestId: string; stored: StoredVisualPackaging; artifact: VisualPackagingArtifactV1 }) {
  const approval = input.stored.artifact.approval;
  if (input.stored.artifact.status !== "approved" || !approval) throw new Error("visual_packaging_revision_source_not_approved");
  if (input.artifact.status !== "draft" || input.artifact.revision !== input.stored.artifact.revision + 1) throw new Error("visual_packaging_revision_number_invalid");
  if (input.artifact.parentContentHash !== approval.contentHash) throw new Error("visual_packaging_revision_parent_invalid");
  return saveVisualPackagingArtifact({ admin: input.admin, userId: input.userId, requestId: input.requestId, request: input.stored.request, artifact: input.artifact, telemetry: input.stored.telemetry, sourceText: input.stored.sourceText });
}
