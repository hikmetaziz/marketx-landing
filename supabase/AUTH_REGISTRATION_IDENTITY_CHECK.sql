-- MarktX: public-safe registration identity duplicate check
-- Run once in Supabase Dashboard -> SQL Editor.
--
-- Purpose:
-- - Let anon/authenticated clients check whether a registration email or phone
--   is already associated with an account before signUp.
-- - Return only booleans, never emails, phone numbers, roles, or user ids.
-- - Do not mutate production users.

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

create or replace function public.check_registration_identity(
  p_email text,
  p_phone text
)
returns table (
  email_exists boolean,
  phone_exists boolean
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(nullif(btrim(p_email), ''));
  v_phone text := public.normalize_az_phone(p_phone);
begin
  return query
  select
    case
      when v_email is null then false
      else exists (
        select 1
        from auth.users as u
        where lower(nullif(btrim(u.email), '')) = v_email
          or lower(nullif(btrim(u.raw_user_meta_data ->> 'email'), '')) = v_email
        union
        select 1
        from public.profiles as p
        where lower(nullif(btrim(p.email), '')) = v_email
      )
    end as email_exists,
    case
      when v_phone is null then false
      else exists (
        select 1
        from auth.users as u
        where public.normalize_az_phone(u.phone) = v_phone
          or public.normalize_az_phone(u.raw_user_meta_data ->> 'phone') = v_phone
        union
        select 1
        from public.profiles as p
        where public.normalize_az_phone(p.phone) = v_phone
      )
    end as phone_exists;
end;
$$;

revoke all on function public.check_registration_identity(text, text) from public;
grant execute on function public.check_registration_identity(text, text) to anon, authenticated;

comment on function public.check_registration_identity(text, text) is
  'Returns booleans for registration duplicate checks without exposing account data.';
