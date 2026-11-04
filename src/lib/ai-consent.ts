import type { User } from "@supabase/supabase-js";

// Bump when the AI-provider notice changes; users must consent again before provider generation.
export const AI_PROVIDER_CONSENT_VERSION = "2026-11";

export function hasAiProviderConsent(user: Pick<User, "user_metadata">) {
  return user.user_metadata?.ai_provider_consent === AI_PROVIDER_CONSENT_VERSION;
}
