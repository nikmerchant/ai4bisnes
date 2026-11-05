-- A4B-038 B1: artifact tables store raw generation telemetry (model, tokens, cost).
-- The owner SELECT grant let a signed-in user read it straight from PostgREST,
-- bypassing forViewer. Every app read uses the service-role client, so the
-- grant is unused. RLS stays enabled and the owner policies stay as defence in depth.
begin;

revoke select on table public.native_social_post_artifacts from authenticated;
revoke select on table public.native_offer_artifacts from authenticated;
revoke select on table public.native_whatsapp_draft_artifacts from authenticated;
revoke select on table public.native_content_engine_artifacts from authenticated;

commit;

-- Verify (expect 4 rows, every column false):
select t.table_name,
  has_table_privilege('authenticated', 'public.' || t.table_name, 'select') as authenticated_select,
  has_table_privilege('anon', 'public.' || t.table_name, 'select') as anon_select
from (values ('native_social_post_artifacts'), ('native_offer_artifacts'),
             ('native_whatsapp_draft_artifacts'), ('native_content_engine_artifacts')) as t(table_name);
