import { NextRequest, NextResponse } from "next/server";
import { currentAffiliatePromoAccess } from "@/lib/affiliate-promo/access";
import { AffiliatePromoBusyError, withAffiliatePromoUserLock } from "@/lib/affiliate-promo/concurrency.server";
import { loadAffiliatePromoContext } from "@/lib/affiliate-promo/context.server";
import { parseAffiliatePromoRequest } from "@/lib/affiliate-promo/domain";
import { generateAffiliatePromo } from "@/lib/affiliate-promo/provider.server";
import { countAffiliatePromoUsage, findAffiliatePromoByRequestId, saveAffiliatePromoArtifact } from "@/lib/affiliate-promo/storage.server";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { readBoundedJsonRequest } from "@/lib/native-social-post/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 16_384;
const MAX_PER_DAY = 5;
const MAX_PER_MONTH = 30;
const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function json(body: Record<string, unknown>, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak sah." }, 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "Format tidak sah." }, 415);
  const context = await loadAffiliatePromoContext();
  if (!context.ok) {
    if (context.reason === "unauthenticated") return json({ error: "Sila log masuk." }, 401);
    if (context.reason === "affiliate_inactive") return json({ error: "Kod affiliate aktif diperlukan." }, 403);
    return json({ error: "Status affiliate tidak dapat disahkan." }, 500);
  }
  if (!currentAffiliatePromoAccess(context.user).allowed) return json({ error: "Studio Promosi Affiliate belum tersedia untuk akaun ini." }, 403);
  let body: Record<string, unknown>;
  try { body = await readBoundedJsonRequest(req, MAX_BODY_BYTES); }
  catch (error) { const tooLarge = error instanceof Error && error.message === "body_too_large"; return json({ error: tooLarge ? "Permintaan terlalu besar." : "Data tidak sah." }, tooLarge ? 413 : 400); }
  const requestId = String(body.requestId || "").trim();
  if (!REQUEST_ID_RE.test(requestId)) return json({ error: "Request ID tidak sah." }, 400);
  let request;
  try {
    // The referral code is protected server context. Any client field with the
    // same name is overwritten and can never select attribution.
    request = parseAffiliatePromoRequest({ ...body, referralCode: context.referralCode });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Input tidak sah." }, 400); }

  // Authentication, active-affiliate context and independent feature access
  // all precede privileged client creation.
  const admin = createAdminClient();
  try {
    return await withAffiliatePromoUserLock(context.user.id, async () => {
      const existing = await findAffiliatePromoByRequestId({ admin, userId: context.user.id, requestId });
      if (existing) return json({ artifactId: existing.id, artifact: existing.artifact, telemetry: { provider: "local", model: "affiliate-promo-deterministic-v1", mode: "deterministic_local", latencyMs: 0, inputTokens: 0, outputTokens: 0, estimatedCostRm: 0 }, warning: null, idempotentReplay: true });
      const usage = await countAffiliatePromoUsage({ admin, userId: context.user.id, now: new Date() });
      if (usage.daily >= MAX_PER_DAY || usage.monthly >= MAX_PER_MONTH) return json({ error: "Had Studio Promosi Affiliate telah dicapai. Cuba semula selepas reset." }, 429);
      const generated = await generateAffiliatePromo(request);
      const stored = await saveAffiliatePromoArtifact({ admin, userId: context.user.id, requestId, artifact: generated.artifact });
      return json({ artifactId: stored.id, artifact: stored.artifact, telemetry: generated.telemetry, warning: generated.warning, idempotentReplay: false, limits: { daily: MAX_PER_DAY, monthly: MAX_PER_MONTH } });
    });
  } catch (error) {
    if (error instanceof AffiliatePromoBusyError) return json({ error: "Satu promosi masih diproses untuk akaun ini." }, 429);
    console.error("affiliate_promo_route_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Promosi tidak dapat dijana atau disimpan." }, 500);
  }
}
