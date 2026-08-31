import { NextRequest, NextResponse } from "next/server";
import { currentContentCreateAccess } from "@/lib/content-create/access";
import { ContentCreateBusyError, withContentCreateUserLock } from "@/lib/content-create/concurrency.server";
import { loadContentCreateContext } from "@/lib/content-create/context.server";
import { buildApprovedOfferSnapshot, canUseContentCreateTier, parseContentCreateRequest, type ContentCreateRequestV1 } from "@/lib/content-create/domain";
import { generateContentCreate } from "@/lib/content-create/provider.server";
import { findContentCreateByRequestId, saveContentCreateArtifact } from "@/lib/content-create/storage.server";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { loadNativeOffer } from "@/lib/native-offer/storage.server";
import { renderOfferText } from "@/lib/native-offer/domain";
import { readBoundedJsonRequest } from "@/lib/native-social-post/http";
import { createAdminClient } from "@/lib/supabase/admin";

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
    admin.from("native_content_engine_artifacts").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("artifact->>kind", "content_create").eq("artifact->draft->>revision", 1).gte("created_at", hourStart.toISOString()),
    admin.from("native_content_engine_artifacts").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("artifact->>kind", "content_create").eq("artifact->draft->>revision", 1).gte("created_at", monthStart.toISOString()),
  ]);
  if (hourly.error || monthly.error) throw hourly.error ?? monthly.error;
  return (hourly.count ?? 0) < MAX_PER_HOUR && (monthly.count ?? 0) < MAX_PER_MONTH;
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak sah." }, 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "Format tidak sah." }, 415);

  const context = await loadContentCreateContext();
  if (!context.ok) {
    const status = context.reason === "unauthenticated" ? 401 : context.reason === "not_onboarded" ? 409 : 500;
    return json({ error: status === 401 ? "Sila log masuk." : "Business Context tidak tersedia." }, status);
  }
  if (!canUseContentCreateTier(context.tier)) return json({ error: "Tugasan ini memerlukan pelan PRO atau MAX." }, 403);
  if (!currentContentCreateAccess(context.user).allowed) return json({ error: "Bina Content belum tersedia untuk akaun ini." }, 403);

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJsonRequest(req, MAX_BODY_BYTES);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "body_too_large";
    return json({ error: tooLarge ? "Permintaan terlalu besar." : "Data tidak sah." }, tooLarge ? 413 : 400);
  }
  const requestId = String(body.requestId || "").trim();
  if (!REQUEST_ID_RE.test(requestId)) return json({ error: "Request ID tidak sah." }, 400);

  let request: ContentCreateRequestV1;
  try {
    request = parseContentCreateRequest(body);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Input tidak sah." }, 400);
  }

  // Authentication, entitlement and independent access checks intentionally
  // precede construction of the privileged service-role client.
  const admin = createAdminClient();
  try {
    return await withContentCreateUserLock(context.user.id, async () => {
      const existing = await findContentCreateByRequestId({ admin, userId: context.user.id, requestId });
      if (existing) return json({ artifactId: existing.id, artifact: existing.artifact, sourceText: existing.sourceText, telemetry: existing.telemetry, warning: null, idempotentReplay: true });
      if (!(await checkUsage(admin, context.user.id))) return json({ error: "Had Bina Content telah dicapai. Cuba semula selepas reset." }, 429);

      const sourceOffer = await loadNativeOffer({ admin, userId: context.user.id, artifactId: request.sourceOfferId });
      if (!sourceOffer || sourceOffer.artifact.status !== "approved") return json({ error: "Artifact sumber tidak ditemui." }, 404);
      const sourceOfferSnapshot = buildApprovedOfferSnapshot({ id: sourceOffer.id, artifact: sourceOffer.artifact, validUntil: sourceOffer.request.validUntil });
      const generated = await generateContentCreate({ business: context.business, request, sourceOfferSnapshot });
      const stored = await saveContentCreateArtifact({ admin, userId: context.user.id, requestId, request, artifact: generated.artifact, telemetry: generated.telemetry, sourceText: renderOfferText(sourceOffer.artifact) });
      return json({
        artifactId: stored.id,
        artifact: stored.artifact,
        sourceText: stored.sourceText,
        telemetry: stored.telemetry,
        warning: generated.warning,
        idempotentReplay: false,
        candidateLimits: { hourly: MAX_PER_HOUR, monthly: MAX_PER_MONTH },
      });
    });
  } catch (error) {
    if (error instanceof ContentCreateBusyError) return json({ error: "Satu generasi content masih berjalan untuk akaun ini. Tunggu sehingga selesai." }, 429);
    console.error("content_create_route_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Content tidak dapat dijana atau disimpan." }, 500);
  }
}
