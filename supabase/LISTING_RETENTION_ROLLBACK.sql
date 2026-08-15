-- MarktX: rollback for 30-day listing retention.
-- Review before running. Dropping columns/tables removes retention metadata/log history.

begin;

-- Cron rollback. Safe if the job does not exist.
do $$
begin
  perform cron.unschedule('marktx-listing-retention-cleanup');
exception
  when undefined_function then
    null;
  when others then
    null;
end;
$$;

drop trigger if exists zz_listings_apply_delete_retention on public.listings;
drop function if exists public.listings_apply_delete_retention();
drop function if exists public.restore_my_listing(uuid);
drop function if exists public.listing_storage_paths_for_listing(uuid);
drop function if exists public.listing_storage_path_reference_count(text, uuid);

-- Restore pre-retention owner status guard from LISTING_EXPIRY.sql.
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
  new.expires_at := old.expires_at;

  return new;
end;
$$;

drop index if exists public.listings_deleted_purge_after_idx;

-- Uncomment only if you intentionally want to remove metadata/log history.
-- alter table public.listings drop column if exists deleted_at;
-- alter table public.listings drop column if exists purge_after;
-- drop table if exists public.listing_cleanup_runs;

commit;
