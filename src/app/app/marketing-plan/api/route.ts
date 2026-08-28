import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { buildMarketingPlanPrompt } from "../../plan-engine/prompt";
import { parsePlanResponse, validateArtifactForUpdate, validateMarketingPlanInputs } from "../../plan-engine/validation";
import type { Profil } from "../../shared";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Server belum dikonfigurasi untuk menyimpan pelan.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, products, target_customer, location, tier, onboarded, category_id, categories(name_ms), usp, tone_of_voice, main_competitors, price_range, platforms, website")
    .eq("id", user.id)
    .single<Profil>();
  if (!profile) return null;
  return { user, profile };
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return error("Permintaan tidak sah.", 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return error("Format permintaan tidak sah.", 415);
  const ctx = await context();
  if (!ctx) return error("Sila log masuk semula.", 401);
  if (ctx.profile.tier !== "max") return error("Marketing Plan 30 Hari tersedia untuk pelan MAX.", 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return error("Data tidak dapat dibaca.", 400);
  }

  try {
    const admin = adminClient();
    if (body.action === "prompt") {
      const inputs = validateMarketingPlanInputs(body.inputs);
      const prompt = buildMarketingPlanPrompt(inputs, ctx.profile);
      const { data, error: insertError } = await admin
        .from("generated_outputs")
        .insert({
          user_id: ctx.user.id,
          task_slug: "marketing-plan-draft",
          task_title: "Pelan Pemasaran 30 Hari",
          inputs: { bridge_inputs: inputs, schema_version: 1 },
          prompt_text: prompt,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      return NextResponse.json({ generatedOutputId: data.id, prompt, schemaVersion: 1 });
    }

    if (body.action === "import") {
      const outputId = Number(body.generatedOutputId);
      const rawResponse = typeof body.rawResponse === "string" ? body.rawResponse : "";
      if (!Number.isSafeInteger(outputId) || outputId < 1) return error("Rujukan arahan tidak sah.", 400);
      const { data: existing } = await admin
        .from("generated_outputs")
        .select("id, inputs")
        .eq("id", outputId)
        .eq("user_id", ctx.user.id)
        .eq("task_slug", "marketing-plan-draft")
        .maybeSingle();
      if (!existing) return error("Arahan ini tidak ditemui.", 404);
      const artifact = parsePlanResponse(rawResponse, "marketing_30d");
      const savedInputs = existing.inputs && typeof existing.inputs === "object" ? existing.inputs : {};
      const { error: updateError } = await admin
        .from("generated_outputs")
        .update({
          task_slug: "marketing-plan-plan",
          inputs: { ...savedInputs, artifact, raw_response: rawResponse.slice(0, 262144) },
        })
        .eq("id", outputId)
        .eq("user_id", ctx.user.id);
      if (updateError) throw updateError;
      return NextResponse.json({ outputId, artifact });
    }

    if (body.action === "update") {
      const outputId = Number(body.outputId);
      if (!Number.isSafeInteger(outputId) || outputId < 1) return error("Pelan tidak sah.", 400);
      const artifact = validateArtifactForUpdate(body.artifact, "marketing_30d");
      const { data: existing } = await admin
        .from("generated_outputs")
        .select("id, inputs")
        .eq("id", outputId)
        .eq("user_id", ctx.user.id)
        .eq("task_slug", "marketing-plan-plan")
        .maybeSingle();
      if (!existing) return error("Pelan tidak ditemui.", 404);
      const savedInputs = existing.inputs && typeof existing.inputs === "object" ? existing.inputs : {};
      const { error: updateError } = await admin
        .from("generated_outputs")
        .update({ inputs: { ...savedInputs, artifact } })
        .eq("id", outputId)
        .eq("user_id", ctx.user.id);
      if (updateError) throw updateError;
      return NextResponse.json({ outputId, artifact });
    }

    return error("Tindakan tidak disokong.", 400);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Ralat berlaku. Sila cuba lagi.";
    return error(message, 400);
  }
}
