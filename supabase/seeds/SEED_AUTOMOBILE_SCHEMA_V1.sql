-- MarktX automobile category schema v1 seed.
-- Prepared only. Do not run against production.
-- Reuses existing category slug avtomobil-ve-neqliyyat; does not migrate listings.
-- Rollback after apply: delete schema_version = 1 rows for this category from
-- public.category_form_schemas and public.category_photo_schemas, then manually
-- re-enable the previously approved active version if one existed.

begin;

with target_category as (
  select id
  from public.categories
  where slug = 'avtomobil-ve-neqliyyat'
  limit 1
),
form_seed(subcategory_slug, schema) as (
  values
  ('avtomobiller', $schema${
  "category_key": "automobile",
  "category_slug": "avtomobil-ve-neqliyyat",
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
      "key": "year",
      "label": "Buraxılış ili",
      "order": 30,
      "required": true,
      "type": "number",
      "validation": {
        "max": 2027,
        "min": 1900
      }
    },
    {
      "destination": "attributes",
      "key": "mileage",
      "label": "Yürüş",
      "order": 40,
      "required": false,
      "type": "number",
      "validation": {
        "max": 2000000,
        "min": 0
      }
    },
    {
      "destination": "attributes",
      "key": "fuel_type",
      "label": "Yanacaq növü",
      "options": [
        {
          "label": "Benzin",
          "value": "Benzin"
        },
        {
          "label": "Dizel",
          "value": "Dizel"
        },
        {
          "label": "Hibrid",
          "value": "Hibrid"
        },
        {
          "label": "Elektrik",
          "value": "Elektrik"
        },
        {
          "label": "Qaz",
          "value": "Qaz"
        }
      ],
      "order": 50,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "transmission",
      "label": "Sürətlər qutusu",
      "options": [
        {
          "label": "Avtomat",
          "value": "Avtomat"
        },
        {
          "label": "Mexaniki",
          "value": "Mexaniki"
        },
        {
          "label": "Robot",
          "value": "Robot"
        },
        {
          "label": "Variator",
          "value": "Variator"
        }
      ],
      "order": 60,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "body_type",
      "label": "Ban növü",
      "options": [
        {
          "label": "Sedan",
          "value": "Sedan"
        },
        {
          "label": "Hetçbek",
          "value": "Hetçbek"
        },
        {
          "label": "Universal",
          "value": "Universal"
        },
        {
          "label": "Kupe",
          "value": "Kupe"
        },
        {
          "label": "Krossover",
          "value": "Krossover"
        },
        {
          "label": "SUV",
          "value": "SUV"
        },
        {
          "label": "Minivan",
          "value": "Minivan"
        },
        {
          "label": "Pikap",
          "value": "Pikap"
        }
      ],
      "order": 70,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "engine",
      "label": "Mühərrik",
      "options": [
        {
          "label": "0.8 L",
          "value": "0.8 L"
        },
        {
          "label": "1.0 L",
          "value": "1.0 L"
        },
        {
          "label": "1.2 L",
          "value": "1.2 L"
        },
        {
          "label": "1.4 L",
          "value": "1.4 L"
        },
        {
          "label": "1.5 L",
          "value": "1.5 L"
        },
        {
          "label": "1.6 L",
          "value": "1.6 L"
        },
        {
          "label": "1.8 L",
          "value": "1.8 L"
        },
        {
          "label": "2.0 L",
          "value": "2.0 L"
        },
        {
          "label": "2.2 L",
          "value": "2.2 L"
        },
        {
          "label": "2.4 L",
          "value": "2.4 L"
        },
        {
          "label": "2.5 L",
          "value": "2.5 L"
        },
        {
          "label": "3.0 L",
          "value": "3.0 L"
        },
        {
          "label": "3.5 L",
          "value": "3.5 L"
        },
        {
          "label": "4.0 L+",
          "value": "4.0 L+"
        },
        {
          "label": "Elektrik",
          "value": "Elektrik"
        }
      ],
      "order": 80,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "drivetrain",
      "label": "Ötürücü",
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
          "label": "Tam",
          "value": "Tam"
        },
        {
          "label": "4x4",
          "value": "4x4"
        }
      ],
      "order": 90,
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
          "label": "Qəhvəyi",
          "value": "Qəhvəyi"
        },
        {
          "label": "Bej",
          "value": "Bej"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 100,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "seats",
      "label": "Oturacaq sayı",
      "options": [
        {
          "label": "2",
          "value": "2"
        },
        {
          "label": "4",
          "value": "4"
        },
        {
          "label": "5",
          "value": "5"
        },
        {
          "label": "6",
          "value": "6"
        },
        {
          "label": "7",
          "value": "7"
        },
        {
          "label": "8+",
          "value": "8+"
        }
      ],
      "order": 110,
      "required": false,
      "type": "select"
    }
  ],
  "requires_subcategory": false,
  "schema_version": 1,
  "subcategory_slugs": [
    "avtomobiller"
  ]
}
$schema$::jsonb)
),
deactivate_form as (
  update public.category_form_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'avtomobil-ve-neqliyyat'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_form_v1 as (
  delete from public.category_form_schemas
  where category_slug = 'avtomobil-ve-neqliyyat'
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
  'avtomobil-ve-neqliyyat',
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
  where slug = 'avtomobil-ve-neqliyyat'
  limit 1
),
photo_seed(subcategory_slug, schema) as (
  values
  ('avtomobiller', $schema${
  "category_key": "automobile",
  "category_slug": "avtomobil-ve-neqliyyat",
  "contract_version": 1,
  "max_photos": 15,
  "schema_version": 1,
  "slots": [
    {
      "key": "front",
      "label": "Ön görünüş",
      "order": 10,
      "required": true
    },
    {
      "key": "rear",
      "label": "Arxa görünüş",
      "order": 20,
      "required": true
    },
    {
      "key": "left_side",
      "label": "Sol yan",
      "order": 30,
      "required": false
    },
    {
      "key": "right_side",
      "label": "Sağ yan",
      "order": 40,
      "required": false
    },
    {
      "key": "interior",
      "label": "Salon",
      "order": 50,
      "required": true
    },
    {
      "key": "dashboard",
      "label": "Panel",
      "order": 60,
      "required": false
    },
    {
      "key": "engine_bay",
      "label": "Mühərrik bölməsi",
      "order": 70,
      "required": false
    },
    {
      "key": "odometer",
      "label": "Yürüş göstəricisi",
      "order": 80,
      "required": false
    },
    {
      "key": "gallery",
      "label": "Əlavə şəkillər",
      "order": 90,
      "required": false
    }
  ],
  "subcategory_slugs": [
    "avtomobiller"
  ]
}
$schema$::jsonb)
),
deactivate_photo as (
  update public.category_photo_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'avtomobil-ve-neqliyyat'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_photo_v1 as (
  delete from public.category_photo_schemas
  where category_slug = 'avtomobil-ve-neqliyyat'
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
  'avtomobil-ve-neqliyyat',
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
