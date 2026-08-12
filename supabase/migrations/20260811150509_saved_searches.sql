-- Saved search filters per user

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

create index if not exists saved_searches_user_id_idx on public.saved_searches (user_id);

alter table public.saved_searches enable row level security;

drop policy if exists saved_searches_select_own on public.saved_searches;
create policy saved_searches_select_own
  on public.saved_searches
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists saved_searches_insert_own on public.saved_searches;
create policy saved_searches_insert_own
  on public.saved_searches
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists saved_searches_delete_own on public.saved_searches;
create policy saved_searches_delete_own
  on public.saved_searches
  for delete
  to authenticated
  using (auth.uid() = user_id);
