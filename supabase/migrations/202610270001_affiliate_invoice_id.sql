begin;
alter table public.affiliate_commissions add column if not exists stripe_invoice_id text;
create unique index if not exists affiliate_commissions_stripe_invoice_id_key
  on public.affiliate_commissions (stripe_invoice_id);
commit;
