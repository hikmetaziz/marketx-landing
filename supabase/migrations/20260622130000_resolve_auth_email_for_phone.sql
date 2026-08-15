-- Telefon nömrəsindən auth.users email ünvanını tapır (telefon + parol login üçün).
-- Qeydiyyat real email ilə edilir; signInWithPassword email tələb edir.

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

create index if not exists profiles_phone_idx
  on public.profiles (phone)
  where phone is not null;
