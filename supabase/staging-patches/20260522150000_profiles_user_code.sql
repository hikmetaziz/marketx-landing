-- Staging-safe copy of mobile migration 20260522150000_profiles_user_code.sql.
-- Difference: setval handles an empty profiles table without setting sequence to 0.

create sequence if not exists public.profiles_user_number_seq;

create or replace function public.format_user_code(num bigint)
returns text
language sql
immutable
as $$
  select case
    when num >= 1 and num <= 999999 then 'MX-' || lpad(num::text, 6, '0')
    else 'MX-' || num::text
  end;
$$;

alter table public.profiles
  add column if not exists user_number bigint,
  add column if not exists user_code text;

with numbered as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as rn
  from public.profiles
  where user_number is null
)
update public.profiles as p
set
  user_number = numbered.rn,
  user_code = public.format_user_code(numbered.rn)
from numbered
where p.id = numbered.id;

select setval(
  'public.profiles_user_number_seq',
  greatest(coalesce((select max(user_number) from public.profiles), 1), 1),
  coalesce((select max(user_number) from public.profiles), 0) > 0
);

alter table public.profiles
  alter column user_number set not null;

alter table public.profiles
  alter column user_code set not null;

create unique index if not exists profiles_user_number_key
  on public.profiles (user_number);

create unique index if not exists profiles_user_code_key
  on public.profiles (user_code);

create or replace function public.assign_profile_user_code()
returns trigger
language plpgsql
as $$
begin
  if new.user_number is null then
    new.user_number := nextval('public.profiles_user_number_seq');
  end if;

  if new.user_code is null then
    new.user_code := public.format_user_code(new.user_number);
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_assign_user_code on public.profiles;
create trigger profiles_assign_user_code
  before insert on public.profiles
  for each row
  execute function public.assign_profile_user_code();

create or replace function public.protect_profile_user_code()
returns trigger
language plpgsql
as $$
begin
  new.user_number := old.user_number;
  new.user_code := old.user_code;
  return new;
end;
$$;

drop trigger if exists profiles_protect_user_code on public.profiles;
create trigger profiles_protect_user_code
  before update on public.profiles
  for each row
  execute function public.protect_profile_user_code();
