-- Affiliate Promo Studio v1 — Gate B atomic production-canary pack
-- Authorized 4 Sep 2026: bounded one-UUID canary, provider/publish/full-rollout OFF.
-- Expected baseline verified from inside the running production container.
-- If Supabase asks whether to enable RLS, choose "Enable RLS".

begin;

-- Fail before DDL if legacy row counts drifted or APS unexpectedly exists.
do $$
begin
  if (select count(*) from public.generated_outputs) <> 7 then raise exception 'APS Gate B blocked: generated_outputs baseline drift'; end if;
  if (select count(*) from public.native_social_post_artifacts) <> 2 then raise exception 'APS Gate B blocked: native_social_post_artifacts baseline drift'; end if;
  if (select count(*) from public.native_offer_artifacts) <> 3 then raise exception 'APS Gate B blocked: native_offer_artifacts baseline drift'; end if;
  if (select count(*) from public.native_whatsapp_draft_artifacts) <> 3 then raise exception 'APS Gate B blocked: native_whatsapp_draft_artifacts baseline drift'; end if;
  if (select count(*) from public.native_content_engine_artifacts) <> 15 then raise exception 'APS Gate B blocked: native_content_engine_artifacts baseline drift'; end if;
  if to_regclass('public.affiliate_promo_artifacts') is not null then raise exception 'APS Gate B blocked: affiliate_promo_artifacts already exists'; end if;
end
$$;

-- Snapshot legacy RLS policies; aliases avoid duplicate CTAS column names.
CREATE TEMP TABLE aps_legacy_policies_before ON COMMIT DROP AS
select schemaname, tablename, policyname, permissive,
       roles::text as roles, cmd,
       coalesce(qual, '') as qual,
       coalesce(with_check, '') as with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'generated_outputs',
    'native_social_post_artifacts',
    'native_offer_artifacts',
    'native_whatsapp_draft_artifacts',
    'native_content_engine_artifacts'
  );

-- Additive APS table only.
CREATE TABLE IF NOT EXISTS public.affiliate_promo_artifacts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  artifact jsonb NOT NULL
    CHECK (jsonb_typeof(artifact) = 'object')
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

DROP POLICY IF EXISTS affiliate_promo_select_owner ON public.affiliate_promo_artifacts;

REVOKE ALL ON TABLE public.affiliate_promo_artifacts FROM anon;
REVOKE ALL ON TABLE public.affiliate_promo_artifacts FROM authenticated;
GRANT SELECT ON TABLE public.affiliate_promo_artifacts TO authenticated;

CREATE POLICY affiliate_promo_select_owner
ON public.affiliate_promo_artifacts
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Executable structural verification. Any failure rolls back all APS DDL.
do $$
declare
  rls_enabled boolean;
  rls_forced boolean;
  owner_policy_count integer;
  mutation_policy_count integer;
  forbidden_grants integer;
  select_grants integer;
  request_id_type text;
  unique_count integer;
begin
  select c.relrowsecurity, c.relforcerowsecurity
    into rls_enabled, rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'affiliate_promo_artifacts';

  if coalesce(rls_enabled, false) is not true then raise exception 'APS RLS is not enabled'; end if;
  if coalesce(rls_forced, false) is not true then raise exception 'APS FORCE RLS is not enabled'; end if;

  select count(*) into owner_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'affiliate_promo_artifacts'
    and policyname = 'affiliate_promo_select_owner' and cmd = 'SELECT'
    and 'authenticated' = any(roles);
  if owner_policy_count <> 1 then raise exception 'APS owner SELECT policy missing or duplicated'; end if;

  select count(*) into mutation_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'affiliate_promo_artifacts'
    and cmd in ('INSERT', 'UPDATE', 'DELETE');
  if mutation_policy_count <> 0 then raise exception 'APS mutation policy detected'; end if;

  select count(*) into forbidden_grants
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'affiliate_promo_artifacts'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES');
  if forbidden_grants <> 0 then raise exception 'APS mutation grants detected'; end if;

  select count(*) into select_grants
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'affiliate_promo_artifacts'
    and grantee = 'authenticated' and privilege_type = 'SELECT';
  if select_grants <> 1 then raise exception 'APS authenticated SELECT grant missing'; end if;

  select data_type into request_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'affiliate_promo_artifacts' and column_name = 'request_id';
  if request_id_type <> 'uuid' then raise exception 'APS request_id is not uuid'; end if;

  select count(*) into unique_count
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'affiliate_promo_artifacts'
    and con.contype = 'u';
  if unique_count <> 1 then raise exception 'APS user/request unique constraint missing'; end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'affiliate_promo_artifacts'
      and indexname = 'affiliate_promo_owner_time_idx'
  ) then raise exception 'APS owner/time index missing'; end if;

  if (select count(*) from public.affiliate_promo_artifacts) <> 0 then raise exception 'APS table is not empty at creation'; end if;
end
$$;

-- Post-DDL legacy counts must remain identical.
do $$
begin
  if (select count(*) from public.generated_outputs) <> 7 then raise exception 'APS Gate B rollback: generated_outputs count drift'; end if;
  if (select count(*) from public.native_social_post_artifacts) <> 2 then raise exception 'APS Gate B rollback: native_social_post_artifacts count drift'; end if;
  if (select count(*) from public.native_offer_artifacts) <> 3 then raise exception 'APS Gate B rollback: native_offer_artifacts count drift'; end if;
  if (select count(*) from public.native_whatsapp_draft_artifacts) <> 3 then raise exception 'APS Gate B rollback: native_whatsapp_draft_artifacts count drift'; end if;
  if (select count(*) from public.native_content_engine_artifacts) <> 15 then raise exception 'APS Gate B rollback: native_content_engine_artifacts count drift'; end if;
end
$$;

-- Post-DDL legacy policy definitions must be byte-equivalent.
do $$
begin
  if exists (
    (
      select schemaname, tablename, policyname, permissive, roles::text as roles,
             cmd, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
      from pg_policies
      where schemaname = 'public'
        and tablename in ('generated_outputs','native_social_post_artifacts','native_offer_artifacts','native_whatsapp_draft_artifacts','native_content_engine_artifacts')
      EXCEPT
      select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      from aps_legacy_policies_before
    )
    union all
    (
      select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      from aps_legacy_policies_before
      EXCEPT
      select schemaname, tablename, policyname, permissive, roles::text as roles,
             cmd, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
      from pg_policies
      where schemaname = 'public'
        and tablename in ('generated_outputs','native_social_post_artifacts','native_offer_artifacts','native_whatsapp_draft_artifacts','native_content_engine_artifacts')
    )
  ) then raise exception 'APS Gate B rollback: legacy policy drift'; end if;
end
$$;

commit;

select
  'APS_GATE_B_PASS' as result,
  (select count(*) from public.generated_outputs) as generated_outputs,
  (select count(*) from public.native_social_post_artifacts) as social,
  (select count(*) from public.native_offer_artifacts) as offers,
  (select count(*) from public.native_whatsapp_draft_artifacts) as whatsapp,
  (select count(*) from public.native_content_engine_artifacts) as content_engine,
  (select count(*) from public.affiliate_promo_artifacts) as affiliate_promo;
