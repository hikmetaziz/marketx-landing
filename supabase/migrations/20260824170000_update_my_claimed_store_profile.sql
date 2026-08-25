-- Allow an authenticated owner to update the editable profile of one claimed store.
-- Media URLs must point to JPEG objects uploaded under that user's exact store path.

create or replace function public.update_my_claimed_store(
  p_store_id uuid,
  p_name text,
  p_description text default null,
  p_contact_phone text default null,
  p_whatsapp_phone text default null,
  p_address text default null,
  p_city text default null,
  p_map_url text default null,
  p_logo_url text default null,
  p_cover_url text default null
)
returns table (
  id uuid,
  slug text,
  logo_url text,
  cover_url text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_logo_path text;
  v_cover_path text;
  v_logo_prefix text;
  v_cover_prefix text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_store_id is null
     or not public.marktx_store_member_has_role(
       p_store_id,
       v_user_id,
       array['owner']
     ) then
    raise exception 'Not authorized';
  end if;

  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'Store name is required';
  end if;

  v_logo_prefix := v_user_id::text || '/stores/' || p_store_id::text || '/logo-';
  v_cover_prefix := v_user_id::text || '/stores/' || p_store_id::text || '/cover-';

  if p_logo_url is not null then
    v_logo_path := substring(
      p_logo_url
      from '/storage/v1/object/public/listing-images/(.+)$'
    );

    if v_logo_path is null
       or not starts_with(v_logo_path, v_logo_prefix)
       or substring(v_logo_path from char_length(v_logo_prefix) + 1)
          !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.jpg$'
       or not exists (
         select 1
         from storage.objects as so
         where so.bucket_id = 'listing-images'
           and so.name = v_logo_path
       ) then
      raise exception 'Invalid store logo';
    end if;
  end if;

  if p_cover_url is not null then
    v_cover_path := substring(
      p_cover_url
      from '/storage/v1/object/public/listing-images/(.+)$'
    );

    if v_cover_path is null
       or not starts_with(v_cover_path, v_cover_prefix)
       or substring(v_cover_path from char_length(v_cover_prefix) + 1)
          !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.jpg$'
       or not exists (
         select 1
         from storage.objects as so
         where so.bucket_id = 'listing-images'
           and so.name = v_cover_path
       ) then
      raise exception 'Invalid store cover';
    end if;
  end if;

  return query
  update public.stores as s
  set
    name = btrim(p_name),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    contact_phone = nullif(btrim(coalesce(p_contact_phone, '')), ''),
    whatsapp_phone = nullif(btrim(coalesce(p_whatsapp_phone, '')), ''),
    address = nullif(btrim(coalesce(p_address, '')), ''),
    city = nullif(btrim(coalesce(p_city, '')), ''),
    map_url = nullif(btrim(coalesce(p_map_url, '')), ''),
    logo_url = case when p_logo_url is null then s.logo_url else p_logo_url end,
    cover_url = case when p_cover_url is null then s.cover_url else p_cover_url end
  where s.id = p_store_id
    and s.status = 'claimed'
  returning s.id, s.slug, s.logo_url, s.cover_url;

  if not found then
    raise exception 'Not authorized';
  end if;
end;
$$;

revoke all on function public.update_my_claimed_store(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.update_my_claimed_store(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
