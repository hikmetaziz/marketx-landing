-- SUPERSEDED / DO NOT RUN.
-- MarktX now keeps deleted listings as database history and does not hard-delete them.
-- See supabase/LISTING_DELETED_HISTORY_NO_PURGE.sql.
--
-- Previous draft: 30-day retention for deleted listings.
-- Safe to apply: adds metadata, logs, restore RPC, and retention triggers.
-- This migration does not purge existing data and does not schedule cleanup.

begin;

alter table public.listings
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_after timestamptz;

comment on column public.listings.deleted_at is
  'Timestamp when a listing entered status=deleted. Set automatically for new soft deletes.';

comment on column public.listings.purge_after is
  'Earliest timestamp when the deleted listing may be permanently purged. Usually deleted_at + 30 days.';

create index if not exists listings_deleted_purge_after_idx
  on public.listings (purge_after)
  where status = 'deleted' and purge_after is not null;

create table if not exists public.listing_cleanup_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  listings_found integer not null default 0,
  listings_deleted integer not null default 0,
  images_deleted integer not null default 0,
  failures integer not null default 0,
  error_details jsonb not null default '[]'::jsonb,
  status text not null default 'running'
    check (status in ('running', 'dry_run', 'completed', 'partial_failed', 'failed'))
);

alter table public.listing_cleanup_runs enable row level security;

drop policy if exists "listing_cleanup_runs_admin_read" on public.listing_cleanup_runs;
create policy "listing_cleanup_runs_admin_read"
  on public.listing_cleanup_runs for select to authenticated
  using (public.is_admin());

-- Replace the owner status guard while preserving existing expiry protection.
-- Owners may now restore deleted listings only to pending, before purge_after.
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
      if old.purge_after is null then
        raise exception 'Bu elan üçün bərpa müddəti tapılmadı.';
      end if;
      if old.purge_after <= now() then
        raise exception 'Bu elanın bərpa müddəti bitib.';
      end if;
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

create or replace function public.listings_apply_delete_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'deleted' then
      new.deleted_at := now();
      new.purge_after := new.deleted_at + interval '30 days';
    else
      new.deleted_at := null;
      new.purge_after := null;
    end if;

    return new;
  end if;

  if old.status is distinct from 'deleted' and new.status = 'deleted' then
    new.deleted_at := now();
    new.purge_after := new.deleted_at + interval '30 days';
    return new;
  end if;

  if old.status = 'deleted' and new.status = 'deleted' then
    -- Do not let clients shorten or extend retention after deletion.
    new.deleted_at := old.deleted_at;
    new.purge_after := old.purge_after;
    return new;
  end if;

  if old.status = 'deleted' and new.status is distinct from 'deleted' then
    if old.purge_after is null then
      raise exception 'Bu elan üçün bərpa müddəti tapılmadı.';
    end if;
    if old.purge_after <= now() then
      raise exception 'Bu elanın bərpa müddəti bitib.';
    end if;

    -- Restored listings return to moderation. They are not auto-published.
    new.status := 'pending';
    new.deleted_at := null;
    new.purge_after := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejected_reason := null;
    return new;
  end if;

  -- Active/non-deleted listings must not carry stale purge metadata.
  new.deleted_at := null;
  new.purge_after := null;
  return new;
end;
$$;

drop trigger if exists zz_listings_apply_delete_retention on public.listings;
create trigger zz_listings_apply_delete_retention
  before insert or update of status, deleted_at, purge_after on public.listings
  for each row
  execute function public.listings_apply_delete_retention();

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

  if v_listing.purge_after is null then
    raise exception 'Bu elan üçün bərpa müddəti tapılmadı.';
  end if;

  if v_listing.purge_after <= now() then
    raise exception 'Bu elanın bərpa müddəti bitib.';
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

-- Safer parser than older regexp-only helper: external URLs return null.
create or replace function public.listing_image_storage_path(p_url text)
returns text
language sql
immutable
returns null on null input
as $$
  select nullif(
    substring(
      p_url from '/storage/v1/object/(?:public|sign)/listing-images/([^?#]+)'
    ),
    ''
  );
$$;

create or replace function public.listing_storage_paths_for_listing(p_listing_id uuid)
returns table (storage_path text)
language sql
stable
security definer
set search_path = public
as $$
  with listing_urls as (
    select public.listing_image_storage_path(l.image_url) as storage_path
    from public.listings l
    where l.id = p_listing_id

    union all

    select public.listing_image_storage_path(url) as storage_path
    from public.listings l
    cross join lateral unnest(coalesce(l.image_urls, '{}'::text[])) as url
    where l.id = p_listing_id

    union all

    select nullif(li.storage_path, '') as storage_path
    from public.listing_images li
    where li.listing_id = p_listing_id

    union all

    select public.listing_image_storage_path(li.public_url) as storage_path
    from public.listing_images li
    where li.listing_id = p_listing_id
  )
  select distinct listing_urls.storage_path
  from listing_urls
  where listing_urls.storage_path is not null
    and listing_urls.storage_path <> '';
$$;

create or replace function public.listing_storage_path_reference_count(
  p_storage_path text,
  p_excluding_listing_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with refs as (
    select l.id as listing_id
    from public.listings l
    where (p_excluding_listing_id is null or l.id <> p_excluding_listing_id)
      and public.listing_image_storage_path(l.image_url) = p_storage_path

    union

    select l.id as listing_id
    from public.listings l
    cross join lateral unnest(coalesce(l.image_urls, '{}'::text[])) as url
    where (p_excluding_listing_id is null or l.id <> p_excluding_listing_id)
      and public.listing_image_storage_path(url) = p_storage_path

    union

    select li.listing_id
    from public.listing_images li
    where (p_excluding_listing_id is null or li.listing_id <> p_excluding_listing_id)
      and nullif(li.storage_path, '') = p_storage_path

    union

    select li.listing_id
    from public.listing_images li
    where (p_excluding_listing_id is null or li.listing_id <> p_excluding_listing_id)
      and public.listing_image_storage_path(li.public_url) = p_storage_path
  )
  select count(distinct refs.listing_id)::integer from refs;
$$;

revoke all on function public.listing_storage_paths_for_listing(uuid) from public, anon, authenticated;
revoke all on function public.listing_storage_path_reference_count(text, uuid) from public, anon, authenticated;
grant execute on function public.listing_storage_paths_for_listing(uuid) to service_role;
grant execute on function public.listing_storage_path_reference_count(text, uuid) to service_role;

commit;

-- Report existing deleted listings that predate this retention metadata.
-- Do not auto-fill dates without a human decision.
select
  id,
  title,
  created_at,
  updated_at,
  deleted_at,
  purge_after
from public.listings
where status = 'deleted'
  and (deleted_at is null or purge_after is null)
order by updated_at nulls last, created_at nulls last;
