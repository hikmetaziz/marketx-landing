-- MarktX: prevent users from favoriting their own listings.
--
-- Current schema:
--   public.favorites(user_id, listing_id, created_at)
--   public.listings(id, user_id, ...)
--
-- Run after ENABLE_PROFILES_AND_SOCIAL_RLS.sql and ENABLE_LISTINGS_AND_RLS.sql.

delete from public.favorites as f
using public.listings as l
where l.id = f.listing_id
  and l.user_id = f.user_id;

create or replace function public.prevent_owner_self_favorite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.listings as l
    where l.id = new.listing_id
      and l.user_id = new.user_id
  ) then
    raise exception 'owner_cannot_favorite_own_listing'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_owner_self_favorite on public.favorites;
create trigger prevent_owner_self_favorite
  before insert or update on public.favorites
  for each row
  execute function public.prevent_owner_self_favorite();

