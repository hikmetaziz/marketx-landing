-- MarktX Create/Edit Listing V2 - Phase 1 DB schema prep
-- Review first. Do not run on production until the SQL has been checked.
--
-- Scope:
-- - Adds availability_status to listings without migrating old city values.
-- - Adds nullable schema version markers for future web/mobile form handling.
-- - Adds versioned category form/photo schema tables.
-- - Extends listing_images with optional photo slot metadata when the table exists.
--
-- Out of scope:
-- - No listing data is migrated.
-- - No invalid city value is changed.
-- - No phone verification/SMS provider setting is changed.
-- - No frontend/mobile code is changed.

begin;

-- ---------------------------------------------------------------------------
-- Listings: availability + schema version markers
-- ---------------------------------------------------------------------------

alter table public.listings
  add column if not exists availability_status text,
  add column if not exists form_schema_version integer,
  add column if not exists photo_schema_version integer;

comment on column public.listings.availability_status is
  'Listing availability for V2 create/edit. Allowed values: in_stock, order_only, importing, unavailable. Legacy rows may be null.';

comment on column public.listings.form_schema_version is
  'Version of category_form_schemas used when the listing was submitted. Legacy rows may be null.';

comment on column public.listings.photo_schema_version is
  'Version of category_photo_schemas used when the listing photos were submitted. Legacy rows may be null.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_availability_status_check'
  ) then
    alter table public.listings
      add constraint listings_availability_status_check
      check (
        availability_status is null
        or availability_status in ('in_stock', 'order_only', 'importing', 'unavailable')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_form_schema_version_positive'
  ) then
    alter table public.listings
      add constraint listings_form_schema_version_positive
      check (form_schema_version is null or form_schema_version > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_photo_schema_version_positive'
  ) then
    alter table public.listings
      add constraint listings_photo_schema_version_positive
      check (photo_schema_version is null or photo_schema_version > 0);
  end if;
end $$;

create index if not exists listings_active_availability_status_idx
  on public.listings (availability_status)
  where status = 'active' and availability_status is not null;

create index if not exists listings_form_schema_version_idx
  on public.listings (form_schema_version)
  where form_schema_version is not null;

create index if not exists listings_photo_schema_version_idx
  on public.listings (photo_schema_version)
  where photo_schema_version is not null;

-- ---------------------------------------------------------------------------
-- Versioned category-driven form schemas
-- ---------------------------------------------------------------------------

create table if not exists public.category_form_schemas (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete cascade,
  subcategory_id uuid references public.subcategories (id) on delete cascade,
  category_slug text not null,
  subcategory_slug text,
  schema_version integer not null default 1,
  schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_form_schemas_category_slug_check
    check (btrim(category_slug) <> ''),
  constraint category_form_schemas_subcategory_slug_check
    check (subcategory_slug is null or btrim(subcategory_slug) <> ''),
  constraint category_form_schemas_schema_version_check
    check (schema_version > 0),
  constraint category_form_schemas_schema_object_check
    check (jsonb_typeof(schema) = 'object')
);

comment on table public.category_form_schemas is
  'Versioned category form schemas shared by MarktX web and mobile create/edit flows.';

comment on column public.category_form_schemas.schema is
  'JSON schema/config for V2 listing fields. Keep compatible across web and mobile.';

create unique index if not exists category_form_schemas_active_slug_idx
  on public.category_form_schemas (category_slug, coalesce(subcategory_slug, ''))
  where is_active;

create index if not exists category_form_schemas_category_idx
  on public.category_form_schemas (category_id, subcategory_id);

create index if not exists category_form_schemas_active_idx
  on public.category_form_schemas (is_active, schema_version);

alter table public.category_form_schemas enable row level security;

drop policy if exists "category_form_schemas_read_active" on public.category_form_schemas;
create policy "category_form_schemas_read_active"
  on public.category_form_schemas for select to anon, authenticated
  using (is_active);

drop policy if exists "category_form_schemas_admin_all" on public.category_form_schemas;
create policy "category_form_schemas_admin_all"
  on public.category_form_schemas for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists category_form_schemas_set_updated_at on public.category_form_schemas;
create trigger category_form_schemas_set_updated_at
  before update on public.category_form_schemas
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Versioned category-driven photo schemas
-- ---------------------------------------------------------------------------

create table if not exists public.category_photo_schemas (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete cascade,
  subcategory_id uuid references public.subcategories (id) on delete cascade,
  category_slug text not null,
  subcategory_slug text,
  schema_version integer not null default 1,
  schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_photo_schemas_category_slug_check
    check (btrim(category_slug) <> ''),
  constraint category_photo_schemas_subcategory_slug_check
    check (subcategory_slug is null or btrim(subcategory_slug) <> ''),
  constraint category_photo_schemas_schema_version_check
    check (schema_version > 0),
  constraint category_photo_schemas_schema_object_check
    check (jsonb_typeof(schema) = 'object')
);

comment on table public.category_photo_schemas is
  'Versioned category photo slot schemas shared by MarktX web and mobile create/edit flows.';

comment on column public.category_photo_schemas.schema is
  'JSON photo slot config. Example slots: front, back, dashboard, serial_label, optional_gallery.';

create unique index if not exists category_photo_schemas_active_slug_idx
  on public.category_photo_schemas (category_slug, coalesce(subcategory_slug, ''))
  where is_active;

create index if not exists category_photo_schemas_category_idx
  on public.category_photo_schemas (category_id, subcategory_id);

create index if not exists category_photo_schemas_active_idx
  on public.category_photo_schemas (is_active, schema_version);

alter table public.category_photo_schemas enable row level security;

drop policy if exists "category_photo_schemas_read_active" on public.category_photo_schemas;
create policy "category_photo_schemas_read_active"
  on public.category_photo_schemas for select to anon, authenticated
  using (is_active);

drop policy if exists "category_photo_schemas_admin_all" on public.category_photo_schemas;
create policy "category_photo_schemas_admin_all"
  on public.category_photo_schemas for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists category_photo_schemas_set_updated_at on public.category_photo_schemas;
create trigger category_photo_schemas_set_updated_at
  before update on public.category_photo_schemas
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Listing image photo slot metadata
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.listing_images') is null then
    raise notice 'public.listing_images does not exist; skipping V2 photo slot columns.';
    return;
  end if;

  alter table public.listing_images
    add column if not exists slot_key text,
    add column if not exists sort_order integer not null default 0,
    add column if not exists is_primary boolean not null default false,
    add column if not exists photo_schema_version integer,
    add column if not exists metadata jsonb not null default '{}'::jsonb;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.listing_images'::regclass
      and conname = 'listing_images_slot_key_format_check'
  ) then
    alter table public.listing_images
      add constraint listing_images_slot_key_format_check
      check (slot_key is null or slot_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.listing_images'::regclass
      and conname = 'listing_images_sort_order_non_negative'
  ) then
    alter table public.listing_images
      add constraint listing_images_sort_order_non_negative
      check (sort_order >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.listing_images'::regclass
      and conname = 'listing_images_photo_schema_version_positive'
  ) then
    alter table public.listing_images
      add constraint listing_images_photo_schema_version_positive
      check (photo_schema_version is null or photo_schema_version > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.listing_images'::regclass
      and conname = 'listing_images_metadata_object_check'
  ) then
    alter table public.listing_images
      add constraint listing_images_metadata_object_check
      check (jsonb_typeof(metadata) = 'object');
  end if;

  execute '
    create index if not exists listing_images_listing_sort_idx
      on public.listing_images (listing_id, sort_order)
  ';

  execute '
    create index if not exists listing_images_listing_slot_idx
      on public.listing_images (listing_id, slot_key)
      where slot_key is not null
  ';

  execute '
    create index if not exists listing_images_photo_schema_version_idx
      on public.listing_images (photo_schema_version)
      where photo_schema_version is not null
  ';

  execute '
    create unique index if not exists listing_images_one_primary_per_listing_idx
      on public.listing_images (listing_id)
      where is_primary
  ';
end $$;

commit;
