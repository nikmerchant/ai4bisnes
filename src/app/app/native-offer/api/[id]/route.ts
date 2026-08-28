import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { currentSlice2Access } from "@/lib/native-offer/access";
import { applyOfferEdits, canUseNativeOfferTier } from "@/lib/native-offer/domain";
import { loadNativeOfferContext } from "@/lib/native-offer/context.server";
import { loadNativeOffer, updateNativeOffer } from "@/lib/native-offer/storage.server";
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

  const context = await loadNativeOfferContext();
  if (!context.ok) return json({ error: context.reason === "unauthenticated" ? "Sila log masuk." : "Business Context tidak tersedia." }, context.reason === "unauthenticated" ? 401 : 403);
  if (!currentSlice2Access(context.user).allowed) return json({ error: "Slice 2 belum tersedia untuk akaun ini." }, 403);
  if (!canUseNativeOfferTier(context.tier)) return json({ error: "Tugasan ini memerlukan pelan PRO atau MAX." }, 403);

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
    const stored = await loadNativeOffer({ admin, userId: context.user.id, artifactId });
    if (!stored) return json({ error: "Artifact tidak ditemui." }, 404);
    let edited;
    try {
      edited = applyOfferEdits(stored.artifact, body, new Date());
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Perubahan artifact tidak sah." }, 400);
    }
    const updated = await updateNativeOffer({ admin, userId: context.user.id, stored, artifact: edited });
    if (!updated) return json({ error: "Artifact tidak ditemui." }, 404);
    return json({ artifactId: updated.id, artifact: updated.artifact, telemetry: updated.telemetry });
  } catch (error) {
    console.error("native_offer_update_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Artifact tidak dapat disimpan." }, 500);
  }
}
