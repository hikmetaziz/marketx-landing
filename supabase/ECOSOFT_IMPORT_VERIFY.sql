select jsonb_pretty(
  jsonb_build_object(
    'count_pending',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
        and status = 'pending'
    ),
    'by_category',
    (
      select jsonb_agg(to_jsonb(category_rows))
      from (
        select category, category_id, subcategory_id, count(*) as count
        from public.listings
        where source = 'ecosoft_price_list'
          and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
        group by category, category_id, subcategory_id
      ) category_rows
    ),
    'missing_images',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
        and (image_url is null or image_url = '')
    ),
    'sample',
    (
      select jsonb_agg(to_jsonb(sample_rows))
      from (
        select id, title, price, status, category, city, image_url, attributes ->> 'sku' as sku
        from public.listings
        where source = 'ecosoft_price_list'
          and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
        order by created_at desc
        limit 5
      ) sample_rows
    )
  )
) as result;
