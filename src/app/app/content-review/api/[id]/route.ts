import { NextRequest, NextResponse } from "next/server";
import { currentContentReviewAccess } from "@/lib/content-review/access";
import { loadContentReviewContext } from "@/lib/content-review/context.server";
import {
  applyContentReviewDraftEdits,
  approveContentReviewArtifact,
  canUseContentReviewTier,
} from "@/lib/content-review/domain";
import {
  findContentReviewByRequestId,
  loadContentReviewArtifact,
  saveContentReviewRevision,
  updateContentReviewArtifact,
} from "@/lib/content-review/storage.server";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { readBoundedJsonRequest } from "@/lib/native-social-post/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 16_384;
const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak sah." }, 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "Format tidak sah." }, 415);

  const context = await loadContentReviewContext();
  if (!context.ok) return json({ error: context.reason === "unauthenticated" ? "Sila log masuk." : "Business Context tidak tersedia." }, context.reason === "unauthenticated" ? 401 : 403);
  if (!currentContentReviewAccess(context.user).allowed) return json({ error: "Review & Improve belum tersedia untuk akaun ini." }, 403);
  if (!canUseContentReviewTier(context.tier)) return json({ error: "Tugasan ini memerlukan pelan PRO atau MAX." }, 403);

  const { id } = await ctx.params;
  const artifactId = Number(id);
  if (!Number.isSafeInteger(artifactId) || artifactId < 1) return json({ error: "Artifact tidak sah." }, 400);

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJsonRequest(req, MAX_BODY_BYTES);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "body_too_large";
    return json({ error: tooLarge ? "Permintaan terlalu besar." : "Data tidak sah." }, tooLarge ? 413 : 400);
  }
  const action = String(body.action || "save");
  if (!(["save", "approve", "reopen"] as const).includes(action as "save" | "approve" | "reopen")) return json({ error: "Tindakan tidak sah." }, 400);

  const admin = createAdminClient();
  try {
    const stored = await loadContentReviewArtifact({ admin, userId: context.user.id, artifactId });
    if (!stored) return json({ error: "Artifact tidak ditemui." }, 404);
    const revisionRequestId = String(body.requestId || "").trim();
    if (stored.artifact.status === "approved") {
      if (!REQUEST_ID_RE.test(revisionRequestId)) return json({ error: "Request ID revision tidak sah." }, 400);
      const replay = await findContentReviewByRequestId({ admin, userId: context.user.id, requestId: revisionRequestId });
      if (replay && replay.id !== stored.id) return json({ artifactId: replay.id, artifact: replay.artifact, sourceText: replay.sourceText, telemetry: replay.telemetry, idempotentReplay: true });
      if (replay) return json({ error: "Request ID revision telah digunakan." }, 400);
    }
    let edited;
    try {
      edited = applyContentReviewDraftEdits(stored.artifact, body, new Date());
      if (action === "approve") edited = approveContentReviewArtifact(edited, context.user.id, new Date());
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Perubahan artifact tidak sah." }, 400);
    }
    const updated = stored.artifact.status === "approved"
      ? await saveContentReviewRevision({ admin, userId: context.user.id, requestId: revisionRequestId, stored, artifact: edited })
      : await updateContentReviewArtifact({ admin, userId: context.user.id, stored, artifact: edited });
    if (!updated) return json({ error: "Artifact tidak ditemui." }, 404);
    return json({ artifactId: updated.id, artifact: updated.artifact, sourceText: updated.sourceText, telemetry: updated.telemetry, idempotentReplay: false });
  } catch (error) {
    console.error("content_review_update_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Artifact tidak dapat disimpan." }, 500);
  }
}
