import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeGenerationTelemetry } from "../native-social-post/domain";
import {
  renderImprovedContentText,
  validateContentReviewArtifact,
  type ContentReviewArtifactV1,
  type ContentReviewRequestV1,
  type GenerationTelemetry,
} from "./domain";

export const CONTENT_REVIEW_TABLE = "native_content_engine_artifacts";

export type StoredContentReview = {
  id: number;
  artifact: ContentReviewArtifactV1;
  request: ContentReviewRequestV1;
  telemetry: GenerationTelemetry;
  sourceText: string;
  createdAt: string;
};

type StoredRow = {
  id?: unknown;
  request?: unknown;
  artifact?: unknown;
  generation?: unknown;
  before_text?: unknown;
  created_at?: unknown;
};

function parseStoredRow(value: unknown): StoredContentReview | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as StoredRow;
  if (!Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1) return null;
  const validation = validateContentReviewArtifact(row.artifact);
  if (!validation.ok || !row.request || typeof row.request !== "object" || Array.isArray(row.request)) return null;
  if (!row.generation || typeof row.generation !== "object" || Array.isArray(row.generation)) return null;
  if (typeof row.before_text !== "string" || !row.before_text.trim()) return null;
  return {
    id: Number(row.id),
    artifact: validation.artifact,
    request: row.request as ContentReviewRequestV1,
    telemetry: sanitizeGenerationTelemetry(row.generation as Record<string, unknown>),
    sourceText: row.before_text,
    createdAt: typeof row.created_at === "string" ? row.created_at : validation.artifact.createdAt,
  };
}

const RETURNING = "id, request, artifact, generation, before_text, created_at";

export async function saveContentReviewArtifact(input: {
  admin: SupabaseClient;
  userId: string;
  requestId: string;
  request: ContentReviewRequestV1;
  artifact: ContentReviewArtifactV1;
  telemetry: GenerationTelemetry;
  sourceText: string;
}) {
  const { data, error } = await input.admin
    .from(CONTENT_REVIEW_TABLE)
    .insert({
      user_id: input.userId,
      request_id: input.requestId,
      request: input.request,
      artifact: input.artifact,
      generation: input.telemetry,
      source_social_post_id: input.artifact.sourceSocialPostId,
      source_social_post_status: input.artifact.sourceSocialPostStatus,
      source_text_hash: input.artifact.sourceTextHash,
      before_text: input.sourceText,
      improved_text: renderImprovedContentText(input.artifact.improvedDraft),
      updated_at: input.artifact.updatedAt,
    })
    .select(RETURNING)
    .single();
  if (error || !data) throw error ?? new Error("content_review_save_failed");
  const stored = parseStoredRow(data);
  if (!stored) throw new Error("content_review_saved_row_invalid");
  return stored;
}

export async function loadContentReviewArtifact(input: {
  admin: SupabaseClient;
  userId: string;
  artifactId: number;
}) {
  const { data, error } = await input.admin
    .from(CONTENT_REVIEW_TABLE)
    .select(RETURNING)
    .eq("id", input.artifactId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function findContentReviewByRequestId(input: {
  admin: SupabaseClient;
  userId: string;
  requestId: string;
}) {
  const { data, error } = await input.admin
    .from(CONTENT_REVIEW_TABLE)
    .select(RETURNING)
    .eq("user_id", input.userId)
    .eq("request_id", input.requestId)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function saveContentReviewRevision(input: {
  admin: SupabaseClient;
  userId: string;
  requestId: string;
  stored: StoredContentReview;
  artifact: ContentReviewArtifactV1;
}) {
  const priorApproval = input.stored.artifact.approval;
  if (input.stored.artifact.status !== "approved" || !priorApproval) throw new Error("content_review_revision_source_not_approved");
  if (input.artifact.improvedDraft.revision !== input.stored.artifact.improvedDraft.revision + 1) throw new Error("content_review_revision_number_invalid");
  if (input.artifact.improvedDraft.parentContentHash !== priorApproval.contentHash) throw new Error("content_review_revision_parent_invalid");
  return saveContentReviewArtifact({
    admin: input.admin,
    userId: input.userId,
    requestId: input.requestId,
    request: input.stored.request,
    artifact: input.artifact,
    telemetry: input.stored.telemetry,
    sourceText: input.stored.sourceText,
  });
}

export async function updateContentReviewArtifact(input: {
  admin: SupabaseClient;
  userId: string;
  stored: StoredContentReview;
  artifact: ContentReviewArtifactV1;
}) {
  const { data, error } = await input.admin
    .from(CONTENT_REVIEW_TABLE)
    .update({
      artifact: input.artifact,
      improved_text: renderImprovedContentText(input.artifact.improvedDraft),
      updated_at: input.artifact.updatedAt,
    })
    .eq("id", input.stored.id)
    .eq("user_id", input.userId)
    .select(RETURNING)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}
