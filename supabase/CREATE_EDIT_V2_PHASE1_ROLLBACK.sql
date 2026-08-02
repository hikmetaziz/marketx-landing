-- MarktX Create/Edit Listing V2 - Phase 1 rollback
-- Review before running. This is destructive for any V2 schema/config data that
-- has already been written into these columns/tables.

begin;

-- New schema tables.
do $$
begin
  if to_regclass('public.category_form_schemas') is not null then
    execute 'drop trigger if exists category_form_schemas_set_updated_at on public.category_form_schemas';
    execute 'drop policy if exists "category_form_schemas_admin_all" on public.category_form_schemas';
    execute 'drop policy if exists "category_form_schemas_read_active" on public.category_form_schemas';
    execute 'drop table public.category_form_schemas';
  end if;

  if to_regclass('public.category_photo_schemas') is not null then
    execute 'drop trigger if exists category_photo_schemas_set_updated_at on public.category_photo_schemas';
    execute 'drop policy if exists "category_photo_schemas_admin_all" on public.category_photo_schemas';
    execute 'drop policy if exists "category_photo_schemas_read_active" on public.category_photo_schemas';
    execute 'drop table public.category_photo_schemas';
  end if;
end $$;

-- Listing image slot metadata.
drop index if exists public.listing_images_one_primary_per_listing_idx;
drop index if exists public.listing_images_photo_schema_version_idx;
drop index if exists public.listing_images_listing_slot_idx;
drop index if exists public.listing_images_listing_sort_idx;

do $$
begin
  if to_regclass('public.listing_images') is not null then
    alter table public.listing_images
      drop constraint if exists listing_images_metadata_object_check,
      drop constraint if exists listing_images_photo_schema_version_positive,
      drop constraint if exists listing_images_sort_order_non_negative,
      drop constraint if exists listing_images_slot_key_format_check;

    alter table public.listing_images
      drop column if exists metadata,
      drop column if exists photo_schema_version,
      drop column if exists is_primary,
      drop column if exists sort_order,
      drop column if exists slot_key;
  end if;
end $$;

-- Listing availability/schema markers.
drop index if exists public.listings_photo_schema_version_idx;
drop index if exists public.listings_form_schema_version_idx;
drop index if exists public.listings_active_availability_status_idx;

alter table public.listings
  drop constraint if exists listings_photo_schema_version_positive,
  drop constraint if exists listings_form_schema_version_positive,
  drop constraint if exists listings_availability_status_check;

alter table public.listings
  drop column if exists photo_schema_version,
  drop column if exists form_schema_version,
  drop column if exists availability_status;

commit;
