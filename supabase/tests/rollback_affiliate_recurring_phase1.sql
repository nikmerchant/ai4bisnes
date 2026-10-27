-- File only. Requires phase-2 rollback first and no invoice identifiers in use.
begin;
lock table public.affiliate_commissions in access exclusive mode;
do $rollback$
begin
  if exists (
    select 1 from public.affiliate_commissions where stripe_invoice_id is not null
  ) then
    raise exception 'Rollback refused: Stripe invoice identifiers exist';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint c
    join pg_catalog.pg_index i on i.indexrelid = c.conindid
    where c.conrelid = to_regclass('public.affiliate_commissions')
      and c.conname = 'affiliate_commissions_subscription_id_key'
      and c.contype = 'u' and c.convalidated and not c.condeferrable
      and c.conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = to_regclass('public.affiliate_commissions') and attname = 'subscription_id' and not attisdropped)]::smallint[]
      and i.indisunique and i.indisvalid and i.indpred is null
  ) then
    raise exception 'Rollback refused: restore subscription_id unique key first';
  end if;
end;
$rollback$;
drop index if exists public.affiliate_commissions_stripe_invoice_id_key;
alter table public.affiliate_commissions drop column if exists stripe_invoice_id;
commit;
