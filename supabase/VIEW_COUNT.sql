-- MarktX: listing view_count + safe public increment RPC
-- Run once in Supabase SQL Editor (shared with mobile app).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
--
-- NOTE: Sprint 1 (SPRINT1_SECURITY.sql) replaces increment_listing_view with a
-- rate-limited version that accepts (p_listing_id, p_client_key). Run SPRINT1 after this.

alter table public.listings add column if not exists view_count integer not null default 0;

comment on column public.listings.view_count is 'Public view counter; incremented via increment_listing_view RPC.';

create or replace function public.increment_listing_view(p_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.listings
  set view_count = coalesce(view_count, 0) + 1
  where id = p_listing_id
    and status in ('active', 'sold')
  returning view_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

comment on function public.increment_listing_view(uuid) is
  'Increments view_count for public active/sold listings. Callable by anon via RPC.';

grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
