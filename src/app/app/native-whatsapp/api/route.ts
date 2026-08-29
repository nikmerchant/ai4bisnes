import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { currentSlice3Access } from "@/lib/native-whatsapp/access";
import { canUseNativeWhatsAppTier, parseNativeWhatsAppRequest } from "@/lib/native-whatsapp/domain";
import { loadNativeWhatsAppContext } from "@/lib/native-whatsapp/context.server";
import { generateNativeWhatsAppDraft } from "@/lib/native-whatsapp/provider.server";
import { readBoundedJsonRequest } from "@/lib/native-social-post/http";
import { loadNativeOffer } from "@/lib/native-offer/storage.server";
import {
  findNativeWhatsAppDraftByRequestId,
  saveNativeWhatsAppDraft,
} from "@/lib/native-whatsapp/storage.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NativeWhatsAppBusyError, withNativeWhatsAppUserLock } from "@/lib/native-whatsapp/concurrency.server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_384;
const MAX_PER_HOUR = 20;
const MAX_PER_MONTH = 100;
const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function checkUsage(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setUTCMinutes(0, 0, 0);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [hourly, monthly] = await Promise.all([
    admin.from("native_whatsapp_draft_artifacts").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", hourStart.toISOString()),
    admin.from("native_whatsapp_draft_artifacts").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", monthStart.toISOString()),
  ]);
  if (hourly.error || monthly.error) throw hourly.error ?? monthly.error;
  return {
    allowed: (hourly.count ?? 0) < MAX_PER_HOUR && (monthly.count ?? 0) < MAX_PER_MONTH,
    hourly: hourly.count ?? 0,
    monthly: monthly.count ?? 0,
  };
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak sah." }, 403);
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Format tidak sah." }, 415);
  }

  const context = await loadNativeWhatsAppContext();
  if (!context.ok) {
    const status = context.reason === "unauthenticated" ? 401 : context.reason === "not_onboarded" ? 409 : 500;
    return json({ error: status === 401 ? "Sila log masuk." : "Business Context tidak tersedia." }, status);
  }
  if (!currentSlice3Access(context.user).allowed) return json({ error: "Slice 3 belum tersedia untuk akaun ini." }, 403);
  if (!canUseNativeWhatsAppTier(context.tier)) return json({ error: "Tugasan ini memerlukan pelan PRO atau MAX." }, 403);

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJsonRequest(req, MAX_BODY_BYTES);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "body_too_large";
    return json({ error: tooLarge ? "Permintaan terlalu besar." : "Data tidak sah." }, tooLarge ? 413 : 400);
  }
  const requestId = String(body.requestId || "").trim();
  if (!REQUEST_ID_RE.test(requestId)) return json({ error: "Request ID tidak sah." }, 400);

  let request;
  try {
    request = parseNativeWhatsAppRequest(body);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Input tidak sah." }, 400);
  }

  const admin = createAdminClient();
  try {
    return await withNativeWhatsAppUserLock(context.user.id, async () => {
      const existing = await findNativeWhatsAppDraftByRequestId({ admin, userId: context.user.id, requestId });
      if (existing) {
        return json({ artifactId: existing.id, artifact: existing.artifact, telemetry: existing.telemetry, warning: null, idempotentReplay: true });
      }
      const usage = await checkUsage(admin, context.user.id);
      if (!usage.allowed) return json({ error: "Had Slice 3 telah dicapai. Cuba semula selepas reset." }, 429);

      let sourceOffer = null;
      if (request.sourceOfferId !== null) {
        const storedSourceOffer = await loadNativeOffer({
          admin,
          userId: context.user.id,
          artifactId: request.sourceOfferId,
        });
        if (!storedSourceOffer || storedSourceOffer.artifact.status !== "approved") {
          return json({ error: "Artifact sumber tidak ditemui." }, 404);
        }
        const offer = storedSourceOffer.artifact;
        sourceOffer = {
          id: storedSourceOffer.id,
          headline: offer.headline,
          priceNote: offer.priceNote,
          valueStack: offer.valueStack,
          validUntilNote: offer.urgencyNote,
        };
      }

      const generated = await generateNativeWhatsAppDraft({ business: context.business, request, sourceOffer });
      const stored = await saveNativeWhatsAppDraft({
        admin,
        userId: context.user.id,
        requestId,
        request,
        artifact: generated.artifact,
        telemetry: generated.telemetry,
      });
      return json({
        artifactId: stored.id,
        artifact: stored.artifact,
        telemetry: stored.telemetry,
        warning: generated.warning,
        idempotentReplay: false,
        candidateLimits: { hourly: MAX_PER_HOUR, monthly: MAX_PER_MONTH },
      });
    });
  } catch (error) {
    if (error instanceof NativeWhatsAppBusyError) {
      return json({ error: "Satu generation masih berjalan untuk akaun ini. Tunggu sehingga selesai." }, 429);
    }
    console.error("native_whatsapp_route_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Draf balasan tidak dapat dijana atau disimpan." }, 500);
  }
}
