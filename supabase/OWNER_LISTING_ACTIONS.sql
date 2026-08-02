-- MarktX: owner listing actions
-- Run after ENABLE_LISTINGS_AND_RLS.sql and PHASE2_LISTINGS_DELTA.sql.
-- Allows owners to archive or soft-delete their own listings while keeping
-- other status mutations restricted to moderators/admins.

alter type public.listing_status add value if not exists 'deleted';

create or replace function public.listings_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is distinct from old.user_id then
    raise exception 'Not authorized';
  end if;

  new.user_id := old.user_id;

  if new.status is distinct from old.status then
    if old.status = 'active' and new.status = 'sold' then
      null;
    elsif old.status in ('active', 'sold') and new.status = 'archived' then
      null;
    elsif old.status in ('pending', 'active', 'sold', 'rejected', 'archived') and new.status = 'deleted' then
      null;
    else
      raise exception 'Status change not permitted';
    end if;
  end if;

  new.reviewed_at := old.reviewed_at;
  new.reviewed_by := old.reviewed_by;
  new.rejected_reason := old.rejected_reason;

  return new;
end;
$$;
