-- İstifadəçi şikayətləri: elan, söhbət

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

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'conversation')),
  listing_id uuid references public.listings(id) on delete set null,
  reported_user_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason text not null check (
    reason in ('fake', 'spam', 'fraud', 'wrong_info', 'harassment', 'copyright', 'other')
  ),
  details text check (details is null or char_length(trim(details)) <= 500),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reports_target_context check (
    (target_type = 'listing' and listing_id is not null)
    or (target_type = 'conversation' and conversation_id is not null and reported_user_id is not null)
  )
);

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);

create unique index if not exists reports_unique_pending_listing
  on public.reports (reporter_id, listing_id)
  where status = 'pending' and target_type = 'listing';

create unique index if not exists reports_unique_pending_conversation
  on public.reports (reporter_id, conversation_id)
  where status = 'pending' and target_type = 'conversation';

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_select_own" on public.reports;
drop policy if exists "reports_select_admin" on public.reports;
drop policy if exists "reports_update_admin" on public.reports;

create policy "reports_insert_own"
  on public.reports
  for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and status = 'pending'
    and (
      target_type <> 'listing'
      or not exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.user_id = auth.uid()
      )
    )
    and (
      target_type <> 'conversation'
      or exists (
        select 1
        from public.conversations c
        where c.id = conversation_id
          and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
          and reported_user_id in (c.buyer_id, c.seller_id)
          and reported_user_id <> auth.uid()
      )
    )
  );

create policy "reports_select_own"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

create policy "reports_select_admin"
  on public.reports
  for select
  to authenticated
  using (public.is_admin());

create policy "reports_update_admin"
  on public.reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
