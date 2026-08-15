-- MarktX Create/Edit Listing V2 - Phase 1 audit queries
-- Safe read-only SQL. Run before and after CREATE_EDIT_V2_PHASE1_SCHEMA_PREP.sql.

-- 1) Check whether the new schema objects exist.
select
  to_regclass('public.category_form_schemas') as category_form_schemas,
  to_regclass('public.category_photo_schemas') as category_photo_schemas,
  to_regclass('public.listing_images') as listing_images;

-- 2) Current relevant columns.
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('listings', 'listing_images', 'category_form_schemas', 'category_photo_schemas')
  and column_name in (
    'availability_status',
    'form_schema_version',
    'photo_schema_version',
    'slot_key',
    'sort_order',
    'is_primary',
    'metadata',
    'schema',
    'schema_version',
    'is_active'
  )
order by table_name, ordinal_position;

-- 3) City values that look like availability/status, not real cities.
select
  city,
  status::text as status,
  count(*) as listing_count
from public.listings
where city in ('Xaricdən gətirilir', 'Sifarişlə', 'Stokda yoxdur')
group by city, status::text
order by city, status::text;

-- 4) Exact rows needing manual city/availability review.
select
  id,
  title,
  status::text as status,
  city,
  to_jsonb(listings) ->> 'availability_status' as availability_status,
  to_jsonb(listings) ->> 'category' as category,
  to_jsonb(listings) ->> 'subcategory' as subcategory,
  created_at,
  updated_at,
  case
    when city = 'Xaricdən gətirilir' then 'importing'
    when city = 'Sifarişlə' then 'order_only'
    when city = 'Stokda yoxdur' then 'unavailable'
    else null
  end as proposed_availability_status,
  'manual_city_review_required' as migration_note
from public.listings
where city in ('Xaricdən gətirilir', 'Sifarişlə', 'Stokda yoxdur')
order by updated_at desc nulls last, created_at desc nulls last;

-- 5) Availability coverage after migration is applied.
select
  status::text as status,
  to_jsonb(listings) ->> 'availability_status' as availability_status,
  count(*) as listing_count
from public.listings
group by status::text, to_jsonb(listings) ->> 'availability_status'
order by status::text, availability_status nulls first;

-- 6) Listing image slot readiness after migration is applied.
do $$
declare
  v_total_images bigint;
  v_images_with_slot_key bigint;
  v_primary_images bigint;
  v_listings_with_images bigint;
begin
  if to_regclass('public.listing_images') is null then
    raise notice 'public.listing_images does not exist.';
    return;
  end if;

  execute $audit$
    select
      count(*) as total_images,
      count(*) filter (where to_jsonb(li) ->> 'slot_key' is not null) as images_with_slot_key,
      count(*) filter (where coalesce((to_jsonb(li) ->> 'is_primary')::boolean, false)) as primary_images,
      count(distinct listing_id) as listings_with_images
    from public.listing_images li
  $audit$
  into v_total_images, v_images_with_slot_key, v_primary_images, v_listings_with_images;

  raise notice 'listing_images: total=%, with_slot_key=%, primary=%, listings_with_images=%',
    v_total_images, v_images_with_slot_key, v_primary_images, v_listings_with_images;
end $$;

-- 7) Active schema configs after migration is applied.
do $$
declare
  v_total bigint;
  v_active bigint;
begin
  if to_regclass('public.category_form_schemas') is null then
    raise notice 'public.category_form_schemas does not exist.';
  else
    execute 'select count(*), count(*) filter (where is_active) from public.category_form_schemas'
    into v_total, v_active;
    raise notice 'category_form_schemas: total=%, active=%', v_total, v_active;
  end if;

  if to_regclass('public.category_photo_schemas') is null then
    raise notice 'public.category_photo_schemas does not exist.';
  else
    execute 'select count(*), count(*) filter (where is_active) from public.category_photo_schemas'
    into v_total, v_active;
    raise notice 'category_photo_schemas: total=%, active=%', v_total, v_active;
  end if;
end $$;

-- 8) Auth phone risk remains separate from listing V2.
select
  count(*) as profile_count,
  count(*) filter (where p.phone is not null and btrim(p.phone) <> '') as profiles_with_phone,
  count(*) filter (where u.phone is not null and btrim(u.phone) <> '') as auth_users_with_phone,
  count(*) filter (
    where p.phone is not null
      and btrim(p.phone) <> ''
      and (u.phone is null or btrim(u.phone) = '')
  ) as profiles_phone_missing_in_auth_users
from public.profiles p
left join auth.users u on u.id = p.id;
