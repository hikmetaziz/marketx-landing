-- MarktX: listing reports
-- Run once in Supabase SQL Editor after listings/profiles migrations.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null default 'listing',
  listing_id uuid references public.listings (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_target_type_check check (target_type in ('listing')),
  constraint reports_reason_check check (
    reason in ('spam', 'incorrect_information', 'fraud', 'prohibited', 'wrong_category', 'duplicate', 'other')
  ),
  constraint reports_status_check check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint reports_listing_target_required check (
    target_type <> 'listing' or listing_id is not null
  )
);

alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports
  add constraint reports_reason_check check (
    reason in ('spam', 'incorrect_information', 'fraud', 'prohibited', 'wrong_category', 'duplicate', 'other')
  );

create unique index if not exists reports_listing_once_per_user_idx
  on public.reports (reporter_id, listing_id)
  where target_type = 'listing' and listing_id is not null;

create index if not exists reports_listing_id_idx on public.reports (listing_id);
create index if not exists reports_status_created_at_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_listing" on public.reports;
create policy "reports_insert_listing"
  on public.reports for insert to authenticated
  with check (
    auth.uid() = reporter_id
    and target_type = 'listing'
    and listing_id is not null
    and exists (
      select 1
      from public.listings
      where listings.id = listing_id
        and listings.status in ('active', 'sold')
        and listings.user_id <> auth.uid()
    )
  );

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports for select to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin"
  on public.reports for select to authenticated
  using (public.is_admin());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
