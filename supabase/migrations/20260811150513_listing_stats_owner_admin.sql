-- Owner/admin listing stats without RLS undercount on favorites

create or replace function public.get_listing_stats(p_listing_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_owner uuid;
  fav_count integer;
  contact_count integer;
begin
  select user_id into listing_owner
  from public.listings
  where id = p_listing_id;

  if listing_owner is null then
    return json_build_object('favorites', 0, 'contacts', 0);
  end if;

  if auth.uid() is distinct from listing_owner and not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select count(*)::integer into fav_count
  from public.favorites
  where listing_id = p_listing_id;

  select count(*)::integer into contact_count
  from public.conversations
  where listing_id = p_listing_id;

  return json_build_object('favorites', fav_count, 'contacts', contact_count);
end;
$$;

revoke all on function public.get_listing_stats(uuid) from public;
grant execute on function public.get_listing_stats(uuid) to authenticated;
