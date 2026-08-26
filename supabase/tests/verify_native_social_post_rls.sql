-- Verify controlled in-place canary shadow table on the main Supabase project.
-- This does not mutate data. Run after 202608260001_native_social_post_rls.sql.
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
  where n.nspname = 'public' and c.relname = 'native_social_post_artifacts';

  if coalesce(rls_enabled, false) is not true then
    raise exception 'native_social_post_artifacts RLS is not enabled';
  end if;
  if coalesce(rls_forced, false) is not true then
    raise exception 'native_social_post_artifacts FORCE RLS is not enabled';
  end if;

  select count(*) into owner_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'native_social_post_artifacts'
    and policyname = 'native social posts owner select'
    and cmd = 'SELECT'
    and roles = array['authenticated']::name[]
    and qual like '%auth.uid()%user_id%';
  if owner_policy_count <> 1 then
    raise exception 'owner SELECT policy is missing or malformed';
  end if;

  select count(*) into mutation_grant_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'native_social_post_artifacts'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if mutation_grant_count <> 0 then
    raise exception 'direct client mutation grants remain on native_social_post_artifacts';
  end if;

  select count(*) into index_count
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'native_social_post_artifacts'
    and indexname = 'native_social_post_user_created_idx';
  if index_count <> 1 then
    raise exception 'Slice 1 owner/time index missing';
  end if;

  select count(*) into unique_count
  from pg_constraint
  where conrelid = 'public.native_social_post_artifacts'::regclass
    and conname = 'native_social_post_user_request_unique'
    and contype = 'u';
  if unique_count <> 1 then
    raise exception 'durable request idempotency constraint missing';
  end if;
end
$$;

-- Runtime canary gate must additionally run direct PostgREST checks:
-- anon denied; allowlisted owner can SELECT own row; non-owner receives no row;
-- authenticated direct INSERT/UPDATE/DELETE denied; generated_outputs 1.0 smoke test unchanged.
