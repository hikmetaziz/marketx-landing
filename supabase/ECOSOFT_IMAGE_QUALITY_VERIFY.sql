select jsonb_pretty(
  jsonb_build_object(
    'ecosoft_status_counts',
    (
      select jsonb_object_agg(status, total order by status)
      from (
        select status, count(*) as total
        from public.listings
        where source = 'ecosoft_price_list'
        group by status
      ) s
    ),
    'ai_generated_images',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and attributes ->> 'image_source' = 'ai_generated'
    ),
    'remaining_svg_images',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and coalesce(image_url, '') ilike '%.svg'
    ),
    'public_active',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and status = 'active'
    )
  )
) as result;
