-- MarktX Sprint 1: production security hardening
-- Run once in Supabase SQL Editor AFTER ENABLE_LISTINGS_AND_RLS.sql, PHASE2, VIEW_COUNT.sql
-- Safe to re-run: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS
--
-- 1) listing_contacts — phone PII isolated from public listings reads
-- 2) reveal_listing_phone + listing_has_contact_phone RPCs
-- 3) rate_limit_events + throttled increment_listing_view / reveal_listing_phone
-- 4) profiles RLS tightened (own row + admin only)
-- 5) listings.contact_phone cleared (legacy column kept for mobile schema compat)

-- ── 1) Rate limit store ───────────────────────────────────────────────────────

create table if not exists public.rate_limit_events (
  id bigserial primary key,
  action text not null,
  client_key text not null,
  resource_key text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (action, client_key, resource_key, created_at desc);

alter table public.rate_limit_events enable row level security;

revoke all on public.rate_limit_events from anon, authenticated;

comment on table public.rate_limit_events is
  'Internal rate-limit counters; not exposed to clients. Managed by security definer RPCs.';

-- ── 2) listing_contacts ───────────────────────────────────────────────────────

create table if not exists public.listing_contacts (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  contact_phone text not null check (char_length(trim(contact_phone)) > 0),
  updated_at timestamptz not null default now()
);

comment on table public.listing_contacts is
  'Seller contact phone — not readable via public listings SELECT. Reveal via reveal_listing_phone RPC.';

alter table public.listing_contacts enable row level security;

-- Migrate legacy phone data from listings, then clear public column.
-- SQL Editor has no auth.uid(); listings_before_update blocks bulk UPDATE — disable briefly.
insert into public.listing_contacts (listing_id, contact_phone)
select l.id, l.contact_phone
from public.listings as l
where l.contact_phone is not null
  and btrim(l.contact_phone) <> ''
on conflict (listing_id) do update
  set contact_phone = excluded.contact_phone,
      updated_at = now();

alter table public.listings disable trigger listings_before_update;

update public.listings
set contact_phone = null
where contact_phone is not null;

alter table public.listings enable trigger listings_before_update;

-- ── 3) Rate limit helpers ─────────────────────────────────────────────────────

create or replace function public.check_rate_limit(
  p_action text,
  p_client_key text,
  p_resource_key text,
  p_max_count integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.rate_limit_events
  where created_at < now() - interval '48 hours';

  select count(*)::integer into v_count
  from public.rate_limit_events
  where action = p_action
    and client_key = p_client_key
    and resource_key = coalesce(p_resource_key, '')
    and created_at > now() - p_window;

  return v_count < p_max_count;
end;
$$;

create or replace function public.record_rate_limit_event(
  p_action text,
  p_client_key text,
  p_resource_key text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.rate_limit_events (action, client_key, resource_key)
  values (p_action, p_client_key, coalesce(p_resource_key, ''));
end;
$$;

-- ── 4) listing_contacts RLS ───────────────────────────────────────────────────

drop policy if exists "listing_contacts_select_owner_admin" on public.listing_contacts;
create policy "listing_contacts_select_owner_admin"
  on public.listing_contacts for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.listings as l
      where l.id = listing_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists "listing_contacts_insert_owner" on public.listing_contacts;
create policy "listing_contacts_insert_owner"
  on public.listing_contacts for insert to authenticated
  with check (
    exists (
      select 1
      from public.listings as l
      where l.id = listing_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists "listing_contacts_update_owner" on public.listing_contacts;
create policy "listing_contacts_update_owner"
  on public.listing_contacts for update to authenticated
  using (
    exists (
      select 1
      from public.listings as l
      where l.id = listing_id
        and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.listings as l
      where l.id = listing_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists "listing_contacts_delete_owner" on public.listing_contacts;
create policy "listing_contacts_delete_owner"
  on public.listing_contacts for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.listings as l
      where l.id = listing_id
        and l.user_id = auth.uid()
    )
  );

-- ── 5) Strip contact_phone from listings on write (defense in depth) ──────────

create or replace function public.listings_strip_contact_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contact_phone is not null and btrim(new.contact_phone) <> '' then
    insert into public.listing_contacts (listing_id, contact_phone)
    values (new.id, new.contact_phone)
    on conflict (listing_id) do update
      set contact_phone = excluded.contact_phone,
          updated_at = now();
  end if;

  new.contact_phone := null;
  return new;
end;
$$;

drop trigger if exists listings_strip_contact_phone on public.listings;
create trigger listings_strip_contact_phone
  before insert or update of contact_phone on public.listings
  for each row
  execute function public.listings_strip_contact_phone();

-- ── 6) Public RPCs ────────────────────────────────────────────────────────────

create or replace function public.listing_has_contact_phone(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listings as l
    inner join public.listing_contacts as lc on lc.listing_id = l.id
    where l.id = p_listing_id
      and l.status in ('active', 'sold')
      and btrim(lc.contact_phone) <> ''
  );
$$;

comment on function public.listing_has_contact_phone(uuid) is
  'Returns whether a public listing has a contact phone without exposing the number.';

grant execute on function public.listing_has_contact_phone(uuid) to anon, authenticated;

create or replace function public.reveal_listing_phone(
  p_slug text,
  p_client_key text default 'unknown'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_key text := coalesce(nullif(btrim(p_client_key), ''), 'unknown');
begin
  if not public.check_rate_limit('reveal_phone', v_key, p_slug, 30, interval '1 hour') then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;

  select lc.contact_phone into v_phone
  from public.listings as l
  inner join public.listing_contacts as lc on lc.listing_id = l.id
  where l.slug = p_slug
    and l.status = 'active'
    and btrim(lc.contact_phone) <> '';

  if v_phone is null then
    return null;
  end if;

  perform public.record_rate_limit_event('reveal_phone', v_key, p_slug);
  return v_phone;
end;
$$;

comment on function public.reveal_listing_phone(text, text) is
  'Returns seller phone for active listings only. Rate-limited per client key + slug.';

grant execute on function public.reveal_listing_phone(text, text) to anon, authenticated;

-- Drop legacy single-arg signature if present
drop function if exists public.reveal_listing_phone(text);

-- ── 7) Throttled view count RPC ───────────────────────────────────────────────

create or replace function public.increment_listing_view(
  p_listing_id uuid,
  p_client_key text default 'unknown'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
  v_key text := coalesce(nullif(btrim(p_client_key), ''), 'unknown');
  v_resource text := p_listing_id::text;
begin
  select coalesce(l.view_count, 0) into new_count
  from public.listings as l
  where l.id = p_listing_id
    and l.status in ('active', 'sold');

  if new_count is null then
    return 0;
  end if;

  if not public.check_rate_limit('increment_view', v_key, v_resource, 10, interval '1 hour') then
    return new_count;
  end if;

  update public.listings as l
  set view_count = coalesce(l.view_count, 0) + 1
  where l.id = p_listing_id
    and l.status in ('active', 'sold')
  returning l.view_count into new_count;

  if found then
    perform public.record_rate_limit_event('increment_view', v_key, v_resource);
  end if;

  return coalesce(new_count, 0);
end;
$$;

comment on function public.increment_listing_view(uuid, text) is
  'Increments view_count for public listings. Rate-limited per client key + listing (10/hour).';

grant execute on function public.increment_listing_view(uuid, text) to anon, authenticated;

drop function if exists public.increment_listing_view(uuid);

-- ── 8) Profiles RLS tighten ───────────────────────────────────────────────────

drop policy if exists "profiles_select_authenticated" on public.profiles;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select to authenticated
  using (public.is_admin());
