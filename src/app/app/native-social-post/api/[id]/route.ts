import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { currentSlice1Access } from "@/lib/native-social-post/access";
import { applySocialPostEdits, canUseNativeSocialPostTier } from "@/lib/native-social-post/domain";
import { loadNativeSocialPostContext } from "@/lib/native-social-post/context.server";
import { loadNativeSocialPost, updateNativeSocialPost } from "@/lib/native-social-post/storage.server";
import { readBoundedJsonRequest } from "@/lib/native-social-post/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_384;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak sah." }, 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "Format tidak sah." }, 415);

  const context = await loadNativeSocialPostContext();
  if (!context.ok) return json({ error: context.reason === "unauthenticated" ? "Sila log masuk." : "Business Context tidak tersedia." }, context.reason === "unauthenticated" ? 401 : 403);
  if (!currentSlice1Access(context.user).allowed) return json({ error: "Slice 1 belum tersedia untuk akaun ini." }, 403);
  if (!canUseNativeSocialPostTier(context.tier)) return json({ error: "Tugasan ini memerlukan pelan PRO atau MAX." }, 403);

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

  const admin = createAdminClient();
  try {
    const stored = await loadNativeSocialPost({ admin, userId: context.user.id, artifactId });
    if (!stored) return json({ error: "Artifact tidak ditemui." }, 404);
    let edited;
    try {
      edited = applySocialPostEdits(stored.artifact, body, new Date());
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Perubahan artifact tidak sah." }, 400);
    }
    const updated = await updateNativeSocialPost({ admin, userId: context.user.id, stored, artifact: edited });
    if (!updated) return json({ error: "Artifact tidak ditemui." }, 404);
    return json({ artifactId: updated.id, artifact: updated.artifact, telemetry: updated.telemetry });
  } catch (error) {
    console.error("native_social_post_update_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Artifact tidak dapat disimpan." }, 500);
  }
}
