import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeGenerationTelemetry } from "../native-social-post/domain";
import { sha256Hex } from "../content-review/hash";
import {
  parseContentCreateRequest,
  renderContentCreateDraft,
  validateContentCreateArtifact,
  type ContentCreateArtifactV1,
  type ContentCreateRequestV1,
  type GenerationTelemetry,
} from "./domain";

export const CONTENT_CREATE_TABLE = "native_content_engine_artifacts";

export type StoredContentCreate = {
  id: number;
  artifact: ContentCreateArtifactV1;
  request: ContentCreateRequestV1;
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

function parseStoredRow(value: unknown): StoredContentCreate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as StoredRow;
  if (!Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1) return null;
  const validation = validateContentCreateArtifact(row.artifact);
  if (!validation.ok) return null;
  let request: ContentCreateRequestV1;
  try {
    request = parseContentCreateRequest(row.request);
  } catch {
    return null;
  }
  if (!row.generation || typeof row.generation !== "object" || Array.isArray(row.generation)) return null;
  if (typeof row.before_text !== "string" || !row.before_text.trim()) return null;
  return {
    id: Number(row.id),
    artifact: validation.artifact,
    request,
    telemetry: sanitizeGenerationTelemetry(row.generation as Record<string, unknown>),
    sourceText: row.before_text,
    createdAt: typeof row.created_at === "string" ? row.created_at : validation.artifact.createdAt,
  };
}

const RETURNING = "id, request, artifact, generation, before_text, created_at";

export async function saveContentCreateArtifact(input: {
  admin: SupabaseClient;
  userId: string;
  requestId: string;
  request: ContentCreateRequestV1;
  artifact: ContentCreateArtifactV1;
  telemetry: GenerationTelemetry;
  sourceText: string;
}) {
  const sourceText = input.sourceText.trim();
  if (!sourceText || sha256Hex(sourceText) !== input.artifact.sourceOfferSnapshot.sourceContentHash) throw new Error("content_create_source_hash_mismatch");
  const { data, error } = await input.admin
    .from(CONTENT_CREATE_TABLE)
    .insert({
      user_id: input.userId,
      request_id: input.requestId,
      request: input.request,
      artifact: input.artifact,
      generation: input.telemetry,
      source_social_post_id: null,
      source_social_post_status: null,
      source_text_hash: input.artifact.sourceOfferSnapshot.sourceContentHash,
      before_text: sourceText,
      improved_text: renderContentCreateDraft(input.artifact.draft),
      updated_at: input.artifact.updatedAt,
    })
    .select(RETURNING)
    .single();
  if (error || !data) throw error ?? new Error("content_create_save_failed");
  const stored = parseStoredRow(data);
  if (!stored) throw new Error("content_create_saved_row_invalid");
  return stored;
}

export async function loadContentCreateArtifact(input: { admin: SupabaseClient; userId: string; artifactId: number }) {
  const { data, error } = await input.admin
    .from(CONTENT_CREATE_TABLE)
    .select(RETURNING)
    .eq("id", input.artifactId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function findContentCreateByRequestId(input: { admin: SupabaseClient; userId: string; requestId: string }) {
  const { data, error } = await input.admin
    .from(CONTENT_CREATE_TABLE)
    .select(RETURNING)
    .eq("user_id", input.userId)
    .eq("request_id", input.requestId)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function saveContentCreateRevision(input: {
  admin: SupabaseClient;
  userId: string;
  requestId: string;
  stored: StoredContentCreate;
  artifact: ContentCreateArtifactV1;
}) {
  const priorApproval = input.stored.artifact.approval;
  if (input.stored.artifact.status !== "approved" || !priorApproval) throw new Error("content_create_revision_source_not_approved");
  if (input.artifact.status !== "draft" || input.artifact.draft.revision !== input.stored.artifact.draft.revision + 1) throw new Error("content_create_revision_number_invalid");
  if (input.artifact.draft.parentContentHash !== priorApproval.contentHash) throw new Error("content_create_revision_parent_invalid");
  return saveContentCreateArtifact({ admin: input.admin, userId: input.userId, requestId: input.requestId, request: input.stored.request, artifact: input.artifact, telemetry: input.stored.telemetry, sourceText: input.stored.sourceText });
}

export async function updateContentCreateArtifact(input: {
  admin: SupabaseClient;
  userId: string;
  stored: StoredContentCreate;
  artifact: ContentCreateArtifactV1;
}) {
  if (input.stored.artifact.status === "approved") throw new Error("content_create_approved_immutable");
  const { data, error } = await input.admin
    .from(CONTENT_CREATE_TABLE)
    .update({ artifact: input.artifact, improved_text: renderContentCreateDraft(input.artifact.draft), updated_at: input.artifact.updatedAt })
    .eq("id", input.stored.id)
    .eq("user_id", input.userId)
    .select(RETURNING)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}
