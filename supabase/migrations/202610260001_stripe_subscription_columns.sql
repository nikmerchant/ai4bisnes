begin;
alter table public.subscriptions add column if not exists stripe_subscription_id text;
alter table public.subscriptions add column if not exists stripe_customer_id text;
create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions (stripe_subscription_id);
create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id) where stripe_customer_id is not null;
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('pending','active','expired','cancelled','past_due','unpaid','incomplete'));
commit;
