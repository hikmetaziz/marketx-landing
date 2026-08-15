-- Adjust displayed social proof to smaller temporary ranges.

alter table public.listings
  add column if not exists favorite_seed integer not null default 0
  check (favorite_seed >= 0);

create index if not exists listings_favorite_seed_idx
  on public.listings (favorite_seed)
  where favorite_seed > 0;

create or replace function public.listings_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.role(), current_setting('request.jwt.claim.role', true));
  v_review_sensitive_changed boolean;
begin
  if v_role = 'service_role' then
    if old.user_id is null then
      raise exception 'listing owner is required for service role listing update';
    end if;

    new.user_id := old.user_id;
    new.status := old.status;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.rejected_reason := old.rejected_reason;
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is distinct from old.user_id then
    raise exception 'Not authorized';
  end if;

  new.user_id := old.user_id;
  new.view_seed := old.view_seed;
  new.favorite_seed := old.favorite_seed;

  if new.status is distinct from old.status then
    if old.status = 'active' and new.status = 'sold' then
      new.reviewed_at := old.reviewed_at;
      new.reviewed_by := old.reviewed_by;
      new.rejected_reason := old.rejected_reason;
      return new;
    end if;

    raise exception 'Status change not permitted';
  end if;

  v_review_sensitive_changed :=
    old.status = 'active'
    and (
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.price is distinct from old.price
      or new.category is distinct from old.category
      or new.category_id is distinct from old.category_id
      or new.subcategory_id is distinct from old.subcategory_id
      or new.attributes is distinct from old.attributes
      or new.listing_type is distinct from old.listing_type
      or new.price_type is distinct from old.price_type
      or new.delivery_type is distinct from old.delivery_type
      or new.condition_code is distinct from old.condition_code
      or new.contact_phone is distinct from old.contact_phone
      or new.image_url is distinct from old.image_url
      or new.image_urls is distinct from old.image_urls
    );

  if v_review_sensitive_changed then
    new.status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejected_reason := null;
  else
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.rejected_reason := old.rejected_reason;
  end if;

  return new;
end;
$$;

alter table public.listings disable trigger listings_before_update;

with auto_listings as (
  select
    l.id,
    row_number() over (
      order by
        coalesce(l.price, 999999999) asc,
        l.created_at desc,
        l.id asc
    ) as deal_rank,
    count(*) over () as total_count
  from public.listings l
  left join public.categories c on c.id = l.category_id
  where l.source = 'turbo_nbk_motors'
    or lower(coalesce(l.category, '')) in ('avto', 'avtomobil', 'neqliyyat', 'nəqliyyat')
    or c.slug in ('avto', 'neqliyyat')
)
update public.listings l
set
  view_seed =
    case
      when a.total_count <= 1 then 2500
      else 1200 + round(
        ((a.total_count - a.deal_rank)::numeric / greatest(a.total_count - 1, 1)) * 1300
      )::integer
    end,
  favorite_seed =
    case
      when a.deal_rank <= greatest(1, ceil(a.total_count::numeric / 3)) then 20
      when a.deal_rank <= greatest(1, ceil((a.total_count::numeric * 2) / 3)) then 15
      else 10
    end
from auto_listings a
where a.id = l.id;

update public.listings
set
  view_seed = 0,
  favorite_seed = 0
where source = 'turbo_nbk_motors'
  and (
    source_url like 'import-test://%'
    or title = 'NBK Motors import test'
  );

alter table public.listings enable trigger listings_before_update;

create or replace function public.get_listing_stats(p_listing_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_owner uuid;
  listing_status text;
  listing_view_seed integer;
  listing_favorite_seed integer;
  real_fav_count integer;
  real_view_count integer;
  display_view_count integer;
  display_fav_count integer;
  is_privileged boolean;
begin
  select user_id, status::text, coalesce(view_seed, 0), coalesce(favorite_seed, 0)
  into listing_owner, listing_status, listing_view_seed, listing_favorite_seed
  from public.listings
  where id = p_listing_id;

  if listing_owner is null then
    return json_build_object('views', 0, 'favorites', 0, 'contacts', 0);
  end if;

  is_privileged := auth.uid() = listing_owner or public.is_admin();

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

  display_view_count := listing_view_seed + real_view_count;
  display_fav_count := listing_favorite_seed + real_fav_count;

  return json_build_object(
    'views', display_view_count,
    'favorites', display_fav_count,
    'contacts', 0
  );
end;
$$;

revoke all on function public.get_listing_stats(uuid) from public;
grant execute on function public.get_listing_stats(uuid) to anon, authenticated;
