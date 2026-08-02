select jsonb_pretty(
  jsonb_build_object(
    'mo1500peco_count',
    (
      select count(*)
      from public.listings
      where source = 'ecosoft_price_list'
        and attributes ->> 'sku' = 'MO1500PECO'
    ),
    'admin_moderation_visible',
    (
      select count(*) = 1
      from public.listings
      where source = 'ecosoft_price_list'
        and attributes ->> 'sku' = 'MO1500PECO'
        and status = 'pending'
    ),
    'public_visible_before_approval',
    (
      select count(*) > 0
      from public.listings
      where source = 'ecosoft_price_list'
        and attributes ->> 'sku' = 'MO1500PECO'
        and status = 'active'
    ),
    'listing',
    (
      select to_jsonb(row)
      from (
        select
          id,
          title,
          price,
          category,
          status,
          image_url,
          store_id,
          left(description, 240) as description_start,
          attributes ->> 'sku' as sku
        from public.listings
        where source = 'ecosoft_price_list'
          and attributes ->> 'sku' = 'MO1500PECO'
        limit 1
      ) row
    )
  )
) as result;
