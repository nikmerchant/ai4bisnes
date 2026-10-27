-- A4B-029 phase 2: one read-only SELECT; run only under the named gate.
with checks(name, passed) as (
  select 'stripe_invoice_id_text_nullable', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'affiliate_commissions'
      and column_name = 'stripe_invoice_id' and data_type = 'text' and is_nullable = 'YES'
  )
  union all
  select 'stripe_invoice_id_plain_unique_index', exists (
    select 1 from pg_catalog.pg_index i
    join pg_catalog.pg_class idx on idx.oid = i.indexrelid
    join pg_catalog.pg_namespace ns on ns.oid = idx.relnamespace
    where i.indrelid = to_regclass('public.affiliate_commissions')
      and ns.nspname = 'public' and idx.relname = 'affiliate_commissions_stripe_invoice_id_key'
      and i.indisunique and i.indisvalid and i.indimmediate
      and i.indpred is null and i.indexprs is null and i.indnkeyatts = 1 and i.indnatts = 1
      and i.indkey[0] = (select attnum from pg_catalog.pg_attribute where attrelid = to_regclass('public.affiliate_commissions') and attname = 'stripe_invoice_id' and not attisdropped)
      and pg_catalog.pg_get_indexdef(i.indexrelid) not ilike '%NULLS NOT DISTINCT%'
  )
  union all
  select 'legacy_subscription_id_unique_removed', not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = to_regclass('public.affiliate_commissions')
      and conname = 'affiliate_commissions_subscription_id_key'
  ) and not exists (
    select 1 from pg_catalog.pg_index i
    where i.indrelid = to_regclass('public.affiliate_commissions')
      and i.indisunique and i.indnkeyatts = 1 and i.indkey[0] = (select attnum from pg_catalog.pg_attribute where attrelid = to_regclass('public.affiliate_commissions') and attname = 'subscription_id' and not attisdropped)
  )
  union all
  select 'subscription_id_fk_preserved', exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = to_regclass('public.affiliate_commissions') and c.contype = 'f'
      and c.confrelid = to_regclass('public.subscriptions') and c.convalidated
      and c.conkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = to_regclass('public.affiliate_commissions') and attname = 'subscription_id' and not attisdropped)]::smallint[]
      and c.confkey = array[(select attnum from pg_catalog.pg_attribute where attrelid = to_regclass('public.subscriptions') and attname = 'id' and not attisdropped)]::smallint[]
  )
  union all
  select 'subscription_id_non_unique_index', exists (
    select 1 from pg_catalog.pg_index i
    join pg_catalog.pg_class idx on idx.oid = i.indexrelid
    join pg_catalog.pg_namespace ns on ns.oid = idx.relnamespace
    where i.indrelid = to_regclass('public.affiliate_commissions')
      and ns.nspname = 'public' and idx.relname = 'affiliate_commissions_subscription_id_idx'
      and not i.indisunique and i.indisvalid and i.indpred is null and i.indexprs is null
      and i.indnkeyatts = 1 and i.indnatts = 1 and i.indkey[0] = (select attnum from pg_catalog.pg_attribute where attrelid = to_regclass('public.affiliate_commissions') and attname = 'subscription_id' and not attisdropped)
  )
)
select name, case when passed then 'PASS' else 'FAIL' end as result from checks
union all
select 'ALL_CHECKS', case when bool_and(passed) then 'PASS' else 'FAIL' end from checks;
