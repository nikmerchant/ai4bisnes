-- File only. Restore phase 2 before attempting a phase-1 schema rollback.
begin;
lock table public.affiliate_commissions in access exclusive mode;
do $rollback$
begin
  if exists (
    select 1 from public.affiliate_commissions
    group by subscription_id
    having count(*) > 1
  ) then
    raise exception 'Rollback refused: repeated subscription_id values exist';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = to_regclass('public.affiliate_commissions')
      and conname = 'affiliate_commissions_subscription_id_key'
  ) then
    alter table public.affiliate_commissions
      add constraint affiliate_commissions_subscription_id_key unique (subscription_id);
  end if;
end;
$rollback$;
drop index if exists public.affiliate_commissions_subscription_id_idx;
commit;
