-- Read-only verification for Slice 3 native WhatsApp draft shadow table.
-- Run after the additive migration. Raises on any failed invariant.

do $$
declare
  rls_enabled boolean;
  rls_forced boolean;
  owner_policy_count integer;
  forbidden_mutation_grants integer;
  unique_count integer;
begin
  select c.relrowsecurity, c.relforcerowsecurity
    into rls_enabled, rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'native_whatsapp_draft_artifacts';

  if coalesce(rls_enabled, false) is not true then
    raise exception 'native_whatsapp_draft_artifacts RLS is not enabled';
  end if;
  if coalesce(rls_forced, false) is not true then
    raise exception 'native_whatsapp_draft_artifacts FORCE RLS is not enabled';
  end if;

  select count(*) into owner_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'native_whatsapp_draft_artifacts'
    and policyname = 'native whatsapp drafts owner select'
    and cmd = 'SELECT'
    and 'authenticated' = any(roles);

  if owner_policy_count <> 1 then
    raise exception 'owner SELECT policy missing or duplicated';
  end if;

  select count(*) into forbidden_mutation_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'native_whatsapp_draft_artifacts'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES');

  if forbidden_mutation_grants <> 0 then
    raise exception 'direct client mutation grants detected';
  end if;

  select count(*) into unique_count
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'native_whatsapp_draft_artifacts'
    and con.conname = 'native_whatsapp_user_request_unique'
    and con.contype = 'u';

  if unique_count <> 1 then
    raise exception 'durable user/request unique constraint missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'native_whatsapp_draft_artifacts'
      and indexname = 'native_whatsapp_user_created_idx'
  ) then
    raise exception 'owner/time index missing';
  end if;
end
$$;

select 'SLICE3_RLS_PASS' as result;
