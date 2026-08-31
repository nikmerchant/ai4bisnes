import { NextRequest, NextResponse } from "next/server";
import { currentContentReviewAccess } from "@/lib/content-review/access";
import { ContentReviewBusyError, withContentReviewUserLock } from "@/lib/content-review/concurrency.server";
import { loadContentReviewContext } from "@/lib/content-review/context.server";
import { canUseContentReviewTier, parseContentReviewRequest, type ContentReviewRequestV1 } from "@/lib/content-review/domain";
import { sha256NormalizedSourceText } from "@/lib/content-review/hash.server";
import { generateContentReview } from "@/lib/content-review/provider.server";
import {
  findContentReviewByRequestId,
  saveContentReviewArtifact,
} from "@/lib/content-review/storage.server";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { readBoundedJsonRequest } from "@/lib/native-social-post/http";
import { renderSocialPostText } from "@/lib/native-social-post/domain";
import { loadNativeSocialPost } from "@/lib/native-social-post/storage.server";
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
      .eq("user_id", userId).eq("artifact->improvedDraft->>revision", 1).gte("created_at", hourStart.toISOString()),
    admin.from("native_content_engine_artifacts").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("artifact->improvedDraft->>revision", 1).gte("created_at", monthStart.toISOString()),
  ]);
  if (hourly.error || monthly.error) throw hourly.error ?? monthly.error;
  return (hourly.count ?? 0) < MAX_PER_HOUR && (monthly.count ?? 0) < MAX_PER_MONTH;
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak sah." }, 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "Format tidak sah." }, 415);

  const context = await loadContentReviewContext();
  if (!context.ok) {
    const status = context.reason === "unauthenticated" ? 401 : context.reason === "not_onboarded" ? 409 : 500;
    return json({ error: status === 401 ? "Sila log masuk." : "Business Context tidak tersedia." }, status);
  }
  if (!currentContentReviewAccess(context.user).allowed) return json({ error: "Review & Improve belum tersedia untuk akaun ini." }, 403);
  if (!canUseContentReviewTier(context.tier)) return json({ error: "Tugasan ini memerlukan pelan PRO atau MAX." }, 403);

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJsonRequest(req, MAX_BODY_BYTES);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "body_too_large";
    return json({ error: tooLarge ? "Permintaan terlalu besar." : "Data tidak sah." }, tooLarge ? 413 : 400);
  }
  const requestId = String(body.requestId || "").trim();
  if (!REQUEST_ID_RE.test(requestId)) return json({ error: "Request ID tidak sah." }, 400);

  let request: ContentReviewRequestV1;
  try {
    request = parseContentReviewRequest(body);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Input tidak sah." }, 400);
  }

  // Authentication, entitlement and access checks above intentionally precede
  // construction of the privileged client.
  const admin = createAdminClient();
  try {
    return await withContentReviewUserLock(context.user.id, async () => {
      const existing = await findContentReviewByRequestId({ admin, userId: context.user.id, requestId });
      if (existing) {
        return json({ artifactId: existing.id, artifact: existing.artifact, sourceText: existing.sourceText, telemetry: existing.telemetry, warning: null, idempotentReplay: true });
      }
      if (!(await checkUsage(admin, context.user.id))) return json({ error: "Had Review & Improve telah dicapai. Cuba semula selepas reset." }, 429);

      let canonicalSourceText = request.sourceText;
      let sourceSocialPostStatus: "draft" | "approved" | null = null;
      if (request.entry === "from_social_post") {
        const sourcePost = await loadNativeSocialPost({
          admin,
          userId: context.user.id,
          artifactId: request.sourceSocialPostId!,
        });
        if (!sourcePost || !(["draft", "approved"] as const).includes(sourcePost.artifact.status)) {
          return json({ error: "Artifact sumber tidak ditemui." }, 404);
        }
        canonicalSourceText = renderSocialPostText(sourcePost.artifact);
        sourceSocialPostStatus = sourcePost.artifact.status;
        request = { ...request, sourceText: canonicalSourceText };
      }

      const generated = await generateContentReview({
        business: context.business,
        request,
        sourceSocialPostStatus,
        sourceTextHash: sha256NormalizedSourceText(canonicalSourceText),
      });
      const stored = await saveContentReviewArtifact({
        admin,
        userId: context.user.id,
        requestId,
        request,
        artifact: generated.artifact,
        telemetry: generated.telemetry,
        sourceText: canonicalSourceText,
      });
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
    if (error instanceof ContentReviewBusyError) return json({ error: "Satu review masih berjalan untuk akaun ini. Tunggu sehingga selesai." }, 429);
    console.error("content_review_route_failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Review tidak dapat dijana atau disimpan." }, 500);
  }
}
