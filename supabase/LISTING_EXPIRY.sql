-- MarktX: 30-day listing lifecycle (shared web + mobile Supabase)
-- Run once in Supabase SQL Editor AFTER ENABLE_LISTINGS_AND_RLS.sql / PHASE2
--
-- Golden practice:
--   • expires_at column + index (cheap reads, batch cron)
--   • Daily job archives expired actives (soft hide, not DELETE)
--   • Owner renew via RPC (extends 30 days; reactivates auto-archived listings)
--   • No per-request expiry scans on public pages

-- ── 1) Column + backfill ──────────────────────────────────────────────────────

alter table public.listings add column if not exists expires_at timestamptz;

comment on column public.listings.expires_at is
  'Public visibility window for active listings. Set on approve/renew; cleared when not active.';

update public.listings
set expires_at = created_at + interval '30 days'
where expires_at is null
  and status = 'active';

create index if not exists listings_active_expires_idx
  on public.listings (expires_at)
  where status = 'active';

-- ── 2) Set expiry when listing becomes active ─────────────────────────────────

create or replace function public.listings_set_expiry_on_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    new.expires_at := now() + interval '30 days';
  elsif new.status is distinct from 'active' and old.status is distinct from new.status then
    new.expires_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_set_expiry_on_active on public.listings;
create trigger listings_set_expiry_on_active
  before insert or update of status on public.listings
  for each row
  execute function public.listings_set_expiry_on_active();

-- ── 3) Owners cannot tamper with expires_at (renew via RPC only) ──────────────

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

-- ── 4) Daily batch: archive expired actives (soft expiry) ─────────────────────

create or replace function public.expire_stale_listings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.listings
  set
    status = 'archived',
    updated_at = now()
  where status = 'active'
    and expires_at is not null
    and expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_listings() from public;
grant execute on function public.expire_stale_listings() to service_role;

-- ── 5) Owner renew (+30 days) ─────────────────────────────────────────────────
-- Active: allowed within last 7 days before expiry.
-- Archived: allowed only when auto-expired (expires_at in the past).

create or replace function public.renew_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Elan tapılmadı';
  end if;

  if v_listing.user_id is distinct from auth.uid() then
    raise exception 'Bu elan sizə aid deyil';
  end if;

  if v_listing.status = 'active' then
    if v_listing.expires_at is null then
      raise exception 'Elan müddəti təyin olunmayıb';
    end if;

    if v_listing.expires_at > now() + interval '7 days' then
      raise exception 'Yeniləmə bitməyə 7 gün qalmış mümkündür';
    end if;

    update public.listings
    set
      expires_at = now() + interval '30 days',
      updated_at = now()
    where id = p_listing_id;

    return;
  end if;

  if v_listing.status = 'archived'
    and v_listing.expires_at is not null
    and v_listing.expires_at < now() then
    update public.listings
    set
      status = 'active',
      expires_at = now() + interval '30 days',
      updated_at = now()
    where id = p_listing_id;

    return;
  end if;

  raise exception 'Bu elanı yeniləmək mümkün deyil';
end;
$$;

revoke all on function public.renew_listing(uuid) from public;
grant execute on function public.renew_listing(uuid) to authenticated;

-- ── 6) Optional daily cron (Supabase Dashboard → Database → Extensions → pg_cron)
--
-- select cron.schedule(
--   'marktx-expire-listings-daily',
--   '15 3 * * *',
--   $$ select public.expire_stale_listings(); $$
-- );
--
-- Without pg_cron: call expire_stale_listings() manually or via external cron / Edge Function.
