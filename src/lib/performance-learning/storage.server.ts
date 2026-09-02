import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeGenerationTelemetry } from "../native-social-post/domain";
import { sha256Hex } from "../content-review/hash";
import { parsePerformanceLearningRequest, renderPerformanceLearningReport, validatePerformanceLearningArtifact, type GenerationTelemetry, type PerformanceLearningArtifactV1, type PerformanceLearningRequestV1 } from "./domain";

export const PERFORMANCE_LEARNING_TABLE = "native_content_engine_artifacts";
export type StoredPerformanceLearning = { id: number; artifact: PerformanceLearningArtifactV1; request: PerformanceLearningRequestV1; telemetry: GenerationTelemetry; sourceText: string; createdAt: string };
type StoredRow = { id?: unknown; request?: unknown; artifact?: unknown; generation?: unknown; before_text?: unknown; improved_text?: unknown; created_at?: unknown };
const RETURNING = "id, request, artifact, generation, before_text, improved_text, created_at";

function parseStoredRow(value: unknown): StoredPerformanceLearning | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as StoredRow;
  if (!Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1) return null;
  const validation = validatePerformanceLearningArtifact(row.artifact);
  if (!validation.ok) return null;
  let request: PerformanceLearningRequestV1;
  try { request = parsePerformanceLearningRequest(row.request); } catch { return null; }
  if (request.sourceContentCreateId !== validation.artifact.sourceContentCreateId || request.platformWindowDays !== validation.artifact.platformWindowDays) return null;
  const metricKeys = ["impressions", "clicks", "saves", "shares", "leads"] as const;
  if (metricKeys.some((key) => request.metrics[key] !== validation.artifact.metrics[key])) return null;
  if (!row.generation || typeof row.generation !== "object" || Array.isArray(row.generation) || typeof row.before_text !== "string" || !row.before_text.trim()) return null;
  if (sha256Hex(row.before_text) !== validation.artifact.sourceSnapshot.sourceContentHash) return null;
  if (typeof row.improved_text !== "string") return null;
  // JSONB round-trip invariant (CE-5 lesson): stored render must equal the
  // canonical stable sorted-key render of the stored artifact.
  if (row.improved_text !== renderPerformanceLearningReport(validation.artifact)) return null;
  return { id: Number(row.id), artifact: validation.artifact, request, telemetry: sanitizeGenerationTelemetry(row.generation as Record<string, unknown>), sourceText: row.before_text, createdAt: typeof row.created_at === "string" ? row.created_at : validation.artifact.createdAt };
}

export async function savePerformanceLearningArtifact(input: { admin: SupabaseClient; userId: string; requestId: string; request: PerformanceLearningRequestV1; artifact: PerformanceLearningArtifactV1; telemetry: GenerationTelemetry; sourceText: string }) {
  const sourceText = input.sourceText.trim();
  if (!sourceText || sha256Hex(sourceText) !== input.artifact.sourceSnapshot.sourceContentHash) throw new Error("performance_learning_source_hash_mismatch");
  // Metrics immutability invariant at the storage boundary: the artifact must
  // carry exactly the request's frozen metrics (no drift between parse/save).
  if (input.artifact.metrics.impressions !== input.request.metrics.impressions || input.artifact.metrics.clicks !== input.request.metrics.clicks || input.artifact.metrics.saves !== input.request.metrics.saves || input.artifact.metrics.shares !== input.request.metrics.shares || input.artifact.metrics.leads !== input.request.metrics.leads) throw new Error("performance_learning_metric_drift_rejected");
  if (input.artifact.sourceContentCreateId !== input.request.sourceContentCreateId) throw new Error("performance_learning_source_mismatch");
  const { data, error } = await input.admin.from(PERFORMANCE_LEARNING_TABLE).insert({
    user_id: input.userId,
    request_id: input.requestId,
    request: input.request,
    artifact: input.artifact,
    generation: input.telemetry,
    source_social_post_id: null,
    source_social_post_status: null,
    source_text_hash: input.artifact.sourceSnapshot.sourceContentHash,
    before_text: sourceText,
    improved_text: renderPerformanceLearningReport(input.artifact),
    updated_at: input.artifact.updatedAt,
  }).select(RETURNING).single();
  if (error || !data) throw error ?? new Error("performance_learning_save_failed");
  const stored = parseStoredRow(data);
  if (!stored) throw new Error("performance_learning_saved_row_invalid");
  return stored;
}

export async function loadPerformanceLearningArtifact(input: { admin: SupabaseClient; userId: string; artifactId: number }) {
  const { data, error } = await input.admin.from(PERFORMANCE_LEARNING_TABLE).select(RETURNING).eq("id", input.artifactId).eq("user_id", input.userId).maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function findPerformanceLearningByRequestId(input: { admin: SupabaseClient; userId: string; requestId: string }) {
  const { data, error } = await input.admin.from(PERFORMANCE_LEARNING_TABLE).select(RETURNING).eq("user_id", input.userId).eq("request_id", input.requestId).maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function updatePerformanceLearningArtifact(input: { admin: SupabaseClient; userId: string; stored: StoredPerformanceLearning; artifact: PerformanceLearningArtifactV1 }) {
  if (input.stored.artifact.status === "approved") throw new Error("performance_learning_approved_immutable");
  const { data, error } = await input.admin.from(PERFORMANCE_LEARNING_TABLE).update({ artifact: input.artifact, improved_text: renderPerformanceLearningReport(input.artifact), updated_at: input.artifact.updatedAt }).eq("id", input.stored.id).eq("user_id", input.userId).select(RETURNING).maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function savePerformanceLearningRevision(input: { admin: SupabaseClient; userId: string; requestId: string; stored: StoredPerformanceLearning; artifact: PerformanceLearningArtifactV1 }) {
  const approval = input.stored.artifact.approval;
  if (input.stored.artifact.status !== "approved" || !approval) throw new Error("performance_learning_revision_source_not_approved");
  if (input.artifact.status !== "draft" || input.artifact.revision !== input.stored.artifact.revision + 1) throw new Error("performance_learning_revision_number_invalid");
  if (input.artifact.parentContentHash !== approval.contentHash) throw new Error("performance_learning_revision_parent_invalid");
  return savePerformanceLearningArtifact({ admin: input.admin, userId: input.userId, requestId: input.requestId, request: input.stored.request, artifact: input.artifact, telemetry: input.stored.telemetry, sourceText: input.stored.sourceText });
}
