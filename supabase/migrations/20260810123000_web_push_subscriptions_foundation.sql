begin;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_push_subscriptions_user_id_idx
  on public.web_push_subscriptions (user_id, updated_at desc);

create or replace function public.set_web_push_subscriptions_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists web_push_subscriptions_set_updated_at
  on public.web_push_subscriptions;

create trigger web_push_subscriptions_set_updated_at
  before update on public.web_push_subscriptions
  for each row
  execute function public.set_web_push_subscriptions_updated_at();

alter table public.web_push_subscriptions
  enable row level security;

revoke all
  on table public.web_push_subscriptions
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.web_push_subscriptions
  to authenticated;

drop policy if exists web_push_subscriptions_select_own
  on public.web_push_subscriptions;

create policy web_push_subscriptions_select_own
  on public.web_push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists web_push_subscriptions_insert_own
  on public.web_push_subscriptions;

create policy web_push_subscriptions_insert_own
  on public.web_push_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists web_push_subscriptions_update_own
  on public.web_push_subscriptions;

create policy web_push_subscriptions_update_own
  on public.web_push_subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists web_push_subscriptions_delete_own
  on public.web_push_subscriptions;

create policy web_push_subscriptions_delete_own
  on public.web_push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

commit;
