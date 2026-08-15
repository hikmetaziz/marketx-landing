-- MarktX home_garden category schema v1 seed.
-- Prepared only. Do not run against production.
-- Reuses existing category slug ev-ve-bag; does not migrate listings.
-- Rollback after apply: delete schema_version = 1 rows for this category from
-- public.category_form_schemas and public.category_photo_schemas, then manually
-- re-enable the previously approved active version if one existed.

begin;

with target_category as (
  select id
  from public.categories
  where slug = 'ev-ve-bag'
  limit 1
),
form_seed(subcategory_slug, schema) as (
  values
  ('mebel', $schema${
  "category_key": "home_garden",
  "category_slug": "ev-ve-bag",
  "contract_version": 1,
  "fields": [
    {
      "destination": "attributes",
      "key": "furniture_type",
      "label": "Mebel növü",
      "options": [
        {
          "label": "Divan",
          "value": "Divan"
        },
        {
          "label": "Kreslo",
          "value": "Kreslo"
        },
        {
          "label": "Yataq",
          "value": "Yataq"
        },
        {
          "label": "Yataq dəsti",
          "value": "Yataq dəsti"
        },
        {
          "label": "Tumba",
          "value": "Tumba"
        },
        {
          "label": "Şkaf",
          "value": "Şkaf"
        },
        {
          "label": "Komod",
          "value": "Komod"
        },
        {
          "label": "Masa",
          "value": "Masa"
        },
        {
          "label": "Stol",
          "value": "Stol"
        },
        {
          "label": "Stul",
          "value": "Stul"
        },
        {
          "label": "TV stend",
          "value": "TV stend"
        },
        {
          "label": "Kitab rəfi",
          "value": "Kitab rəfi"
        },
        {
          "label": "Mətbəx mebeli",
          "value": "Mətbəx mebeli"
        },
        {
          "label": "Ofis mebeli",
          "value": "Ofis mebeli"
        },
        {
          "label": "Uşaq mebeli",
          "value": "Uşaq mebeli"
        },
        {
          "label": "Bağ mebeli",
          "value": "Bağ mebeli"
        },
        {
          "label": "Dəhliz mebeli",
          "value": "Dəhliz mebeli"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 10,
      "required": true,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "room",
      "label": "Otaq",
      "options": [
        {
          "label": "Qonaq otağı",
          "value": "Qonaq otağı"
        },
        {
          "label": "Yataq otağı",
          "value": "Yataq otağı"
        },
        {
          "label": "Mətbəx",
          "value": "Mətbəx"
        },
        {
          "label": "Uşaq otağı",
          "value": "Uşaq otağı"
        },
        {
          "label": "Ofis",
          "value": "Ofis"
        },
        {
          "label": "Dəhliz",
          "value": "Dəhliz"
        },
        {
          "label": "Hamam",
          "value": "Hamam"
        },
        {
          "label": "Bağ",
          "value": "Bağ"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 20,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "material",
      "label": "Material",
      "options": [
        {
          "label": "Taxta",
          "value": "Taxta"
        },
        {
          "label": "MDF",
          "value": "MDF"
        },
        {
          "label": "DSP",
          "value": "DSP"
        },
        {
          "label": "Metal",
          "value": "Metal"
        },
        {
          "label": "Şüşə",
          "value": "Şüşə"
        },
        {
          "label": "Dəri",
          "value": "Dəri"
        },
        {
          "label": "Parça",
          "value": "Parça"
        },
        {
          "label": "Rattan",
          "value": "Rattan"
        },
        {
          "label": "Plastik",
          "value": "Plastik"
        },
        {
          "label": "Qarışıq",
          "value": "Qarışıq"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 30,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "has_warranty",
      "label": "Zəmanət var",
      "order": 60,
      "required": false,
      "type": "boolean"
    },
    {
      "destination": "attributes",
      "key": "delivery_available",
      "label": "Çatdırılma var",
      "order": 70,
      "required": false,
      "type": "boolean"
    },
    {
      "destination": "attributes",
      "key": "dimensions",
      "label": "Ölçülər",
      "order": 80,
      "required": false,
      "type": "searchable_text",
      "validation": {
        "maxLength": 80
      }
    }
  ],
  "requires_subcategory": true,
  "schema_version": 1,
  "subcategory_slugs": [
    "mebel"
  ]
}
$schema$::jsonb)
),
deactivate_form as (
  update public.category_form_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'ev-ve-bag'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_form_v1 as (
  delete from public.category_form_schemas
  where category_slug = 'ev-ve-bag'
    and schema_version = 1
  returning id
)
insert into public.category_form_schemas (
  category_id,
  subcategory_id,
  category_slug,
  subcategory_slug,
  schema_version,
  schema,
  is_active
)
select
  target_category.id,
  target_subcategory.id,
  'ev-ve-bag',
  form_seed.subcategory_slug,
  1,
  form_seed.schema,
  true
from target_category
cross join form_seed
left join public.subcategories target_subcategory
  on target_subcategory.category_id = target_category.id
  and target_subcategory.slug = form_seed.subcategory_slug
where form_seed.subcategory_slug is null or target_subcategory.id is not null;

with target_category as (
  select id
  from public.categories
  where slug = 'ev-ve-bag'
  limit 1
),
photo_seed(subcategory_slug, schema) as (
  values
  ('mebel', $schema${
  "category_key": "home_garden",
  "category_slug": "ev-ve-bag",
  "contract_version": 1,
  "max_photos": 8,
  "schema_version": 1,
  "slots": [
    {
      "key": "front",
      "label": "Ön görünüş",
      "order": 10,
      "required": true
    },
    {
      "key": "side",
      "label": "Yan görünüş",
      "order": 20,
      "required": false
    },
    {
      "key": "detail",
      "label": "Material / detal",
      "order": 30,
      "required": false
    },
    {
      "key": "defects",
      "label": "Qüsurlar",
      "order": 40,
      "required": false
    },
    {
      "key": "gallery",
      "label": "Əlavə şəkillər",
      "order": 50,
      "required": false
    }
  ],
  "subcategory_slugs": [
    "mebel"
  ]
}
$schema$::jsonb)
),
deactivate_photo as (
  update public.category_photo_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'ev-ve-bag'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_photo_v1 as (
  delete from public.category_photo_schemas
  where category_slug = 'ev-ve-bag'
    and schema_version = 1
  returning id
)
insert into public.category_photo_schemas (
  category_id,
  subcategory_id,
  category_slug,
  subcategory_slug,
  schema_version,
  schema,
  is_active
)
select
  target_category.id,
  target_subcategory.id,
  'ev-ve-bag',
  photo_seed.subcategory_slug,
  1,
  photo_seed.schema,
  true
from target_category
cross join photo_seed
left join public.subcategories target_subcategory
  on target_subcategory.category_id = target_category.id
  and target_subcategory.slug = photo_seed.subcategory_slug
where photo_seed.subcategory_slug is null or target_subcategory.id is not null;

commit;
