-- MarktX: keep deleted listings as database history.
-- Supersedes LISTING_RETENTION_30_DAYS.sql behavior.
-- No hard-delete cleanup is scheduled or required.

begin;

alter table public.listings
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_after timestamptz;

comment on column public.listings.deleted_at is
  'Timestamp when a listing entered status=deleted. Deleted listings remain as DB history.';

comment on column public.listings.purge_after is
  'Deprecated for MarktX history model. Keep null; do not use for automatic deletion.';

drop index if exists public.listings_deleted_purge_after_idx;

create index if not exists listings_deleted_deleted_at_idx
  on public.listings (deleted_at desc)
  where status = 'deleted' and deleted_at is not null;

-- Preserve owner safety, allow deleted -> pending restoration without a purge deadline.
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
    elsif old.status = 'deleted' and new.status = 'pending' then
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

create or replace function public.listings_apply_delete_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'deleted' then
      new.deleted_at := coalesce(new.deleted_at, now());
      new.purge_after := null;
    else
      new.deleted_at := null;
      new.purge_after := null;
    end if;

    return new;
  end if;

  if old.status is distinct from 'deleted' and new.status = 'deleted' then
    new.deleted_at := now();
    new.purge_after := null;
    return new;
  end if;

  if old.status = 'deleted' and new.status = 'deleted' then
    new.deleted_at := old.deleted_at;
    new.purge_after := null;
    return new;
  end if;

  if old.status = 'deleted' and new.status is distinct from 'deleted' then
    -- Restored listings return to moderation. They are not auto-published.
    new.status := 'pending';
    new.deleted_at := null;
    new.purge_after := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejected_reason := null;
    return new;
  end if;

  new.deleted_at := null;
  new.purge_after := null;
  return new;
end;
$$;

drop trigger if exists zz_listings_apply_delete_retention on public.listings;
drop trigger if exists zz_listings_apply_delete_history on public.listings;
create trigger zz_listings_apply_delete_history
  before insert or update of status, deleted_at, purge_after on public.listings
  for each row
  execute function public.listings_apply_delete_history();

drop function if exists public.listings_apply_delete_retention();

create or replace function public.restore_my_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings;
begin
  if v_uid is null then
    raise exception 'Daxil olmamısınız.';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if v_listing.id is null then
    raise exception 'Elan tapılmadı.';
  end if;

  if v_listing.user_id is distinct from v_uid then
    raise exception 'Bu elan sizə aid deyil.';
  end if;

  if v_listing.status <> 'deleted' then
    raise exception 'Yalnız silinmiş elan bərpa edilə bilər.';
  end if;

  update public.listings
  set
    status = 'pending',
    deleted_at = null,
    purge_after = null,
    reviewed_at = null,
    reviewed_by = null,
    rejected_reason = null
  where id = p_listing_id and user_id = v_uid;
end;
$$;

revoke all on function public.restore_my_listing(uuid) from public, anon;
grant execute on function public.restore_my_listing(uuid) to authenticated;

commit;

-- Report deleted listings kept as history.
select
  id,
  title,
  deleted_at,
  purge_after,
  updated_at
from public.listings
where status = 'deleted'
order by deleted_at desc nulls last, updated_at desc nulls last;
