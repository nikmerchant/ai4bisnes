begin;
create index if not exists affiliate_commissions_subscription_id_idx
  on public.affiliate_commissions (subscription_id);
alter table public.affiliate_commissions drop constraint if exists affiliate_commissions_subscription_id_key;
commit;
