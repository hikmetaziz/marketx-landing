-- MarktX Phase 2.0: live listings read path (backward-compatible with mobile app)
-- Supabase Dashboard → SQL Editor → Run once after ENABLE_LISTINGS_AND_RLS.sql
--
-- Does NOT create listing_images or listing_favorites tables.
-- Does NOT modify public.favorites.

-- ── 1) slug + updated_at columns ─────────────────────────────────────────────

alter table public.listings add column if not exists slug text;
alter table public.listings add column if not exists updated_at timestamptz default now();

comment on column public.listings.slug is 'Public URL slug for /listings/[slug]. Unique per listing.';
comment on column public.listings.updated_at is 'Last update timestamp; maintained by trigger.';

-- ── 2) Status workflow — extend listing_status enum (shared with mobile app) ─
--
-- listings.status uses enum listing_status, NOT text + CHECK.
-- Add missing values only; do not drop/replace the enum.

alter table public.listings drop constraint if exists listings_status_check;

alter type public.listing_status add value if not exists 'rejected';
alter type public.listing_status add value if not exists 'archived';

comment on type public.listing_status is
  'Phase 2 workflow: pending → active/rejected; active → sold; admin may archive.';

-- Expected values: pending, active, sold, rejected, archived (+ any legacy mobile values).

-- ── 3) Slug helper ───────────────────────────────────────────────────────────

create or replace function public.generate_listing_slug(title text, listing_id uuid)
returns text
language sql
immutable
as $$
  select
    trim(both '-' from regexp_replace(
      lower(
        translate(
          coalesce(title, 'elan'),
          'əöüğıçşƏÖÜĞIÇŞ',
          'eouigcsEOUIGCS'
        )
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ))
    || '-'
    || left(replace(listing_id::text, '-', ''), 8);
$$;

comment on function public.generate_listing_slug(text, uuid) is
  'Generates URL-safe slug from title + short id suffix to avoid collisions with sample listings.';

-- ── 4) Auto-set slug on insert/update when missing ───────────────────────────

create or replace function public.listings_set_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.generate_listing_slug(new.title, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists listings_set_slug on public.listings;
create trigger listings_set_slug
  before insert or update of title, slug on public.listings
  for each row
  execute function public.listings_set_slug();

-- ── 5) updated_at trigger ────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row
  execute function public.set_updated_at();

-- ── 6) Backfill slugs for existing rows ──────────────────────────────────────
--
-- SQL Editor runs without auth.uid(); listings_before_update blocks the UPDATE.
-- Temporarily disable that trigger, then re-enable.

alter table public.listings disable trigger listings_before_update;

update public.listings
set slug = public.generate_listing_slug(title, id)
where slug is null or btrim(slug) = '';

alter table public.listings enable trigger listings_before_update;

-- ── 7) Unique slug index (public listings only) ───────────────────────────────

create unique index if not exists listings_slug_unique_idx
  on public.listings (slug)
  where slug is not null and btrim(slug) <> '';

-- ── 8) Ensure is_admin() exists (from ENABLE_LISTINGS_AND_RLS.sql) ───────────

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

-- ── 9) RLS: public read active + sold; owner all; admin all ─────────────────

alter table public.listings enable row level security;

drop policy if exists "listings_select_visible" on public.listings;
create policy "listings_select_visible"
  on public.listings for select to anon, authenticated
  using (
    status in ('active', 'sold')
    or (auth.uid() is not null and auth.uid() = user_id)
    or public.is_admin()
  );

comment on policy "listings_select_visible" on public.listings is
  'Public: active/sold only. Owners see own listings in any status. Admins see all.';

-- Insert/update policies from ENABLE_LISTINGS_AND_RLS.sql remain valid.
-- Re-assert insert policy for clarity:

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
  on public.listings for insert to authenticated
  with check (auth.uid() = user_id);

-- pending/rejected/archived are NOT visible to anon via SELECT policy above.
