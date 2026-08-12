-- Safe listing view tracking and aggregate stats

create table public.listing_views (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  viewer_key text not null,
  view_day date not null default ((timezone('utc', now()))::date),
  is_owner_view boolean not null default false,
  viewed_at timestamptz not null default now()
);

create unique index listing_views_daily_dedup_idx
  on public.listing_views (listing_id, viewer_key, view_day)
  where is_owner_view = false;

create index listing_views_listing_id_idx
  on public.listing_views (listing_id)
  where is_owner_view = false;

alter table public.listing_views enable row level security;

revoke all on table public.listing_views from public;
revoke all on table public.listing_views from anon, authenticated;

create or replace function public.record_listing_view(
  p_listing_id uuid,
  p_anon_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
  v_viewer_key text;
begin
  select id, user_id, status
  into v_listing
  from public.listings
  where id = p_listing_id;

  if v_listing.id is null then
    return false;
  end if;

  if auth.uid() is not null and auth.uid() = v_listing.user_id then
    return false;
  end if;

  if public.is_admin() then
    return false;
  end if;

  if v_listing.status <> 'active' then
    return false;
  end if;

  if auth.uid() is not null then
    v_viewer_key := 'u:' || auth.uid()::text;
  elsif p_anon_key is not null and length(trim(p_anon_key)) >= 16 then
    v_viewer_key := 'a:' || trim(p_anon_key);
  else
    return false;
  end if;

  insert into public.listing_views (listing_id, viewer_key, view_day, is_owner_view)
  values (
    p_listing_id,
    v_viewer_key,
    (timezone('utc', now()))::date,
    false
  )
  on conflict do nothing;

  return true;
exception
  when unique_violation then
    return false;
end;
$$;

revoke all on function public.record_listing_view(uuid, text) from public;
grant execute on function public.record_listing_view(uuid, text) to anon, authenticated;

create or replace function public.get_listing_stats(p_listing_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_owner uuid;
  listing_status text;
  fav_count integer;
  contact_count integer;
  view_count integer;
  is_privileged boolean;
begin
  select user_id, status::text
  into listing_owner, listing_status
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
  into view_count
  from public.listing_views
  where listing_id = p_listing_id
    and is_owner_view = false;

  select count(*)::integer
  into fav_count
  from public.favorites
  where listing_id = p_listing_id;

  if is_privileged then
    select count(*)::integer
    into contact_count
    from public.conversations
    where listing_id = p_listing_id;

    return json_build_object(
      'views', view_count,
      'favorites', fav_count,
      'contacts', contact_count
    );
  end if;

  return json_build_object(
    'views', view_count,
    'favorites', fav_count,
    'contacts', 0
  );
end;
$$;

revoke all on function public.get_listing_stats(uuid) from public;
grant execute on function public.get_listing_stats(uuid) to anon, authenticated;
