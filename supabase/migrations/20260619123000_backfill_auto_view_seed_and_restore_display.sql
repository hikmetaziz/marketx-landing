-- Backfill missing auto listing view seeds and keep public favorites real-only.

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('app.launch_cleanup', 'on', true);

update public.listings l
set view_seed =
  case
    when coalesce(l.price, 0) <= 0 then 755
    when l.price < 20000 then 1850
    when l.price <= 22000 then 2500
    when l.price <= 25000 then 2350
    when l.price <= 30000 then 2100
    when l.price <= 40000 then 1200
    when l.price <= 60000 then 1000
    when l.price <= 80000 then 850
    when l.price <= 120000 then 755
    else 500
  end
from public.categories c
where c.id = l.category_id
  and coalesce(l.view_seed, 0) = 0
  and (
    lower(coalesce(c.slug, '')) in ('avto', 'neqliyyat')
    or lower(coalesce(l.category, '')) in ('avto', 'avtomobil', 'neqliyyat', 'nəqliyyat')
    or coalesce(l.attributes, '{}'::jsonb) ? 'turbo_properties'
  );

update public.listings l
set view_seed =
  case
    when coalesce(l.price, 0) <= 0 then 755
    when l.price < 20000 then 1850
    when l.price <= 22000 then 2500
    when l.price <= 25000 then 2350
    when l.price <= 30000 then 2100
    when l.price <= 40000 then 1200
    when l.price <= 60000 then 1000
    when l.price <= 80000 then 850
    when l.price <= 120000 then 755
    else 500
  end
where l.category_id is null
  and coalesce(l.view_seed, 0) = 0
  and (
    lower(coalesce(l.category, '')) in ('avto', 'avtomobil', 'neqliyyat', 'nəqliyyat')
    or coalesce(l.attributes, '{}'::jsonb) ? 'turbo_properties'
  );

create or replace function public.get_listing_stats(p_listing_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_owner uuid;
  listing_status text;
  listing_category text;
  listing_category_slug text;
  listing_attributes jsonb;
  listing_view_seed integer;
  real_fav_count integer;
  real_view_count integer;
  display_view_count integer;
  is_privileged boolean;
  is_auto_listing boolean;
begin
  select
    l.user_id,
    l.status::text,
    l.category,
    c.slug,
    coalesce(l.attributes, '{}'::jsonb),
    coalesce(l.view_seed, 0)
  into
    listing_owner,
    listing_status,
    listing_category,
    listing_category_slug,
    listing_attributes,
    listing_view_seed
  from public.listings l
  left join public.categories c on c.id = l.category_id
  where l.id = p_listing_id;

  if listing_owner is null then
    return json_build_object('views', 0, 'favorites', 0, 'contacts', 0);
  end if;

  is_privileged := auth.uid() is not null and (auth.uid() = listing_owner or public.is_admin());

  if not is_privileged and listing_status <> 'active' then
    raise exception 'Not authorized';
  end if;

  select count(*)::integer
  into real_view_count
  from public.listing_views
  where listing_id = p_listing_id
    and is_owner_view = false;

  select count(*)::integer
  into real_fav_count
  from public.favorites
  where listing_id = p_listing_id;

  is_auto_listing :=
    lower(coalesce(listing_category_slug, '')) in ('avto', 'neqliyyat')
    or lower(coalesce(listing_category, '')) in ('avto', 'avtomobil', 'neqliyyat', 'nəqliyyat')
    or listing_attributes ? 'turbo_properties';

  display_view_count :=
    case
      when is_auto_listing then listing_view_seed + real_view_count
      else real_view_count
    end;

  return json_build_object(
    'views', display_view_count,
    'favorites', real_fav_count,
    'contacts', 0
  );
end;
$$;

revoke all on function public.get_listing_stats(uuid) from public;
grant execute on function public.get_listing_stats(uuid) to anon, authenticated;
