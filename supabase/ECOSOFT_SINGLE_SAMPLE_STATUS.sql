select jsonb_pretty(
  jsonb_build_object(
    'ecosoft_import_total',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
    ),
    'mo1500peco',
    (
      select jsonb_agg(to_jsonb(rows))
      from (
        select id, title, price, category, status, image_url, store_id, attributes ->> 'sku' as sku
        from public.listings
        where source = 'ecosoft_price_list'
          and attributes ->> 'sku' = 'MO1500PECO'
      ) rows
    )
  )
) as result;
