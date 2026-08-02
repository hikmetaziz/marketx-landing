-- MarktX: legacy phone -> email resolver for old email/password accounts
-- Run only while migrating old accounts to native Supabase phone auth.
--
-- Purpose:
-- - Existing users may have phone stored in public.profiles.phone, while
--   auth.users.phone is still empty.
-- - Web/mobile can accept a phone number in the UI, resolve the old auth email,
--   then call Supabase signInWithPassword with the same password.
--
-- Security:
-- - This returns an auth email to anon/authenticated clients, so keep it only as
--   a transition helper.
-- - New registration duplicate checks should use check_registration_identity,
--   which returns booleans only.

create or replace function public.resolve_auth_email_for_phone(p_phone text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_phone text;
  v_digits text;
  v_email text;
begin
  v_phone := nullif(btrim(p_phone), '');
  if v_phone is null then
    return null;
  end if;

  v_digits := regexp_replace(v_phone, '\D', '', 'g');
  if v_digits = '' then
    return null;
  end if;

  select u.email
  into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.phone is not null
    and (
      p.phone = v_phone
      or regexp_replace(p.phone, '\D', '', 'g') = v_digits
    )
  order by p.updated_at desc nulls last, p.created_at desc
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_auth_email_for_phone(text) from public;
grant execute on function public.resolve_auth_email_for_phone(text) to anon, authenticated;

comment on function public.resolve_auth_email_for_phone(text) is
  'Temporary migration helper for old email/password accounts with phone in profiles.';
