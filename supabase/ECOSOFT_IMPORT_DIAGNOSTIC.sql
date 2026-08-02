select jsonb_pretty(
  jsonb_build_object(
    'admins',
    (
      select jsonb_agg(to_jsonb(admin_rows))
      from (
        select p.id, p.email, p.phone, p.display_name, p.role
        from public.profiles p
        where p.role = 'admin'
        order by p.updated_at desc nulls last
        limit 5
      ) admin_rows
    ),
    'categories',
    (
      select jsonb_agg(to_jsonb(category_rows))
      from (
        select id, name, slug
        from public.categories
        where slug in ('ev-ve-bag', 'meiset-texnikasi')
           or name ilike '%bağ%'
           or name ilike '%Ev%'
        order by sort_order
      ) category_rows
    ),
    'ev_ve_bag_subcategories',
    (
      select jsonb_agg(to_jsonb(subcategory_rows))
      from (
        select s.id, s.name, s.slug, c.name as category_name, c.slug as category_slug
        from public.subcategories s
        join public.categories c on c.id = s.category_id
        where c.slug = 'ev-ve-bag'
        order by s.sort_order
      ) subcategory_rows
    ),
    'store',
    (
      select to_jsonb(store_rows)
      from (
        select id, name, slug, owner_id, status, city
        from public.stores
        where id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
      ) store_rows
    ),
    'listing_triggers',
    (
      select jsonb_agg(tgname order by tgname)
      from pg_trigger
      where tgrelid = 'public.listings'::regclass
        and not tgisinternal
    )
  )
) as diagnostic;
