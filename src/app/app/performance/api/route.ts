import { NextRequest, NextResponse } from "next/server";
import { currentPerformanceLearningAccess } from "@/lib/performance-learning/access";
import { PerformanceLearningBusyError, withPerformanceLearningUserLock } from "@/lib/performance-learning/concurrency.server";
import { loadPerformanceLearningContext } from "@/lib/performance-learning/context.server";
import { buildApprovedPerformanceSourceSnapshot, canUsePerformanceLearningTier, parsePerformanceLearningRequest, renderPerformanceSourceText, type PerformanceLearningRequestV1 } from "@/lib/performance-learning/domain";
import { generatePerformanceLearning } from "@/lib/performance-learning/provider.server";
import { findPerformanceLearningByRequestId, savePerformanceLearningArtifact } from "@/lib/performance-learning/storage.server";
import { loadContentCreateArtifact } from "@/lib/content-create/storage.server";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { readBoundedJsonRequest } from "@/lib/native-social-post/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 16_384;
const MAX_PER_HOUR = 20;
const MAX_PER_MONTH = 100;
const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function json(body: Record<string, unknown>, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }

async function checkUsage(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const now = new Date();
  const hourStart = new Date(now); hourStart.setUTCMinutes(0, 0, 0);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [hourly, monthly] = await Promise.all([
    admin.from("native_content_engine_artifacts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("artifact->>kind", "performance_learning").eq("artifact->>revision", 1).gte("created_at", hourStart.toISOString()),
    admin.from("native_content_engine_artifacts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("artifact->>kind", "performance_learning").eq("artifact->>revision", 1).gte("created_at", monthStart.toISOString()),
  ]);
  if (hourly.error || monthly.error) throw hourly.error ?? monthly.error;
  return (hourly.count ?? 0) < MAX_PER_HOUR && (monthly.count ?? 0) < MAX_PER_MONTH;
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak sah." }, 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "Format tidak sah." }, 415);
  const context = await loadPerformanceLearningContext();
  if (!context.ok) return json({ error: context.reason === "unauthenticated" ? "Sila log masuk." : "Entitlement tidak tersedia." }, context.reason === "unauthenticated" ? 401 : 500);
  if (!canUsePerformanceLearningTier(context.tier)) return json({ error: "Tugasan ini memerlukan pelan PRO atau MAX." }, 403);
  if (!currentPerformanceLearningAccess(context.user).allowed) return json({ error: "Rekod Prestasi belum tersedia untuk akaun ini." }, 403);
  let body: Record<string, unknown>;
  try { body = await readBoundedJsonRequest(req, MAX_BODY_BYTES); }
  catch (error) { const tooLarge = error instanceof Error && error.message === "body_too_large"; return json({ error: tooLarge ? "Permintaan terlalu besar." : "Data tidak sah." }, tooLarge ? 413 : 400); }
  const requestId = String(body.requestId || "").trim();
  if (!REQUEST_ID_RE.test(requestId)) return json({ error: "Request ID tidak sah." }, 400);
  let request: PerformanceLearningRequestV1;
  try { request = parsePerformanceLearningRequest(body); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Input tidak sah." }, 400); }

  // Auth, entitlement and independent access intentionally precede the
  // privileged service-role client. Source lookup remains id + owner scoped;
  // every invalid source (draft/missing/cross-owner/corrupted) shares the
  // same generic 404.
  const admin = createAdminClient();
  try {
    return await withPerformanceLearningUserLock(context.user.id, async () => {
      const existing = await findPerformanceLearningByRequestId({ admin, userId: context.user.id, requestId });
      if (existing) return json({ artifactId: existing.id, artifact: existing.artifact, sourceText: existing.sourceText, telemetry: existing.telemetry, warning: null, idempotentReplay: true });
      if (!(await checkUsage(admin, context.user.id))) return json({ error: "Had Rekod Prestasi telah dicapai. Cuba semula selepas reset." }, 429);
      const source = await loadContentCreateArtifact({ admin, userId: context.user.id, artifactId: request.sourceContentCreateId });
      if (!source || source.artifact.status !== "approved") return json({ error: "Artifact sumber tidak ditemui." }, 404);
      let sourceSnapshot;
      try { sourceSnapshot = buildApprovedPerformanceSourceSnapshot({ id: source.id, artifact: source.artifact }); }
      catch { return json({ error: "Artifact sumber tidak ditemui." }, 404); }
      const generated = await generatePerformanceLearning({ request, sourceSnapshot });
      const stored = await savePerformanceLearningArtifact({ admin, userId: context.user.id, requestId, request, artifact: generated.artifact, telemetry: generated.telemetry, sourceText: renderPerformanceSourceText(sourceSnapshot) });
      return json({ artifactId: stored.id, artifact: stored.artifact, sourceText: stored.sourceText, telemetry: stored.telemetry, warning: generated.warning, idempotentReplay: false, candidateLimits: { hourly: MAX_PER_HOUR, monthly: MAX_PER_MONTH } });
    });
  } catch (error) {
    if (error instanceof PerformanceLearningBusyError) return json({ error: "Satu rekod prestasi masih diproses untuk akaun ini." }, 429);
    console.error("performance_learning_route_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Rekod prestasi tidak dapat dijana atau disimpan." }, 500);
  }
}
