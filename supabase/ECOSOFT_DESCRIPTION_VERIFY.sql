select jsonb_pretty(
  jsonb_build_object(
    'count_with_new_description',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and description like '%SKU:%'
        and description not like 'Ecosoft price list importu.%'
    ),
    'sample',
    (
      select jsonb_agg(to_jsonb(sample_rows))
      from (
        select attributes ->> 'sku' as sku, left(description, 220) as description_start
        from public.listings
        where source = 'ecosoft_price_list'
        order by created_at desc
        limit 3
      ) sample_rows
    )
  )
) as result;
