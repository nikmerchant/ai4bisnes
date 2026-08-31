import { NextRequest, NextResponse } from "next/server";
import { currentContentCreateAccess } from "@/lib/content-create/access";
import { loadContentCreateContext } from "@/lib/content-create/context.server";
import { applyContentCreateDraftEdits, approveContentCreateArtifact, canUseContentCreateTier } from "@/lib/content-create/domain";
import { findContentCreateByRequestId, loadContentCreateArtifact, saveContentCreateRevision, updateContentCreateArtifact } from "@/lib/content-create/storage.server";
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

  const context = await loadContentCreateContext();
  if (!context.ok) return json({ error: context.reason === "unauthenticated" ? "Sila log masuk." : "Business Context tidak tersedia." }, context.reason === "unauthenticated" ? 401 : 403);
  if (!canUseContentCreateTier(context.tier)) return json({ error: "Tugasan ini memerlukan pelan PRO atau MAX." }, 403);
  if (!currentContentCreateAccess(context.user).allowed) return json({ error: "Bina Content belum tersedia untuk akaun ini." }, 403);

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

  // Authentication, entitlement and independent access checks above precede
  // construction of the privileged service-role client.
  const admin = createAdminClient();
  try {
    const stored = await loadContentCreateArtifact({ admin, userId: context.user.id, artifactId });
    if (!stored) return json({ error: "Artifact tidak ditemui." }, 404);

    if (stored.artifact.status === "approved") {
      if (action !== "reopen") return json({ error: "Artifact diluluskan tidak boleh dimutasi. Buka revision DRAF baharu." }, 409);
      const revisionRequestId = String(body.requestId || "").trim();
      if (!REQUEST_ID_RE.test(revisionRequestId)) return json({ error: "Request ID revision tidak sah." }, 400);
      const replay = await findContentCreateByRequestId({ admin, userId: context.user.id, requestId: revisionRequestId });
      if (replay && replay.id !== stored.id) return json({ artifactId: replay.id, artifact: replay.artifact, sourceText: replay.sourceText, telemetry: replay.telemetry, idempotentReplay: true });
      if (replay) return json({ error: "Request ID revision telah digunakan." }, 400);
      let revision;
      try {
        revision = applyContentCreateDraftEdits(stored.artifact, body, new Date());
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Perubahan artifact tidak sah." }, 400);
      }
      const inserted = await saveContentCreateRevision({ admin, userId: context.user.id, requestId: revisionRequestId, stored, artifact: revision });
      return json({ artifactId: inserted.id, artifact: inserted.artifact, sourceText: inserted.sourceText, telemetry: inserted.telemetry, idempotentReplay: false });
    }

    if (action === "reopen") return json({ error: "Artifact ini sudah berstatus DRAF." }, 409);
    let edited;
    try {
      edited = applyContentCreateDraftEdits(stored.artifact, body, new Date());
      if (action === "approve") edited = approveContentCreateArtifact(edited, context.user.id, new Date());
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Perubahan artifact tidak sah." }, 400);
    }
    const updated = await updateContentCreateArtifact({ admin, userId: context.user.id, stored, artifact: edited });
    if (!updated) return json({ error: "Artifact tidak ditemui." }, 404);
    return json({ artifactId: updated.id, artifact: updated.artifact, sourceText: updated.sourceText, telemetry: updated.telemetry, idempotentReplay: false });
  } catch (error) {
    console.error("content_create_update_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Artifact tidak dapat disimpan." }, 500);
  }
}
