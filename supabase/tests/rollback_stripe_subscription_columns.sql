-- A4B-030: destructive rollback file only; do not run without a separate GO.
-- Refuse rollback while Stripe data or new billing statuses are present.
begin;
lock table public.subscriptions in access exclusive mode;

do $rollback$
begin
  if exists (
    select 1 from public.subscriptions
    where status in ('past_due', 'unpaid', 'incomplete')
  ) then
    raise exception 'Rollback refused: subscriptions use new Stripe statuses';
  end if;

  if exists (
    select 1 from public.subscriptions
    where stripe_subscription_id is not null or stripe_customer_id is not null
  ) then
    raise exception 'Rollback refused: subscriptions contain Stripe identifiers';
  end if;
end;
$rollback$;

drop index if exists public.subscriptions_stripe_subscription_id_key;
drop index if exists public.subscriptions_stripe_customer_id_idx;
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('pending','active','expired','cancelled'));
alter table public.subscriptions drop column if exists stripe_subscription_id;
alter table public.subscriptions drop column if exists stripe_customer_id;
commit;
