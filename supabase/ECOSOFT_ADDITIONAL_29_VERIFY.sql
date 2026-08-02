with counts as (
  select
    count(*) filter (where attributes ->> 'sku' <> 'MO1500PECO') as additional_29_count,
    count(*) filter (where attributes ->> 'sku' <> 'MO1500PECO' and status = 'pending') as additional_29_pending,
    count(*) filter (
      where attributes ->> 'sku' <> 'MO1500PECO'
        and coalesce(image_url, '') like 'https://vrtnxdexofpiapbodxkx.supabase.co/storage/v1/object/public/listing-images/%'
    ) as additional_29_storage_images,
    count(*) filter (where attributes ->> 'sku' <> 'MO1500PECO' and status = 'active') as additional_29_public_active
  from public.listings
  where source = 'ecosoft_price_list'
),
status_counts as (
  select jsonb_object_agg(status, total order by status) as totals
  from (
    select status, count(*) as total
    from public.listings
    where source = 'ecosoft_price_list'
    group by status
  ) s
),
samples as (
  select jsonb_agg(to_jsonb(sample_rows) order by sku) as rows
  from (
    select
      id,
      attributes ->> 'sku' as sku,
      title,
      status,
      city,
      category,
      image_url
    from public.listings
    where source = 'ecosoft_price_list'
      and attributes ->> 'sku' <> 'MO1500PECO'
    order by attributes ->> 'sku'
    limit 10
  ) sample_rows
)
select jsonb_pretty(
  jsonb_build_object(
    'counts', to_jsonb(counts),
    'status_counts', status_counts.totals,
    'sample_rows', samples.rows
  )
) as result
from counts, status_counts, samples;
