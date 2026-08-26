import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  renderSocialPostText,
  sanitizeGenerationTelemetry,
  validateSocialPostArtifact,
  type GenerationTelemetry,
  type NativeSocialPostRequest,
  type SocialPostArtifact,
} from "./domain";

export const NATIVE_SOCIAL_POST_TABLE = "native_social_post_artifacts";

export type StoredNativeSocialPost = {
  id: number;
  artifact: SocialPostArtifact;
  request: NativeSocialPostRequest;
  telemetry: GenerationTelemetry;
  createdAt: string;
};

type StoredRow = {
  id?: unknown;
  request?: unknown;
  artifact?: unknown;
  generation?: unknown;
  created_at?: unknown;
};

function parseStoredRow(value: unknown): StoredNativeSocialPost | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as StoredRow;
  if (!Number.isSafeInteger(Number(row.id))) return null;
  const validation = validateSocialPostArtifact(row.artifact);
  if (!validation.ok || !row.request || typeof row.request !== "object" || Array.isArray(row.request)) return null;
  if (!row.generation || typeof row.generation !== "object" || Array.isArray(row.generation)) return null;
  return {
    id: Number(row.id),
    artifact: validation.artifact,
    request: row.request as NativeSocialPostRequest,
    telemetry: sanitizeGenerationTelemetry(row.generation as Record<string, unknown>),
    createdAt: typeof row.created_at === "string" ? row.created_at : validation.artifact.createdAt,
  };
}

const RETURNING = "id, request, artifact, generation, created_at";

export async function saveNativeSocialPost(input: {
  admin: SupabaseClient;
  userId: string;
  requestId: string;
  request: NativeSocialPostRequest;
  artifact: SocialPostArtifact;
  telemetry: GenerationTelemetry;
}) {
  const { data, error } = await input.admin
    .from(NATIVE_SOCIAL_POST_TABLE)
    .insert({
      user_id: input.userId,
      request_id: input.requestId,
      request: input.request,
      artifact: input.artifact,
      generation: input.telemetry,
      rendered_text: renderSocialPostText(input.artifact),
      updated_at: input.artifact.updatedAt,
    })
    .select(RETURNING)
    .single();
  if (error || !data) throw error ?? new Error("native_social_post_save_failed");
  const stored = parseStoredRow(data);
  if (!stored) throw new Error("native_social_post_saved_row_invalid");
  return stored;
}

export async function loadNativeSocialPost(input: {
  admin: SupabaseClient;
  userId: string;
  artifactId: number;
}) {
  const { data, error } = await input.admin
    .from(NATIVE_SOCIAL_POST_TABLE)
    .select(RETURNING)
    .eq("id", input.artifactId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function findNativeSocialPostByRequestId(input: {
  admin: SupabaseClient;
  userId: string;
  requestId: string;
}) {
  const { data, error } = await input.admin
    .from(NATIVE_SOCIAL_POST_TABLE)
    .select(RETURNING)
    .eq("user_id", input.userId)
    .eq("request_id", input.requestId)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function updateNativeSocialPost(input: {
  admin: SupabaseClient;
  userId: string;
  stored: StoredNativeSocialPost;
  artifact: SocialPostArtifact;
}) {
  const { data, error } = await input.admin
    .from(NATIVE_SOCIAL_POST_TABLE)
    .update({
      artifact: input.artifact,
      rendered_text: renderSocialPostText(input.artifact),
      updated_at: input.artifact.updatedAt,
    })
    .eq("id", input.stored.id)
    .eq("user_id", input.userId)
    .select(RETURNING)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}
