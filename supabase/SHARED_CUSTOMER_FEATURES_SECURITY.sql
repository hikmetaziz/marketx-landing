-- MarktX: shared web + mobile customer convenience security layer
-- Run in Supabase SQL Editor after the base listings/profiles migrations.
--
-- Scope:
-- - Favorites
-- - Listing reports
-- - Saved searches
-- - Owner-safe listing updates
-- - Soft delete via listings.status = 'deleted'
-- - Public listing reads limited to active listings, plus owner/admin access
--
-- This migration is intentionally idempotent and does not hard-delete data.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter type public.listing_status add value if not exists 'deleted';

-- ---------------------------------------------------------------------------
-- Listings: active public reads, owner/admin updates, no frontend hard delete
-- ---------------------------------------------------------------------------

alter table public.listings enable row level security;

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

drop trigger if exists listings_before_update on public.listings;
create trigger listings_before_update
  before update on public.listings
  for each row
  execute function public.listings_before_update();

drop policy if exists "Admins full access listings" on public.listings;
drop policy if exists "Owners read own listings" on public.listings;
drop policy if exists "Owners update own listings" on public.listings;
drop policy if exists "Public read active or sold listings" on public.listings;
drop policy if exists "Public sees active listings" on public.listings;
drop policy if exists "Users create own listings" on public.listings;
drop policy if exists "Users see own listings" on public.listings;
drop policy if exists "listings_delete_admin" on public.listings;
drop policy if exists "listings_delete_own" on public.listings;
drop policy if exists "listings_delete_owner" on public.listings;
drop policy if exists "listings_insert_own" on public.listings;
drop policy if exists "listings_select_visible" on public.listings;
drop policy if exists "listings_update_admin" on public.listings;
drop policy if exists "listings_update_own" on public.listings;
drop policy if exists "listings_update_owner" on public.listings;

create policy "listings_select_visible"
  on public.listings for select to anon, authenticated
  using (
    status = 'active'
    or (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

create policy "listings_insert_own"
  on public.listings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "listings_update_owner"
  on public.listings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "listings_update_admin"
  on public.listings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke delete on public.listings from anon, authenticated;

comment on policy "listings_select_visible" on public.listings is
  'Public reads active listings only. Owners see their own listings. Admins see all.';

comment on table public.listings is
  'Frontend hard delete is not allowed; user delete is represented by status = deleted.';

-- ---------------------------------------------------------------------------
-- Favorites: own rows only, active listings only, no owner self-favorites
-- ---------------------------------------------------------------------------

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create unique index if not exists favorites_user_id_listing_id_key
  on public.favorites (user_id, listing_id);

create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists favorites_listing_id_idx on public.favorites (listing_id);

alter table public.favorites enable row level security;

create or replace function public.enforce_favorite_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_status text;
begin
  select user_id, status::text
  into v_owner_id, v_status
  from public.listings
  where id = new.listing_id;

  if v_owner_id is null then
    raise exception 'favorite_listing_not_found'
      using errcode = '23514';
  end if;

  if v_owner_id = new.user_id then
    raise exception 'owner_cannot_favorite_own_listing'
      using errcode = '23514';
  end if;

  if v_status <> 'active' then
    raise exception 'favorite_requires_active_listing'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_owner_self_favorite on public.favorites;
drop trigger if exists enforce_favorite_rules on public.favorites;
create trigger enforce_favorite_rules
  before insert or update on public.favorites
  for each row
  execute function public.enforce_favorite_rules();

drop policy if exists "Users select own favorites" on public.favorites;
drop policy if exists "Users insert own favorites" on public.favorites;
drop policy if exists "Users delete own favorites" on public.favorites;
drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;

create policy "favorites_select_own"
  on public.favorites for select to authenticated
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.favorites for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.listings as l
      where l.id = listing_id
        and l.status = 'active'
        and l.user_id <> auth.uid()
    )
  );

create policy "favorites_delete_own"
  on public.favorites for delete to authenticated
  using (auth.uid() = user_id);

revoke update on public.favorites from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reports: canonical table is public.reports; secure listing_reports if present
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null default 'listing',
  listing_id uuid references public.listings (id) on delete set null,
  reported_user_id uuid references auth.users (id) on delete set null,
  conversation_id uuid,
  reason text not null,
  details text,
  status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.reports add column if not exists reporter_id uuid references auth.users (id) on delete cascade;
alter table public.reports add column if not exists target_type text default 'listing';
alter table public.reports add column if not exists listing_id uuid references public.listings (id) on delete set null;
alter table public.reports add column if not exists reported_user_id uuid references auth.users (id) on delete set null;
alter table public.reports add column if not exists conversation_id uuid;
alter table public.reports add column if not exists reason text;
alter table public.reports add column if not exists details text;
alter table public.reports add column if not exists status text default 'pending';
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists reviewed_by uuid references auth.users (id) on delete set null;
alter table public.reports add column if not exists created_at timestamptz default now();

alter table public.reports alter column target_type set default 'listing';
alter table public.reports alter column status set default 'pending';

alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports
  add constraint reports_reason_check check (
    reason in (
      'fake',
      'spam',
      'fraud',
      'wrong_info',
      'incorrect_information',
      'prohibited',
      'harassment',
      'copyright',
      'wrong_category',
      'duplicate',
      'other'
    )
  );

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_status_check check (
    status in ('pending', 'reviewed', 'dismissed', 'open', 'reviewing', 'resolved')
  );

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports
  add constraint reports_target_type_check check (target_type in ('listing', 'conversation'));

alter table public.reports drop constraint if exists reports_target_context;
alter table public.reports
  add constraint reports_target_context check (
    (target_type = 'listing' and listing_id is not null)
    or (target_type = 'conversation' and conversation_id is not null and reported_user_id is not null)
  );

create unique index if not exists reports_listing_once_per_user_idx
  on public.reports (reporter_id, listing_id)
  where target_type = 'listing' and listing_id is not null;

create index if not exists reports_listing_id_idx on public.reports (listing_id);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_status_created_at_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

create or replace function public.enforce_listing_report_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_status text;
begin
  if coalesce(new.target_type, 'listing') <> 'listing' then
    return new;
  end if;

  select user_id, status::text
  into v_owner_id, v_status
  from public.listings
  where id = new.listing_id;

  if v_owner_id is null then
    raise exception 'report_listing_not_found'
      using errcode = '23514';
  end if;

  if v_owner_id = new.reporter_id then
    raise exception 'owner_cannot_report_own_listing'
      using errcode = '23514';
  end if;

  if v_status <> 'active' then
    raise exception 'report_requires_active_listing'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_listing_report_rules on public.reports;
create trigger enforce_listing_report_rules
  before insert or update on public.reports
  for each row
  execute function public.enforce_listing_report_rules();

drop policy if exists "reports_insert_listing" on public.reports;
drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_select_own" on public.reports;
drop policy if exists "reports_select_admin" on public.reports;
drop policy if exists "reports_update_admin" on public.reports;

create policy "reports_insert_listing"
  on public.reports for insert to authenticated
  with check (
    auth.uid() = reporter_id
    and target_type = 'listing'
    and listing_id is not null
    and status in ('pending', 'open')
    and exists (
      select 1
      from public.listings as l
      where l.id = listing_id
        and l.status = 'active'
        and l.user_id <> auth.uid()
    )
  );

create policy "reports_insert_conversation"
  on public.reports for insert to authenticated
  with check (
    auth.uid() = reporter_id
    and target_type = 'conversation'
    and status in ('pending', 'open')
    and exists (
      select 1
      from public.conversations as c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
        and reported_user_id in (c.buyer_id, c.seller_id)
        and reported_user_id <> auth.uid()
    )
  );

create policy "reports_select_own"
  on public.reports for select to authenticated
  using (auth.uid() = reporter_id);

create policy "reports_select_admin"
  on public.reports for select to authenticated
  using (public.is_admin());

create policy "reports_update_admin"
  on public.reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke delete on public.reports from anon, authenticated;

-- Secure legacy public.listing_reports only if it exists. Do not create it.
create or replace function public.enforce_legacy_listing_report_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_status text;
begin
  select user_id, status::text
  into v_owner_id, v_status
  from public.listings
  where id = new.listing_id;

  if v_owner_id is null then
    raise exception 'report_listing_not_found'
      using errcode = '23514';
  end if;

  if v_owner_id = new.reporter_id then
    raise exception 'owner_cannot_report_own_listing'
      using errcode = '23514';
  end if;

  if v_status <> 'active' then
    raise exception 'report_requires_active_listing'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.listing_reports') is not null then
    execute 'alter table public.listing_reports enable row level security';
    execute 'create unique index if not exists listing_reports_reporter_id_listing_id_key on public.listing_reports (reporter_id, listing_id)';

    execute 'drop trigger if exists enforce_legacy_listing_report_rules on public.listing_reports';
    execute 'create trigger enforce_legacy_listing_report_rules before insert or update on public.listing_reports for each row execute function public.enforce_legacy_listing_report_rules()';

    execute 'drop policy if exists "Users insert own reports" on public.listing_reports';
    execute 'drop policy if exists "Users read own reports" on public.listing_reports';
    execute 'drop policy if exists "Admins read all reports" on public.listing_reports';
    execute 'drop policy if exists "listing_reports_insert_own" on public.listing_reports';
    execute 'drop policy if exists "listing_reports_select_own" on public.listing_reports';
    execute 'drop policy if exists "listing_reports_select_admin" on public.listing_reports';

    execute 'create policy "listing_reports_insert_own" on public.listing_reports for insert to authenticated with check (auth.uid() = reporter_id and exists (select 1 from public.listings as l where l.id = listing_id and l.status = ''active'' and l.user_id <> auth.uid()))';
    execute 'create policy "listing_reports_select_own" on public.listing_reports for select to authenticated using (auth.uid() = reporter_id)';
    execute 'create policy "listing_reports_select_admin" on public.listing_reports for select to authenticated using (public.is_admin())';
    execute 'revoke update, delete on public.listing_reports from anon, authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Saved searches: user-owned rows, full own CRUD only
-- ---------------------------------------------------------------------------

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Axtaris',
  search_query text,
  product_name text,
  category text,
  city text,
  condition text,
  min_price numeric,
  max_price numeric,
  created_at timestamptz not null default now()
);

alter table public.saved_searches add column if not exists product_name text;
alter table public.saved_searches add column if not exists notify_new boolean not null default true;
alter table public.saved_searches add column if not exists last_checked_at timestamptz not null default now();

create index if not exists saved_searches_user_id_idx on public.saved_searches (user_id);

alter table public.saved_searches enable row level security;

drop policy if exists "Users manage own saved searches" on public.saved_searches;
drop policy if exists saved_searches_select_own on public.saved_searches;
drop policy if exists saved_searches_insert_own on public.saved_searches;
drop policy if exists saved_searches_update_own on public.saved_searches;
drop policy if exists saved_searches_delete_own on public.saved_searches;

create policy saved_searches_select_own
  on public.saved_searches for select to authenticated
  using (auth.uid() = user_id);

create policy saved_searches_insert_own
  on public.saved_searches for insert to authenticated
  with check (auth.uid() = user_id);

create policy saved_searches_update_own
  on public.saved_searches for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy saved_searches_delete_own
  on public.saved_searches for delete to authenticated
  using (auth.uid() = user_id);
