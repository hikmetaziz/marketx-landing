select jsonb_pretty(
  jsonb_build_object(
    'total_ecosoft_import',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
    ),
    'additional_29_count',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
        and attributes ->> 'sku' <> 'MO1500PECO'
    ),
    'by_status',
    (
      select jsonb_agg(to_jsonb(rows))
      from (
        select status, count(*) as count
        from public.listings
        where source = 'ecosoft_price_list'
          and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
        group by status
        order by status
      ) rows
    ),
    'rows',
    (
      select jsonb_agg(to_jsonb(rows))
      from (
        select id, attributes ->> 'sku' as sku, title, price, status, image_url
        from public.listings
        where source = 'ecosoft_price_list'
          and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
          and attributes ->> 'sku' <> 'MO1500PECO'
        order by created_at
      ) rows
    )
  )
) as result;
