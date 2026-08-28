-- Verify controlled in-place canary shadow table for Slice 2 (native_offer_artifacts).
-- Read-only. Run after 202608280001_native_offer_rls.sql.
do $$
declare
  rls_enabled boolean;
  rls_forced boolean;
  owner_policy_count integer;
  mutation_grant_count integer;
  index_count integer;
  unique_count integer;
begin
  select c.relrowsecurity, c.relforcerowsecurity
    into rls_enabled, rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'native_offer_artifacts';

  if coalesce(rls_enabled, false) is not true then
    raise exception 'native_offer_artifacts RLS is not enabled';
  end if;
  if coalesce(rls_forced, false) is not true then
    raise exception 'native_offer_artifacts FORCE RLS is not enabled';
  end if;

  select count(*) into owner_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'native_offer_artifacts'
    and policyname = 'native offers owner select'
    and cmd = 'SELECT'
    and roles = array['authenticated']::name[]
    and qual like '%auth.uid()%user_id%';
  if owner_policy_count <> 1 then
    raise exception 'owner SELECT policy is missing or malformed';
  end if;

  select count(*) into mutation_grant_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'native_offer_artifacts'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if mutation_grant_count <> 0 then
    raise exception 'direct client mutation grants remain on native_offer_artifacts';
  end if;

  select count(*) into index_count
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'native_offer_artifacts'
    and indexname = 'native_offer_user_created_idx';
  if index_count <> 1 then
    raise exception 'Slice 2 owner/time index missing';
  end if;

  select count(*) into unique_count
  from pg_constraint
  where conrelid = 'public.native_offer_artifacts'::regclass
    and conname = 'native_offer_user_request_unique'
    and contype = 'u';
  if unique_count <> 1 then
    raise exception 'durable request idempotency constraint missing';
  end if;
end
$$;
