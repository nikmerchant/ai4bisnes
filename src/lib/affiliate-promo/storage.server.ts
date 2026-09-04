import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { renderAffiliatePromoText, validateAffiliatePromoArtifact, type AffiliatePromoArtifact } from "./domain";

export const AFFILIATE_PROMO_TABLE = "affiliate_promo_artifacts";
export type StoredAffiliatePromo = { id: number; artifact: AffiliatePromoArtifact; renderedText: string; createdAt: string; updatedAt: string };
type StoredRow = { id?: unknown; artifact?: unknown; rendered_text?: unknown; created_at?: unknown; updated_at?: unknown };
const RETURNING = "id, artifact, rendered_text, created_at, updated_at";

function byteLength(value: string) { return new TextEncoder().encode(value).byteLength; }

function parseStoredRow(value: unknown): StoredAffiliatePromo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as StoredRow;
  const id = Number(row.id);
  if (!Number.isSafeInteger(id) || id < 1 || typeof row.rendered_text !== "string") return null;
  const validation = validateAffiliatePromoArtifact(row.artifact);
  if (!validation.ok) return null;
  const renderedText = renderAffiliatePromoText(validation.artifact);
  if (row.rendered_text !== renderedText || byteLength(renderedText) > 16_384) return null;
  return {
    id,
    artifact: validation.artifact,
    renderedText,
    createdAt: typeof row.created_at === "string" ? row.created_at : validation.artifact.createdAt,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : validation.artifact.updatedAt,
  };
}

function validateForWrite(artifact: AffiliatePromoArtifact) {
  const validation = validateAffiliatePromoArtifact(artifact);
  if (!validation.ok) throw new Error("affiliate_promo_artifact_invalid");
  const renderedText = renderAffiliatePromoText(validation.artifact);
  if (byteLength(JSON.stringify(validation.artifact)) > 32_768 || byteLength(renderedText) > 16_384) throw new Error("affiliate_promo_artifact_too_large");
  return { artifact: validation.artifact, renderedText };
}

export async function saveAffiliatePromoArtifact(input: { admin: SupabaseClient; userId: string; requestId: string; artifact: AffiliatePromoArtifact }) {
  const valid = validateForWrite(input.artifact);
  const { data, error } = await input.admin.from(AFFILIATE_PROMO_TABLE).insert({
    user_id: input.userId,
    request_id: input.requestId,
    artifact: valid.artifact,
    rendered_text: valid.renderedText,
    updated_at: valid.artifact.updatedAt,
  }).select(RETURNING).single();
  if (error || !data) throw error ?? new Error("affiliate_promo_save_failed");
  const stored = parseStoredRow(data);
  if (!stored) throw new Error("affiliate_promo_saved_row_invalid");
  return stored;
}

export async function loadAffiliatePromoArtifact(input: { admin: SupabaseClient; userId: string; artifactId: number }) {
  const { data, error } = await input.admin.from(AFFILIATE_PROMO_TABLE).select(RETURNING).eq("id", input.artifactId).eq("user_id", input.userId).maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function findAffiliatePromoByRequestId(input: { admin: SupabaseClient; userId: string; requestId: string }) {
  const { data, error } = await input.admin.from(AFFILIATE_PROMO_TABLE).select(RETURNING).eq("user_id", input.userId).eq("request_id", input.requestId).maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

function protectedFieldsMatch(left: AffiliatePromoArtifact, right: AffiliatePromoArtifact) {
  return left.kind === right.kind && left.schemaVersion === right.schemaVersion && left.platform === right.platform && left.angle === right.angle && left.niche === right.niche && left.tone === right.tone && left.referralLink === right.referralLink && left.disclosure === right.disclosure && left.personalNote === right.personalNote && left.recipeVersion === right.recipeVersion && left.createdAt === right.createdAt && left.revision === right.revision && left.parentContentHash === right.parentContentHash;
}

export async function updateAffiliatePromoArtifact(input: { admin: SupabaseClient; userId: string; stored: StoredAffiliatePromo; artifact: AffiliatePromoArtifact }) {
  if (input.stored.artifact.status === "approved") throw new Error("affiliate_promo_approved_immutable");
  if (!protectedFieldsMatch(input.stored.artifact, input.artifact)) throw new Error("affiliate_promo_protected_field_changed");
  const valid = validateForWrite(input.artifact);
  const { data, error } = await input.admin.from(AFFILIATE_PROMO_TABLE).update({ artifact: valid.artifact, rendered_text: valid.renderedText, updated_at: valid.artifact.updatedAt }).eq("id", input.stored.id).eq("user_id", input.userId).select(RETURNING).maybeSingle();
  if (error) throw error;
  return parseStoredRow(data);
}

export async function saveAffiliatePromoRevision(input: { admin: SupabaseClient; userId: string; requestId: string; stored: StoredAffiliatePromo; artifact: AffiliatePromoArtifact }) {
  const approval = input.stored.artifact.approval;
  if (input.stored.artifact.status !== "approved" || !approval) throw new Error("affiliate_promo_revision_source_not_approved");
  if (input.artifact.status !== "draft" || input.artifact.revision !== input.stored.artifact.revision + 1) throw new Error("affiliate_promo_revision_number_invalid");
  if (input.artifact.parentContentHash !== approval.contentHash) throw new Error("affiliate_promo_revision_parent_invalid");
  const REVISION_IGNORED_KEYS = new Set(["revision", "parentContentHash", "status", "approval", "createdAt", "updatedAt", "variants", "compliance"]);
  const revisionMutableFields = (source: AffiliatePromoArtifact) => Object.fromEntries(Object.entries(source).filter(([key]) => !REVISION_IGNORED_KEYS.has(key)));
  if (JSON.stringify(revisionMutableFields(input.stored.artifact)) !== JSON.stringify(revisionMutableFields(input.artifact))) throw new Error("affiliate_promo_revision_protected_field_changed");
  return saveAffiliatePromoArtifact({ admin: input.admin, userId: input.userId, requestId: input.requestId, artifact: input.artifact });
}

export function malaysiaDayStart(now: Date) {
  const malaysiaOffsetMs = 8 * 60 * 60 * 1_000;
  const shifted = new Date(now.getTime() + malaysiaOffsetMs);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - malaysiaOffsetMs);
}

export function malaysiaMonthStart(now: Date) {
  const malaysiaOffsetMs = 8 * 60 * 60 * 1_000;
  const shifted = new Date(now.getTime() + malaysiaOffsetMs);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - malaysiaOffsetMs);
}

export async function countAffiliatePromoUsage(input: { admin: SupabaseClient; userId: string; now: Date }) {
  const dayStart = malaysiaDayStart(input.now);
  const monthStart = malaysiaMonthStart(input.now);
  const base = () => input.admin.from(AFFILIATE_PROMO_TABLE).select("id", { count: "exact", head: true }).eq("user_id", input.userId).eq("artifact->>revision", "1");
  const [daily, monthly] = await Promise.all([
    base().gte("created_at", dayStart.toISOString()),
    base().gte("created_at", monthStart.toISOString()),
  ]);
  if (daily.error || monthly.error) throw daily.error ?? monthly.error;
  return { daily: daily.count ?? 0, monthly: monthly.count ?? 0 };
}
