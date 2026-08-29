import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  renderWhatsAppDraftText,
  validateWhatsAppDraftArtifact,
  type GenerationTelemetry,
  type NativeWhatsAppRequest,
  type WhatsAppDraftArtifact,
} from "./domain";
import { sanitizeGenerationTelemetry } from "../native-social-post/domain";

export const NATIVE_WHATSAPP_TABLE = "native_whatsapp_draft_artifacts";

export type StoredNativeWhatsAppDraft = {
  id: number;
  artifact: WhatsAppDraftArtifact;
  request: NativeWhatsAppRequest;
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

function parseStoredRow(value: unknown): StoredNativeWhatsAppDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as StoredRow;
  if (!Number.isSafeInteger(Number(row.id))) return null;
  const validation = validateWhatsAppDraftArtifact(row.artifact);
  if (!validation.ok || !row.request || typeof row.request !== "object" || Array.isArray(row.request)) return null;
  if (!row.generation || typeof row.generation !== "object" || Array.isArray(row.generation)) return null;
  return {
    id: Number(row.id),
    artifact: validation.artifact,
    request: row.request as NativeWhatsAppRequest,
    telemetry: sanitizeGenerationTelemetry(row.generation as Record<string, unknown>),
    createdAt: typeof row.created_at === "string" ? row.created_at : validation.artifact.createdAt,
  };
}

const RETURNING = "id, request, artifact, generation, created_at";

export async function saveNativeWhatsAppDraft(input: {
  admin: SupabaseClient;
  userId: string;
  requestId: string;
  request: NativeWhatsAppRequest;
  artifact: WhatsAppDraftArtifact;
  telemetry: GenerationTelemetry;
}) {
  const { data, error } = await input.admin
    .from(NATIVE_WHATSAPP_TABLE)
    .insert({
      user_id: input.userId,
      request_id: input.requestId,
      request: input.request,
      artifact: input.artifact,
      generation: input.telemetry,
      rendered_text: renderWhatsAppDraftText(input.artifact),
      updated_at: input.artifact.updatedAt,
    })
    .select(RETURNING)
    .single();
  if (error || !data) throw error ?? new Error("native_whatsapp_save_failed");
  const stored = parseStoredRow(data);
  if (!stored) throw new Error("native_whatsapp_saved_row_invalid");
  return stored;
}

export async function loadNativeWhatsAppDraft(input: {
  admin: SupabaseClient;
  userId: string;
  artifactId: number;
}) {
  const { data, error } = await input.admin
    .from(NATIVE_WHATSAPP_TABLE)
    .select(RETURNING)
    .eq("id", input.artifactId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function findNativeWhatsAppDraftByRequestId(input: {
  admin: SupabaseClient;
  userId: string;
  requestId: string;
}) {
  const { data, error } = await input.admin
    .from(NATIVE_WHATSAPP_TABLE)
    .select(RETURNING)
    .eq("user_id", input.userId)
    .eq("request_id", input.requestId)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function updateNativeWhatsAppDraft(input: {
  admin: SupabaseClient;
  userId: string;
  stored: StoredNativeWhatsAppDraft;
  artifact: WhatsAppDraftArtifact;
}) {
  const { data, error } = await input.admin
    .from(NATIVE_WHATSAPP_TABLE)
    .update({
      artifact: input.artifact,
      rendered_text: renderWhatsAppDraftText(input.artifact),
      updated_at: input.artifact.updatedAt,
    })
    .eq("id", input.stored.id)
    .eq("user_id", input.userId)
    .select(RETURNING)
    .maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}
