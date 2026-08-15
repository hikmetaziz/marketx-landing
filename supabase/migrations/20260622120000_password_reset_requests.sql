create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  phone text not null
    check (phone ~ '^\+994(10|50|51|55|60|70|77|99)[0-9]{7}$'),
  status text not null default 'requested'
    check (status in ('requested', 'in_progress', 'resolved', 'rejected')),
  note text,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists password_reset_requests_status_created_idx
  on public.password_reset_requests (status, created_at desc);

create unique index if not exists password_reset_requests_one_open_per_phone_idx
  on public.password_reset_requests (phone)
  where status in ('requested', 'in_progress');

create or replace function public.set_password_reset_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists password_reset_requests_set_updated_at on public.password_reset_requests;
create trigger password_reset_requests_set_updated_at
  before update on public.password_reset_requests
  for each row
  execute function public.set_password_reset_requests_updated_at();

alter table public.password_reset_requests enable row level security;

drop policy if exists "password_reset_requests_insert_public" on public.password_reset_requests;
create policy "password_reset_requests_insert_public"
  on public.password_reset_requests
  for insert
  to anon, authenticated
  with check (
    status = 'requested'
    and handled_by is null
    and handled_at is null
  );

drop policy if exists "password_reset_requests_select_admin" on public.password_reset_requests;
create policy "password_reset_requests_select_admin"
  on public.password_reset_requests
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "password_reset_requests_update_admin" on public.password_reset_requests;
create policy "password_reset_requests_update_admin"
  on public.password_reset_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
