-- Verify affiliate_promo_artifacts: FORCE RLS, owner-only SELECT, no mutation grants.
-- Read-only verification; run with service role in a disposable/staging project.
WITH checks AS (
  SELECT
    EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'affiliate_promo_artifacts'
    ) AS table_exists,
    EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'affiliate_promo_artifacts' AND c.relrowsecurity
    ) AS rls_enabled,
    EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'affiliate_promo_artifacts' AND c.relforcerowsecurity
    ) AS force_rls,
    (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'affiliate_promo_artifacts'
        AND policyname = 'affiliate_promo_select_owner'
        AND cmd = 'SELECT'
        AND qual LIKE '%auth.uid() = user_id%') AS owner_select_policies,
    (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'affiliate_promo_artifacts'
        AND cmd IN ('INSERT','UPDATE','DELETE')) AS mutation_policies,
    (SELECT count(*) FROM information_schema.table_privileges
      WHERE table_schema = 'public' AND table_name = 'affiliate_promo_artifacts'
        AND grantee IN ('anon','authenticated')
        AND privilege_type IN ('INSERT','UPDATE','DELETE','ALL')) = 0 AS no_mutation_grants,
    EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'affiliate_promo_artifacts'
        AND indexname = 'affiliate_promo_owner_time_idx'
    ) AS owner_index,
    EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname LIKE 'affiliate_promo_artifacts_user_id_request_id_key'
    ) AS idempotency_unique
)
SELECT
  CASE WHEN table_exists AND rls_enabled AND force_rls
        AND owner_select_policies = 1 AND mutation_policies = 0
        AND no_mutation_grants AND owner_index AND idempotency_unique
  THEN 'AFFILIATE_PROMO_DDL_VALID'
  ELSE 'AFFILIATE_PROMO_DDL_INVALID: ' ||
       'table=' || table_exists ||
       ' rls=' || rls_enabled ||
       ' force=' || force_rls ||
       ' owner_select=' || owner_select_policies ||
       ' mutation_policies=' || mutation_policies ||
       ' no_grants=' || no_mutation_grants ||
       ' idx=' || owner_index ||
       ' uniq=' || idempotency_unique
  END AS verification
FROM checks;
