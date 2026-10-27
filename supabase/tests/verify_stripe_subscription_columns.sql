-- A4B-030: read-only verification; Nik runs only under the separate migration gate.
begin transaction read only;

with checks(name, passed) as (
  select 'stripe_subscription_id_text_nullable', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions'
      and column_name = 'stripe_subscription_id' and data_type = 'text'
      and is_nullable = 'YES'
  )
  union all
  select 'stripe_customer_id_text_nullable', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions'
      and column_name = 'stripe_customer_id' and data_type = 'text'
      and is_nullable = 'YES'
  )
  union all
  select 'stripe_subscription_id_plain_unique_index', exists (
    select 1 from pg_catalog.pg_index i
    join pg_catalog.pg_class idx on idx.oid = i.indexrelid
    join pg_catalog.pg_namespace ns on ns.oid = idx.relnamespace
    where i.indrelid = to_regclass('public.subscriptions')
      and ns.nspname = 'public' and idx.relname = 'subscriptions_stripe_subscription_id_key'
      and i.indisunique and i.indisvalid and i.indimmediate
      and i.indpred is null and i.indexprs is null
      and i.indnkeyatts = 1 and i.indnatts = 1
      and i.indkey[0] = (
        select attnum from pg_catalog.pg_attribute
        where attrelid = to_regclass('public.subscriptions')
          and attname = 'stripe_subscription_id' and not attisdropped
      )
      and pg_catalog.pg_get_indexdef(i.indexrelid) not ilike '%NULLS NOT DISTINCT%'
  )
  union all
  select 'stripe_customer_id_partial_index', exists (
    select 1 from pg_catalog.pg_index i
    join pg_catalog.pg_class idx on idx.oid = i.indexrelid
    join pg_catalog.pg_namespace ns on ns.oid = idx.relnamespace
    where i.indrelid = to_regclass('public.subscriptions')
      and ns.nspname = 'public' and idx.relname = 'subscriptions_stripe_customer_id_idx'
      and not i.indisunique and i.indisvalid and i.indexprs is null
      and i.indnkeyatts = 1 and i.indnatts = 1
      and i.indkey[0] = (
        select attnum from pg_catalog.pg_attribute
        where attrelid = to_regclass('public.subscriptions')
          and attname = 'stripe_customer_id' and not attisdropped
      )
      and regexp_replace(lower(pg_catalog.pg_get_expr(i.indpred, i.indrelid)),
        '[[:space:]()]', '', 'g') = 'stripe_customer_idisnotnull'
  )
  union all
  select 'subscriptions_status_check_seven_values', exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid = to_regclass('public.subscriptions')
      and c.conname = 'subscriptions_status_check' and c.contype = 'c'
      and c.convalidated
      and replace(regexp_replace(pg_catalog.pg_get_constraintdef(c.oid),
        '[[:space:]()]', '', 'g'), '::text', '') =
        'CHECKstatus=ANYARRAY[''pending'',''active'',''expired'',''cancelled'',''past_due'',''unpaid'',''incomplete'']'
  )
)
select name, case when passed then 'PASS' else 'FAIL' end as result from checks
union all
select 'ALL_CHECKS', case when bool_and(passed) then 'PASS' else 'FAIL' end from checks;

rollback;
