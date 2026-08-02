-- MarktX Create/Edit Listing V2 - Phase 1 post-apply verification
-- Read-only checks. Safe to run after CREATE_EDIT_V2_PHASE1_SCHEMA_PREP.sql.

with
listing_counts as (
  select
    count(*)::bigint as listing_count,
    count(*) filter (where availability_status is null)::bigint as availability_status_null_count,
    count(*) filter (where availability_status is not null)::bigint as availability_status_non_null_count,
    count(*) filter (
      where availability_status is not null
        and availability_status not in ('in_stock', 'order_only', 'importing', 'unavailable')
    )::bigint as availability_status_invalid_count,
    count(*) filter (where form_schema_version is null)::bigint as form_schema_version_null_count,
    count(*) filter (where form_schema_version is not null)::bigint as form_schema_version_non_null_count,
    count(*) filter (where photo_schema_version is null)::bigint as photo_schema_version_null_count,
    count(*) filter (where photo_schema_version is not null)::bigint as photo_schema_version_non_null_count
  from public.listings
),
listing_image_counts as (
  select
    count(*)::bigint as listing_images_count,
    count(*) filter (where slot_key is null)::bigint as slot_key_null_count,
    count(*) filter (where slot_key is not null)::bigint as slot_key_non_null_count,
    count(*) filter (where sort_order = 0)::bigint as sort_order_zero_count,
    count(*) filter (where sort_order <> 0)::bigint as sort_order_non_zero_count,
    count(*) filter (where is_primary is false)::bigint as is_primary_false_count,
    count(*) filter (where is_primary is true)::bigint as is_primary_true_count,
    count(*) filter (where photo_schema_version is null)::bigint as photo_schema_version_null_count,
    count(*) filter (where photo_schema_version is not null)::bigint as photo_schema_version_non_null_count,
    count(*) filter (where metadata = '{}'::jsonb)::bigint as empty_metadata_count,
    count(*) filter (where jsonb_typeof(metadata) = 'object')::bigint as metadata_object_count,
    count(distinct listing_id)::bigint as distinct_listings_with_images
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
    count(*) filter (where l.user_id is not null)::bigint as images_with_non_null_listing_owner
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
schema_table_counts as (
  select
    (select count(*)::bigint from public.category_form_schemas) as category_form_schema_count,
    (select count(*)::bigint from public.category_form_schemas where is_active) as active_category_form_schema_count,
    (select count(*)::bigint from public.category_photo_schemas) as category_photo_schema_count,
    (select count(*)::bigint from public.category_photo_schemas where is_active) as active_category_photo_schema_count
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
),
target_columns as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'table_name', table_name,
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable,
      'column_default', column_default
    )
    order by table_name, ordinal_position
  ), '[]'::jsonb) as columns
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
),
target_indexes as (
  select coalesce(jsonb_agg(indexname order by tablename, indexname), '[]'::jsonb) as indexes
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'listings_active_availability_status_idx',
      'listings_form_schema_version_idx',
      'listings_photo_schema_version_idx',
      'category_form_schemas_active_slug_idx',
      'category_form_schemas_category_idx',
      'category_form_schemas_active_idx',
      'category_photo_schemas_active_slug_idx',
      'category_photo_schemas_category_idx',
      'category_photo_schemas_active_idx',
      'listing_images_listing_sort_idx',
      'listing_images_listing_slot_idx',
      'listing_images_photo_schema_version_idx',
      'listing_images_one_primary_per_listing_idx'
    )
),
target_triggers as (
  select coalesce(jsonb_agg(trigger_name order by event_object_table, trigger_name), '[]'::jsonb) as triggers
  from information_schema.triggers
  where trigger_schema = 'public'
    and event_object_table in ('category_form_schemas', 'category_photo_schemas')
),
target_policies as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'table_name', tablename,
      'policy_name', policyname,
      'command', cmd,
      'roles', roles,
      'using', qual,
      'with_check', with_check
    )
    order by tablename, policyname
  ), '[]'::jsonb) as policies
  from pg_policies
  where schemaname = 'public'
    and tablename in ('category_form_schemas', 'category_photo_schemas')
),
rls_enabled as (
  select coalesce(jsonb_object_agg(relname, relrowsecurity order by relname), '{}'::jsonb) as rls
  from pg_class
  where oid in ('public.category_form_schemas'::regclass, 'public.category_photo_schemas'::regclass)
)
select jsonb_build_object(
  'listing_counts', to_jsonb(lc),
  'listing_image_counts', to_jsonb(lic),
  'image_ownership_counts', to_jsonb(ioc),
  'category_counts', to_jsonb(cc),
  'schema_table_counts', to_jsonb(stc),
  'listing_status_counts', sc.listing_status_counts,
  'target_objects', to_jsonb(t),
  'target_columns', tc.columns,
  'target_indexes', ti.indexes,
  'target_triggers', tt.triggers,
  'target_policies', tp.policies,
  'rls_enabled', re.rls
) as phase1_post_apply_verification
from listing_counts lc
cross join listing_image_counts lic
cross join image_ownership_counts ioc
cross join category_counts cc
cross join schema_table_counts stc
cross join status_counts sc
cross join target_objects t
cross join target_columns tc
cross join target_indexes ti
cross join target_triggers tt
cross join target_policies tp
cross join rls_enabled re;
