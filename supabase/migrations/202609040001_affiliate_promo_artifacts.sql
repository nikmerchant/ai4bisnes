-- Affiliate Promo Studio v1 — additive table (pattern S1-3)
-- Authorized: local implementation only; production apply requires separate gate.
BEGIN;

CREATE TABLE IF NOT EXISTS public.affiliate_promo_artifacts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  artifact jsonb NOT NULL
    CHECK (octet_length(artifact::text) <= 32768)
    CHECK (artifact->>'kind' = 'affiliate_promo'),
  rendered_text text NOT NULL
    CHECK (octet_length(rendered_text) <= 16384),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS affiliate_promo_owner_time_idx
  ON public.affiliate_promo_artifacts (user_id, created_at DESC);

ALTER TABLE public.affiliate_promo_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_promo_artifacts FORCE ROW LEVEL SECURITY;

CREATE POLICY affiliate_promo_select_owner ON public.affiliate_promo_artifacts
  FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
