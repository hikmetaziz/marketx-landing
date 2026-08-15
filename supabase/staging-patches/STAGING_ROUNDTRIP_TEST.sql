-- MarktX staging round-trip test.
-- Creates staging-only auth users/listings and verifies web-shaped and
-- mobile-shaped payloads against the live staging database.

delete from public.listing_contacts
where listing_id in (
  select id from public.listings where source = 'codex-staging-roundtrip'
);

delete from public.listings
where source = 'codex-staging-roundtrip';

delete from auth.users
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'codex-web-staging@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Codex Web Staging"}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'codex-mobile-staging@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Codex Mobile Staging"}'::jsonb,
    now(),
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'codex-other-staging@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Codex Other Staging"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

-- Web create -> mobile read/edit: Automobile
begin;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
insert into public.listings (
  id, user_id, title, price, category, category_id, subcategory_id, attributes,
  city, condition, condition_code, listing_type, price_type, delivery_type,
  description, delivery_available, availability_status, form_schema_version,
  photo_schema_version, source, image_url, image_urls, status
)
select
  'aaaaaaaa-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'Web Auto Roundtrip',
  22500,
  c.name,
  c.id,
  s.id,
  '{"brand":"Toyota","model":"Corolla","year":2021,"fuel_type":"benzin","transmission":"avtomat","body_type":"sedan"}'::jsonb,
  'Bakı',
  'İşlənmiş',
  'good',
  'sell',
  'fixed',
  'pickup',
  'web create auto',
  false,
  'in_stock',
  1,
  1,
  'codex-staging-roundtrip',
  'https://example.com/staging/web-auto.jpg',
  array['https://example.com/staging/web-auto.jpg'],
  'active'::public.listing_status
from public.categories c
join public.subcategories s on s.category_id = c.id and s.slug = 'avtomobiller'
where c.slug = 'avtomobil-ve-neqliyyat';
insert into public.listing_contacts (listing_id, contact_phone)
values ('aaaaaaaa-0000-4000-8000-000000000001', '+994501110001');
commit;

begin;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
update public.listings
set description = 'mobile edit auto', price = 22600
where id = 'aaaaaaaa-0000-4000-8000-000000000001'
  and user_id = '11111111-1111-4111-8111-111111111111';
commit;

-- Web create -> mobile read/edit: Phone, storage exactly 1TB and RAM omitted.
begin;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
insert into public.listings (
  id, user_id, title, price, category, category_id, subcategory_id, attributes,
  city, condition, condition_code, listing_type, price_type, delivery_type,
  description, delivery_available, availability_status, form_schema_version,
  photo_schema_version, source, image_url, image_urls, status
)
select
  'aaaaaaaa-0000-4000-8000-000000000002',
  '11111111-1111-4111-8111-111111111111',
  'Web Phone Roundtrip 1TB',
  2499,
  c.name,
  c.id,
  s.id,
  '{"brand":"Apple","model":"iPhone 15 Pro","storage":"1TB","color":"Qara","has_warranty":true}'::jsonb,
  'Bakı',
  'Yeni',
  'new',
  'sell',
  'fixed',
  'both',
  'web create phone',
  true,
  'in_stock',
  1,
  1,
  'codex-staging-roundtrip',
  'https://example.com/staging/web-phone.jpg',
  array['https://example.com/staging/web-phone.jpg'],
  'active'::public.listing_status
from public.categories c
join public.subcategories s on s.category_id = c.id and s.slug = 'smartfonlar'
where c.slug = 'telefon';
insert into public.listing_contacts (listing_id, contact_phone)
values ('aaaaaaaa-0000-4000-8000-000000000002', '+994501110002');
commit;

begin;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
update public.listings
set description = 'mobile edit phone'
where id = 'aaaaaaaa-0000-4000-8000-000000000002'
  and user_id = '11111111-1111-4111-8111-111111111111';
commit;

-- Web create -> mobile read/edit: Electronics
begin;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
insert into public.listings (
  id, user_id, title, price, category, category_id, subcategory_id, attributes,
  city, condition, condition_code, listing_type, price_type, delivery_type,
  description, delivery_available, availability_status, form_schema_version,
  photo_schema_version, source, image_url, image_urls, status
)
select
  'aaaaaaaa-0000-4000-8000-000000000003',
  '11111111-1111-4111-8111-111111111111',
  'Web Electronics Roundtrip',
  899,
  c.name,
  c.id,
  s.id,
  '{"brand":"Dell","model":"U2723QE","has_warranty":true,"specifications":"27 inch monitor"}'::jsonb,
  'Sumqayıt',
  'Yeni',
  'new',
  'sell',
  'fixed',
  'pickup',
  'web create electronics',
  false,
  'in_stock',
  1,
  1,
  'codex-staging-roundtrip',
  'https://example.com/staging/web-electronics.jpg',
  array['https://example.com/staging/web-electronics.jpg'],
  'active'::public.listing_status
from public.categories c
join public.subcategories s on s.category_id = c.id and s.slug = 'monitorlar'
where c.slug = 'elektronika';
insert into public.listing_contacts (listing_id, contact_phone)
values ('aaaaaaaa-0000-4000-8000-000000000003', '+994501110003');
commit;

begin;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
update public.listings
set description = 'mobile edit electronics'
where id = 'aaaaaaaa-0000-4000-8000-000000000003'
  and user_id = '11111111-1111-4111-8111-111111111111';
commit;

-- Mobile create -> web read/edit: Automobile
begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
insert into public.listings (
  id, user_id, title, price, category, category_id, subcategory_id, attributes,
  city, condition, condition_code, listing_type, price_type, delivery_type,
  description, delivery_available, availability_status, contact_phone,
  form_schema_version, photo_schema_version, source, image_url, image_urls, status
)
select
  'bbbbbbbb-0000-4000-8000-000000000001',
  '22222222-2222-4222-8222-222222222222',
  'Mobile Auto Roundtrip',
  18400,
  c.name,
  c.id,
  s.id,
  '{"brand":"Hyundai","model":"Elantra","year":2020,"fuel_type":"benzin","transmission":"avtomat","body_type":"sedan"}'::jsonb,
  'Gəncə',
  'İşlənmiş',
  'good',
  'sell',
  'fixed',
  'pickup',
  'mobile create auto',
  false,
  'in_stock',
  '+994502220001',
  1,
  1,
  'codex-staging-roundtrip',
  'https://example.com/staging/mobile-auto.jpg',
  array['https://example.com/staging/mobile-auto.jpg'],
  'active'::public.listing_status
from public.categories c
join public.subcategories s on s.category_id = c.id and s.slug = 'avtomobiller'
where c.slug = 'avtomobil-ve-neqliyyat';
commit;

begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
update public.listings
set description = 'web edit auto', price = 18500
where id = 'bbbbbbbb-0000-4000-8000-000000000001'
  and user_id = '22222222-2222-4222-8222-222222222222';
commit;

-- Mobile create -> web read/edit: Phone
begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
insert into public.listings (
  id, user_id, title, price, category, category_id, subcategory_id, attributes,
  city, condition, condition_code, listing_type, price_type, delivery_type,
  description, delivery_available, availability_status, contact_phone,
  form_schema_version, photo_schema_version, source, image_url, image_urls, status
)
select
  'bbbbbbbb-0000-4000-8000-000000000002',
  '22222222-2222-4222-8222-222222222222',
  'Mobile Phone Roundtrip 1TB',
  2199,
  c.name,
  c.id,
  s.id,
  '{"brand":"Samsung","model":"Galaxy S25 Ultra","storage":"1TB","ram":"12GB","color":"Gümüş","has_warranty":true}'::jsonb,
  'Bakı',
  'Yeni',
  'new',
  'sell',
  'fixed',
  'both',
  'mobile create phone',
  true,
  'in_stock',
  '+994502220002',
  1,
  1,
  'codex-staging-roundtrip',
  'https://example.com/staging/mobile-phone.jpg',
  array['https://example.com/staging/mobile-phone.jpg'],
  'active'::public.listing_status
from public.categories c
join public.subcategories s on s.category_id = c.id and s.slug = 'smartfonlar'
where c.slug = 'telefon';
commit;

begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
update public.listings
set description = 'web edit phone'
where id = 'bbbbbbbb-0000-4000-8000-000000000002'
  and user_id = '22222222-2222-4222-8222-222222222222';
commit;

-- Mobile create -> web read/edit: Electronics
begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
insert into public.listings (
  id, user_id, title, price, category, category_id, subcategory_id, attributes,
  city, condition, condition_code, listing_type, price_type, delivery_type,
  description, delivery_available, availability_status, contact_phone,
  form_schema_version, photo_schema_version, source, image_url, image_urls, status
)
select
  'bbbbbbbb-0000-4000-8000-000000000003',
  '22222222-2222-4222-8222-222222222222',
  'Mobile Electronics Roundtrip',
  1499,
  c.name,
  c.id,
  s.id,
  '{"brand":"Sony","model":"WH-1000XM6","has_warranty":false,"specifications":"noise cancelling"}'::jsonb,
  'Bakı',
  'Yeni',
  'new',
  'sell',
  'fixed',
  'pickup',
  'mobile create electronics',
  false,
  'in_stock',
  '+994502220003',
  1,
  1,
  'codex-staging-roundtrip',
  'https://example.com/staging/mobile-electronics.jpg',
  array['https://example.com/staging/mobile-electronics.jpg'],
  'active'::public.listing_status
from public.categories c
join public.subcategories s on s.category_id = c.id and s.slug = 'qulaqliqlar'
where c.slug = 'elektronika';
commit;

begin;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
update public.listings
set description = 'web edit electronics'
where id = 'bbbbbbbb-0000-4000-8000-000000000003'
  and user_id = '22222222-2222-4222-8222-222222222222';
commit;

with roundtrip as (
  select
    l.*,
    c.slug as category_slug,
    s.slug as subcategory_slug,
    lc.contact_phone as private_contact_phone
  from public.listings l
  join public.categories c on c.id = l.category_id
  join public.subcategories s on s.id = l.subcategory_id
  left join public.listing_contacts lc on lc.listing_id = l.id
  where l.source = 'codex-staging-roundtrip'
),
summary as (
  select
    count(*)::int as listing_count,
    bool_and(status::text = 'pending') as all_pending,
    bool_and(form_schema_version = 1 and photo_schema_version = 1) as schema_versions_persist,
    bool_and(not (attributes ? 'condition')) as condition_not_duplicated,
    bool_and(category_id is not null and subcategory_id is not null) as real_category_fks,
    count(*) filter (where private_contact_phone is not null)::int as private_contact_count,
    count(*) filter (where contact_phone is null)::int as public_contact_null_count
  from roundtrip
),
direction_summary as (
  select jsonb_build_object(
    'web_to_mobile_rows', count(*) filter (where id::text like 'aaaaaaaa-%'),
    'web_to_mobile_edited_rows', count(*) filter (where id::text like 'aaaaaaaa-%' and description like 'mobile edit%'),
    'mobile_to_web_rows', count(*) filter (where id::text like 'bbbbbbbb-%'),
    'mobile_to_web_edited_rows', count(*) filter (where id::text like 'bbbbbbbb-%' and description like 'web edit%')
  ) as result
  from roundtrip
),
category_summary as (
  select jsonb_object_agg(category_slug, category_count order by category_slug) as result
  from (
    select category_slug, count(*)::int as category_count
    from roundtrip
    group by category_slug
  ) grouped
),
phone_summary as (
  select jsonb_build_object(
    'phone_rows', count(*),
    'storage_1tb_rows', count(*) filter (where attributes ->> 'storage' = '1TB'),
    'web_phone_ram_omitted', bool_or(id = 'aaaaaaaa-0000-4000-8000-000000000002' and not (attributes ? 'ram')),
    'mobile_phone_ram_present', bool_or(id = 'bbbbbbbb-0000-4000-8000-000000000002' and attributes ->> 'ram' = '12GB')
  ) as result
  from roundtrip
  where category_slug = 'telefon'
),
fk_summary as (
  select jsonb_build_object(
    'listings_with_auth_user', count(*)::int,
    'listings_with_valid_subcategory_parent', count(*) filter (where s.category_id = l.category_id)::int
  ) as result
  from public.listings l
  join auth.users u on u.id = l.user_id
  join public.subcategories s on s.id = l.subcategory_id
  where l.source = 'codex-staging-roundtrip'
)
select jsonb_build_object(
  'summary', (select to_jsonb(summary) from summary),
  'directions', (select result from direction_summary),
  'categories', (select result from category_summary),
  'phone', (select result from phone_summary),
  'fk', (select result from fk_summary),
  'rows', (
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'title', title,
      'status', status,
      'category_slug', category_slug,
      'subcategory_slug', subcategory_slug,
      'description', description,
      'storage', attributes ->> 'storage',
      'ram', attributes ->> 'ram',
      'form_schema_version', form_schema_version,
      'photo_schema_version', photo_schema_version,
      'listing_contact_private', private_contact_phone is not null,
      'listing_contact_public_null', contact_phone is null
    ) order by id)
    from roundtrip
  )
) as roundtrip_result;
