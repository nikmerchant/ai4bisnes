-- Read-only verification for CE-1 prepared migration.
do $$
declare
  rls_enabled boolean;
  rls_forced boolean;
  owner_policy_count integer;
  mutation_grant_count integer;
  select_grant_count integer;
  index_count integer;
  unique_count integer;
begin
  select c.relrowsecurity, c.relforcerowsecurity
    into rls_enabled, rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'native_content_engine_artifacts';

  if coalesce(rls_enabled, false) is not true then
    raise exception 'native_content_engine_artifacts RLS is not enabled';
  end if;
  if coalesce(rls_forced, false) is not true then
    raise exception 'native_content_engine_artifacts FORCE RLS is not enabled';
  end if;

  select count(*) into owner_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'native_content_engine_artifacts'
    and policyname = 'native content engine owner select'
    and cmd = 'SELECT'
    and roles = array['authenticated']::name[]
    and qual like '%auth.uid()%user_id%';
  if owner_policy_count <> 1 then
    raise exception 'owner SELECT policy is missing or malformed';
  end if;

  select count(*) into mutation_grant_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'native_content_engine_artifacts'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if mutation_grant_count <> 0 then
    raise exception 'direct client mutation grants detected';
  end if;

  select count(*) into select_grant_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'native_content_engine_artifacts'
    and grantee = 'authenticated'
    and privilege_type = 'SELECT';
  if select_grant_count <> 1 then
    raise exception 'authenticated SELECT grant is missing';
  end if;

  select count(*) into index_count
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'native_content_engine_artifacts'
    and indexname = 'native_content_engine_user_created_idx';
  if index_count <> 1 then
    raise exception 'native_content_engine_user_created_idx missing';
  end if;

  select count(*) into unique_count
  from pg_constraint
  where conrelid = 'public.native_content_engine_artifacts'::regclass
    and conname = 'native_content_engine_user_request_unique'
    and contype = 'u';
  if unique_count <> 1 then
    raise exception 'native_content_engine_user_request_unique missing';
  end if;
end
$$;

select 'CONTENT_REVIEW_RLS_PASS' as result;
