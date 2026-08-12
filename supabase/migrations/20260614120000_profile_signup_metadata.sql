create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_phone text;
begin
  v_display_name := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
  v_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

  insert into public.profiles (id, email, display_name, phone, role)
  values (new.id, new.email, v_display_name, v_phone, 'user')
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        phone = coalesce(public.profiles.phone, excluded.phone),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
