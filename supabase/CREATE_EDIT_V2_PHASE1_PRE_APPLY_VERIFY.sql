-- MarktX Create/Edit Listing V2 - Phase 1 pre-apply verification
-- Read-only checks. Safe to run before CREATE_EDIT_V2_PHASE1_SCHEMA_PREP.sql.

with
listing_counts as (
  select count(*)::bigint as listing_count
  from public.listings
),
listing_image_counts as (
  select count(*)::bigint as listing_images_count
  from public.listing_images
),
image_ownership_counts as (
  select
    count(*)::bigint as total_images,
    count(*) filter (where li.listing_id is null)::bigint as images_with_null_listing_id,
    count(*) filter (where li.listing_id is not null)::bigint as images_with_non_null_listing_id,
    count(*) filter (where l.id is null)::bigint as images_without_matching_listing,
    count(*) filter (where l.id is not null)::bigint as images_with_matching_listing,
    count(*) filter (where l.user_id is null)::bigint as images_with_null_listing_owner,
    count(*) filter (where l.user_id is not null)::bigint as images_with_non_null_listing_owner,
    count(distinct li.listing_id)::bigint as distinct_listings_with_images
  from public.listing_images li
  left join public.listings l on l.id = li.listing_id
),
category_counts as (
  select
    (select count(*)::bigint from public.categories) as category_count,
    (select count(*)::bigint from public.categories where is_active) as active_category_count,
    (select count(*)::bigint from public.subcategories) as subcategory_count,
    (select count(*)::bigint from public.subcategories where is_active) as active_subcategory_count
),
status_counts as (
  select coalesce(
    jsonb_object_agg(status, listing_count order by status),
    '{}'::jsonb
  ) as listing_status_counts
  from (
    select status::text as status, count(*)::bigint as listing_count
    from public.listings
    group by status::text
  ) s
),
target_objects as (
  select
    to_regclass('public.category_form_schemas')::text as category_form_schemas,
    to_regclass('public.category_photo_schemas')::text as category_photo_schemas,
    to_regclass('public.listing_images')::text as listing_images
)
select jsonb_build_object(
  'listing_count', lc.listing_count,
  'listing_images_count', lic.listing_images_count,
  'image_ownership_counts', to_jsonb(ioc),
  'category_counts', to_jsonb(cc),
  'listing_status_counts', sc.listing_status_counts,
  'target_objects', to_jsonb(t)
) as phase1_pre_apply_baseline
from listing_counts lc
cross join listing_image_counts lic
cross join image_ownership_counts ioc
cross join category_counts cc
cross join status_counts sc
cross join target_objects t;
