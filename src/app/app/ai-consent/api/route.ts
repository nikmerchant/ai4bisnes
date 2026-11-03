import { NextRequest, NextResponse } from "next/server";
import { AI_PROVIDER_CONSENT_VERSION } from "@/lib/ai-consent";
import { isSameOriginRequest } from "@/lib/http/same-origin.server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// ponytail: consent lives in auth user_metadata (no migration); withdrawal is by email per Privasi §7.
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return json({ error: "Permintaan tidak sah." }, 403);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sila log masuk." }, 401);

  const { error } = await supabase.auth.updateUser({
    data: { ai_provider_consent: AI_PROVIDER_CONSENT_VERSION, ai_provider_consent_at: new Date().toISOString() },
  });
  if (error) {
    console.error("ai_consent_update_failed", error.message);
    return json({ error: "Persetujuan tidak dapat direkod." }, 500);
  }
  return json({ ok: true });
}
