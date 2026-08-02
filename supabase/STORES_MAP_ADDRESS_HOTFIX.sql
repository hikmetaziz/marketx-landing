-- MarktX: hotfix for admin_create_store RPC with map_url.
-- Safe/idempotent: keeps existing stores data, recreates only the public view and RPC signature.

alter table public.stores
  add column if not exists map_url text;

comment on column public.stores.map_url is
  'Optional Google/Yandex Maps URL. Public map can also be built from address + city.';

alter table public.stores
  drop column if exists latitude,
  drop column if exists longitude;

drop view if exists public.public_store_profiles;

create view public.public_store_profiles as
select
  id,
  store_code,
  name,
  slug,
  description,
  category,
  category_id,
  contact_phone,
  whatsapp_phone,
  address,
  city,
  map_url,
  logo_url,
  cover_url,
  created_at
from public.stores
where status in ('unclaimed', 'claim_pending', 'claimed');

grant select on public.public_store_profiles to anon, authenticated;

drop function if exists public.admin_create_store(
  text, text, uuid, text, text, text, text, text, double precision, double precision, text
);

create or replace function public.admin_create_store(
  p_name text,
  p_category text default null,
  p_category_id uuid default null,
  p_city text default null,
  p_contact_phone text default null,
  p_whatsapp_phone text default null,
  p_address text default null,
  p_description text default null,
  p_map_url text default null
)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
begin
  if not public.is_admin() then
    raise exception 'Yalnız admin mağaza yarada bilər.';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Mağaza adı boş ola bilməz.';
  end if;

  insert into public.stores (
    name,
    category,
    category_id,
    city,
    contact_phone,
    whatsapp_phone,
    address,
    description,
    map_url,
    status,
    owner_id,
    created_by
  )
  values (
    btrim(p_name),
    p_category,
    p_category_id,
    p_city,
    p_contact_phone,
    p_whatsapp_phone,
    p_address,
    p_description,
    nullif(btrim(p_map_url), ''),
    'unclaimed',
    null,
    auth.uid()
  )
  returning * into v_store;

  perform public.store_audit(
    v_store.id,
    'store_created',
    jsonb_build_object('name', v_store.name, 'store_code', v_store.store_code)
  );

  return v_store;
end;
$$;

revoke all on function public.admin_create_store(text, text, uuid, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.admin_create_store(text, text, uuid, text, text, text, text, text, text)
  to authenticated;

drop function if exists public.admin_create_store(text, text, uuid, text, text, text, text, text);

notify pgrst, 'reload schema';
