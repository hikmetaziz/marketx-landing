-- MarktX: Supabase Auth phone/password users -> public.profiles sync
-- Run once in Supabase Dashboard -> SQL Editor.
--
-- Purpose:
-- 1) Ensure profiles has marketplace profile columns.
-- 2) Create/update profile rows from auth.users after phone signup.
-- 3) Preserve existing admin/moderator roles.
-- 4) Keep email/phone protected, while exposing a public-safe profile view.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone text,
  display_name text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles
set role = 'user'
where role is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'admin', 'moderator'));
  end if;
end $$;

create or replace function public.normalize_az_phone(p_phone text)
returns text
language sql
immutable
as $$
  with raw as (
    select coalesce(btrim(p_phone), '') as value
  ),
  digits as (
    select regexp_replace(value, '\D', '', 'g') as value
    from raw
  )
  select case
    when (select value from raw) ~ '^\+994[1-9][0-9]{8}$'
      then (select value from raw)
    when (select value from digits) ~ '^994[1-9][0-9]{8}$'
      then '+' || (select value from digits)
    when (select value from digits) ~ '^0[1-9][0-9]{8}$'
      then '+994' || right((select value from digits), 9)
    when (select value from digits) ~ '^[1-9][0-9]{8}$'
      then '+994' || (select value from digits)
    else null
  end;
$$;

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_phone text;
  v_display_name text;
begin
  v_email := nullif(coalesce(new.email, new.raw_user_meta_data ->> 'email'), '');
  v_phone := coalesce(
    public.normalize_az_phone(new.phone),
    public.normalize_az_phone(new.raw_user_meta_data ->> 'phone')
  );
  v_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  );

  insert into public.profiles (id, email, phone, display_name, role, updated_at)
  values (new.id, v_email, v_phone, v_display_name, 'user', now())
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        phone = coalesce(excluded.phone, public.profiles.phone),
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

insert into public.profiles (id, email, phone, display_name, role, updated_at)
select
  u.id,
  nullif(coalesce(u.email, u.raw_user_meta_data ->> 'email'), ''),
  coalesce(
    public.normalize_az_phone(u.phone),
    public.normalize_az_phone(u.raw_user_meta_data ->> 'phone')
  ),
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(u.raw_user_meta_data ->> 'full_name', '')
  ),
  'user',
  now()
from auth.users as u
where not exists (
  select 1
  from public.profiles as p
  where p.id = u.id
);

update public.profiles as p
set
  email = coalesce(p.email, u.email, nullif(u.raw_user_meta_data ->> 'email', '')),
  phone = coalesce(
    p.phone,
    public.normalize_az_phone(u.phone),
    public.normalize_az_phone(u.raw_user_meta_data ->> 'phone')
  ),
  display_name = coalesce(
    p.display_name,
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(u.raw_user_meta_data ->> 'full_name', '')
  ),
  updated_at = now()
from auth.users as u
where p.id = u.id
  and (
    p.email is null
    or p.phone is null
    or p.display_name is null
  );

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row
  execute function public.profiles_before_update();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select to authenticated
  using (public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke insert on public.profiles from authenticated;
revoke delete on public.profiles from authenticated;

create or replace view public.public_profiles as
select
  id,
  display_name
from public.profiles;

comment on view public.public_profiles is
  'Public-safe marketplace profile fields only. Does not expose email or phone.';

grant select on public.public_profiles to anon, authenticated;
