-- MarktX phone category schema v1 seed.
-- Prepared only. Do not run against production.
-- Reuses existing category slug telefon; does not migrate listings.
-- Rollback after apply: delete schema_version = 1 rows for this category from
-- public.category_form_schemas and public.category_photo_schemas, then manually
-- re-enable the previously approved active version if one existed.

begin;

with target_category as (
  select id
  from public.categories
  where slug = 'telefon'
  limit 1
),
form_seed(subcategory_slug, schema) as (
  values
  (null::text, $schema${
  "category_key": "phone",
  "category_slug": "telefon",
  "contract_version": 1,
  "fields": [
    {
      "destination": "attributes",
      "key": "brand",
      "label": "Marka",
      "option_source": "brands",
      "order": 10,
      "required": true,
      "type": "searchable_select"
    },
    {
      "allow_custom_value": true,
      "depends_on": "brand",
      "destination": "attributes",
      "key": "model",
      "label": "Model",
      "option_source": "models",
      "order": 20,
      "required": true,
      "type": "dependent_select"
    },
    {
      "destination": "attributes",
      "key": "storage",
      "label": "Yaddaş",
      "options": [
        {
          "label": "32GB",
          "value": "32GB"
        },
        {
          "label": "64GB",
          "value": "64GB"
        },
        {
          "label": "128GB",
          "value": "128GB"
        },
        {
          "label": "256GB",
          "value": "256GB"
        },
        {
          "label": "512GB",
          "value": "512GB"
        },
        {
          "label": "1TB",
          "value": "1TB"
        }
      ],
      "order": 30,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "ram",
      "label": "RAM",
      "options": [
        {
          "label": "2GB",
          "value": "2GB"
        },
        {
          "label": "3GB",
          "value": "3GB"
        },
        {
          "label": "4GB",
          "value": "4GB"
        },
        {
          "label": "6GB",
          "value": "6GB"
        },
        {
          "label": "8GB",
          "value": "8GB"
        },
        {
          "label": "12GB",
          "value": "12GB"
        },
        {
          "label": "16GB",
          "value": "16GB"
        }
      ],
      "order": 40,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "color",
      "label": "Rəng",
      "options": [
        {
          "label": "Qara",
          "value": "Qara"
        },
        {
          "label": "Ağ",
          "value": "Ağ"
        },
        {
          "label": "Boz",
          "value": "Boz"
        },
        {
          "label": "Gümüşü",
          "value": "Gümüşü"
        },
        {
          "label": "Göy",
          "value": "Göy"
        },
        {
          "label": "Qırmızı",
          "value": "Qırmızı"
        },
        {
          "label": "Yaşıl",
          "value": "Yaşıl"
        },
        {
          "label": "Qızılı",
          "value": "Qızılı"
        },
        {
          "label": "Bənövşəyi",
          "value": "Bənövşəyi"
        },
        {
          "label": "Çəhrayı",
          "value": "Çəhrayı"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 50,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "battery_health",
      "label": "Batareya sağlamlığı",
      "options": [
        {
          "label": "100%",
          "value": "100%"
        },
        {
          "label": "95-99%",
          "value": "95-99%"
        },
        {
          "label": "90-94%",
          "value": "90-94%"
        },
        {
          "label": "85-89%",
          "value": "85-89%"
        },
        {
          "label": "80-84%",
          "value": "80-84%"
        },
        {
          "label": "80%-dən aşağı",
          "value": "80%-dən aşağı"
        }
      ],
      "order": 55,
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
      "key": "accessories",
      "label": "Aksesuarlar",
      "options": [
        {
          "label": "Qutu",
          "value": "Qutu"
        },
        {
          "label": "Adapter",
          "value": "Adapter"
        },
        {
          "label": "Kabel",
          "value": "Kabel"
        },
        {
          "label": "Qulaqlıq",
          "value": "Qulaqlıq"
        },
        {
          "label": "Çexol",
          "value": "Çexol"
        },
        {
          "label": "Ekran qoruyucu",
          "value": "Ekran qoruyucu"
        },
        {
          "label": "Sənəd",
          "value": "Sənəd"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 70,
      "required": false,
      "type": "multi_select"
    }
  ],
  "requires_subcategory": false,
  "schema_version": 1,
  "subcategory_slugs": [
    "smartfonlar",
    "dymeli-telefonlar",
    "ev-ve-ofis-telefonlari",
    "radiotelefonlar",
    "peyk-telefonlari"
  ]
}
$schema$::jsonb)
),
deactivate_form as (
  update public.category_form_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'telefon'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_form_v1 as (
  delete from public.category_form_schemas
  where category_slug = 'telefon'
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
  'telefon',
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
  where slug = 'telefon'
  limit 1
),
photo_seed(subcategory_slug, schema) as (
  values
  (null::text, $schema${
  "category_key": "phone",
  "category_slug": "telefon",
  "contract_version": 1,
  "max_photos": 6,
  "schema_version": 1,
  "slots": [
    {
      "key": "front",
      "label": "Ön tərəf",
      "order": 10,
      "required": true
    },
    {
      "key": "back",
      "label": "Arxa tərəf",
      "order": 20,
      "required": true
    },
    {
      "key": "screen_on",
      "label": "Ekran açıq",
      "order": 30,
      "required": false
    },
    {
      "key": "accessories",
      "label": "Aksesuarlar",
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
    "smartfonlar",
    "dymeli-telefonlar",
    "ev-ve-ofis-telefonlari",
    "radiotelefonlar",
    "peyk-telefonlari"
  ]
}
$schema$::jsonb)
),
deactivate_photo as (
  update public.category_photo_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'telefon'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_photo_v1 as (
  delete from public.category_photo_schemas
  where category_slug = 'telefon'
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
  'telefon',
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
