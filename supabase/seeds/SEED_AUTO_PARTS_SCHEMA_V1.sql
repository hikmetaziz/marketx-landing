-- MarktX auto_parts category schema v1 seed.
-- Prepared only. Do not run against production.
-- Reuses existing category slug avto-ehtiyat-hisseleri-ve-avadanliq; does not migrate listings.
-- Rollback after apply: delete schema_version = 1 rows for this category from
-- public.category_form_schemas and public.category_photo_schemas, then manually
-- re-enable the previously approved active version if one existed.

begin;

with target_category as (
  select id
  from public.categories
  where slug = 'avto-ehtiyat-hisseleri-ve-avadanliq'
  limit 1
),
form_seed(subcategory_slug, schema) as (
  values
  (null::text, $schema${
  "category_key": "auto_parts",
  "category_slug": "avto-ehtiyat-hisseleri-ve-avadanliq",
  "contract_version": 1,
  "fields": [
    {
      "destination": "attributes",
      "key": "compatible_brand",
      "label": "Uyğun marka",
      "option_source": "brands",
      "order": 10,
      "required": false,
      "type": "searchable_select"
    },
    {
      "allow_custom_value": true,
      "depends_on": "compatible_brand",
      "destination": "attributes",
      "key": "compatible_model",
      "label": "Uyğun model",
      "option_source": "models",
      "order": 20,
      "required": false,
      "type": "dependent_select"
    },
    {
      "destination": "attributes",
      "key": "manufacturer_brand",
      "label": "İstehsalçı marka",
      "order": 30,
      "required": false,
      "type": "searchable_text",
      "validation": {
        "maxLength": 80
      }
    },
    {
      "destination": "attributes",
      "key": "part_number",
      "label": "OEM / detal kodu",
      "order": 40,
      "required": false,
      "type": "searchable_text",
      "validation": {
        "maxLength": 80
      }
    },
    {
      "destination": "attributes",
      "key": "placement",
      "label": "Tərəf / mövqe",
      "options": [
        {
          "label": "Ön",
          "value": "Ön"
        },
        {
          "label": "Arxa",
          "value": "Arxa"
        },
        {
          "label": "Sol",
          "value": "Sol"
        },
        {
          "label": "Sağ",
          "value": "Sağ"
        },
        {
          "label": "Ön sol",
          "value": "Ön sol"
        },
        {
          "label": "Ön sağ",
          "value": "Ön sağ"
        },
        {
          "label": "Arxa sol",
          "value": "Arxa sol"
        },
        {
          "label": "Arxa sağ",
          "value": "Arxa sağ"
        },
        {
          "label": "Universal",
          "value": "Universal"
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
      "key": "size",
      "label": "Ölçü",
      "order": 60,
      "required": false,
      "type": "searchable_text",
      "validation": {
        "maxLength": 80
      }
    },
    {
      "destination": "attributes",
      "key": "has_warranty",
      "label": "Zəmanət var",
      "order": 70,
      "required": false,
      "type": "boolean"
    }
  ],
  "requires_subcategory": true,
  "schema_version": 1,
  "subcategory_slugs": [
    "muherrik-ve-hisseleri",
    "transmissiya-ve-suretler-qutusu",
    "kuzov-hisseleri",
    "optika-ve-isiqlandirma",
    "asqi-ve-sukan-sistemi",
    "eylec-sistemi",
    "elektrik-ve-alisdirma-hisseleri",
    "yanacaq-ve-egzoz-sistemi",
    "sinler",
    "diskler",
    "akkumulyatorlar",
    "yaglar-mayeler-ve-avtokimya",
    "salon-aksesuarlari",
    "xarici-aksesuarlar",
    "avtoelektronika-ve-multimedia",
    "servis-ve-diaqnostika-avadanligi"
  ]
}
$schema$::jsonb)
),
deactivate_form as (
  update public.category_form_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'avto-ehtiyat-hisseleri-ve-avadanliq'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_form_v1 as (
  delete from public.category_form_schemas
  where category_slug = 'avto-ehtiyat-hisseleri-ve-avadanliq'
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
  'avto-ehtiyat-hisseleri-ve-avadanliq',
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
  where slug = 'avto-ehtiyat-hisseleri-ve-avadanliq'
  limit 1
),
photo_seed(subcategory_slug, schema) as (
  values
  (null::text, $schema${
  "category_key": "auto_parts",
  "category_slug": "avto-ehtiyat-hisseleri-ve-avadanliq",
  "contract_version": 1,
  "max_photos": 8,
  "schema_version": 1,
  "slots": [
    {
      "key": "front",
      "label": "Əsas görünüş",
      "order": 10,
      "required": true
    },
    {
      "key": "label_or_code",
      "label": "Etiket / detal kodu",
      "order": 20,
      "required": false
    },
    {
      "key": "compatibility",
      "label": "Uyğunluq işarəsi",
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
    "muherrik-ve-hisseleri",
    "transmissiya-ve-suretler-qutusu",
    "kuzov-hisseleri",
    "optika-ve-isiqlandirma",
    "asqi-ve-sukan-sistemi",
    "eylec-sistemi",
    "elektrik-ve-alisdirma-hisseleri",
    "yanacaq-ve-egzoz-sistemi",
    "sinler",
    "diskler",
    "akkumulyatorlar",
    "yaglar-mayeler-ve-avtokimya",
    "salon-aksesuarlari",
    "xarici-aksesuarlar",
    "avtoelektronika-ve-multimedia",
    "servis-ve-diaqnostika-avadanligi"
  ]
}
$schema$::jsonb)
),
deactivate_photo as (
  update public.category_photo_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'avto-ehtiyat-hisseleri-ve-avadanliq'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_photo_v1 as (
  delete from public.category_photo_schemas
  where category_slug = 'avto-ehtiyat-hisseleri-ve-avadanliq'
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
  'avto-ehtiyat-hisseleri-ve-avadanliq',
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
