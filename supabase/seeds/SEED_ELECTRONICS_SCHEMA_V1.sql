-- MarktX electronics category schema v1 seed.
-- Prepared only. Do not run against production.
-- Reuses existing category slug elektronika; does not migrate listings.
-- Rollback after apply: delete schema_version = 1 rows for this category from
-- public.category_form_schemas and public.category_photo_schemas, then manually
-- re-enable the previously approved active version if one existed.

begin;

with target_category as (
  select id
  from public.categories
  where slug = 'elektronika'
  limit 1
),
form_seed(subcategory_slug, schema) as (
  values
  ('masaustu-komputerler', $schema${
  "category_key": "electronics",
  "category_slug": "elektronika",
  "contract_version": 1,
  "fields": [
    {
      "depends_on": "subcategory",
      "destination": "attributes",
      "key": "brand",
      "label": "Marka",
      "option_source": "brands",
      "order": 10,
      "required": true,
      "type": "searchable_select"
    },
    {
      "destination": "attributes",
      "key": "model",
      "label": "Model",
      "order": 20,
      "required": true,
      "type": "searchable_text",
      "validation": {
        "maxLength": 120
      }
    },
    {
      "destination": "attributes",
      "key": "processor",
      "label": "Prosessor",
      "options": [
        {
          "label": "Intel Core i3",
          "value": "Intel Core i3"
        },
        {
          "label": "Intel Core i5",
          "value": "Intel Core i5"
        },
        {
          "label": "Intel Core i7",
          "value": "Intel Core i7"
        },
        {
          "label": "Intel Core i9",
          "value": "Intel Core i9"
        },
        {
          "label": "Intel Xeon",
          "value": "Intel Xeon"
        },
        {
          "label": "AMD Ryzen 3",
          "value": "AMD Ryzen 3"
        },
        {
          "label": "AMD Ryzen 5",
          "value": "AMD Ryzen 5"
        },
        {
          "label": "AMD Ryzen 7",
          "value": "AMD Ryzen 7"
        },
        {
          "label": "AMD Ryzen 9",
          "value": "AMD Ryzen 9"
        },
        {
          "label": "Apple M1",
          "value": "Apple M1"
        },
        {
          "label": "Apple M2",
          "value": "Apple M2"
        },
        {
          "label": "Apple M3",
          "value": "Apple M3"
        },
        {
          "label": "Apple M4",
          "value": "Apple M4"
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
      "key": "ram",
      "label": "RAM",
      "options": [
        {
          "label": "4GB",
          "value": "4GB"
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
        },
        {
          "label": "24GB",
          "value": "24GB"
        },
        {
          "label": "32GB",
          "value": "32GB"
        },
        {
          "label": "48GB",
          "value": "48GB"
        },
        {
          "label": "64GB",
          "value": "64GB"
        },
        {
          "label": "96GB",
          "value": "96GB"
        },
        {
          "label": "128GB",
          "value": "128GB"
        },
        {
          "label": "256GB",
          "value": "256GB"
        }
      ],
      "order": 40,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "storage",
      "label": "Yaddaş",
      "options": [
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
        },
        {
          "label": "2TB",
          "value": "2TB"
        },
        {
          "label": "4TB",
          "value": "4TB"
        },
        {
          "label": "8TB",
          "value": "8TB"
        }
      ],
      "order": 50,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "graphics_card",
      "label": "Videokart",
      "options": [
        {
          "label": "Integrated",
          "value": "Integrated"
        },
        {
          "label": "Intel UHD",
          "value": "Intel UHD"
        },
        {
          "label": "Intel Iris Xe",
          "value": "Intel Iris Xe"
        },
        {
          "label": "AMD Radeon Integrated",
          "value": "AMD Radeon Integrated"
        },
        {
          "label": "NVIDIA GeForce GTX",
          "value": "NVIDIA GeForce GTX"
        },
        {
          "label": "NVIDIA GeForce RTX 20 Series",
          "value": "NVIDIA GeForce RTX 20 Series"
        },
        {
          "label": "NVIDIA GeForce RTX 30 Series",
          "value": "NVIDIA GeForce RTX 30 Series"
        },
        {
          "label": "NVIDIA GeForce RTX 40 Series",
          "value": "NVIDIA GeForce RTX 40 Series"
        },
        {
          "label": "AMD Radeon RX",
          "value": "AMD Radeon RX"
        },
        {
          "label": "Apple M-series GPU",
          "value": "Apple M-series GPU"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 60,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "operating_system",
      "label": "Əməliyyat sistemi",
      "options": [
        {
          "label": "Windows 10",
          "value": "Windows 10"
        },
        {
          "label": "Windows 11",
          "value": "Windows 11"
        },
        {
          "label": "macOS",
          "value": "macOS"
        },
        {
          "label": "Linux",
          "value": "Linux"
        },
        {
          "label": "ChromeOS",
          "value": "ChromeOS"
        },
        {
          "label": "FreeDOS",
          "value": "FreeDOS"
        },
        {
          "label": "ƏS yoxdur",
          "value": "ƏS yoxdur"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 70,
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
      "order": 80,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "has_warranty",
      "label": "Zəmanət var",
      "order": 90,
      "required": false,
      "type": "boolean"
    },
    {
      "destination": "attributes",
      "key": "box_included",
      "label": "Qutu var",
      "order": 100,
      "required": false,
      "type": "boolean"
    }
  ],
  "requires_subcategory": true,
  "schema_version": 1,
  "subcategory_slugs": [
    "masaustu-komputerler"
  ]
}
$schema$::jsonb),
  ('noutbuklar', $schema${
  "category_key": "electronics",
  "category_slug": "elektronika",
  "contract_version": 1,
  "fields": [
    {
      "depends_on": "subcategory",
      "destination": "attributes",
      "key": "brand",
      "label": "Marka",
      "option_source": "brands",
      "order": 10,
      "required": true,
      "type": "searchable_select"
    },
    {
      "destination": "attributes",
      "key": "model",
      "label": "Model",
      "order": 20,
      "required": true,
      "type": "searchable_text",
      "validation": {
        "maxLength": 120
      }
    },
    {
      "destination": "attributes",
      "key": "processor",
      "label": "Prosessor",
      "options": [
        {
          "label": "Intel Core i3",
          "value": "Intel Core i3"
        },
        {
          "label": "Intel Core i5",
          "value": "Intel Core i5"
        },
        {
          "label": "Intel Core i7",
          "value": "Intel Core i7"
        },
        {
          "label": "Intel Core i9",
          "value": "Intel Core i9"
        },
        {
          "label": "Intel Xeon",
          "value": "Intel Xeon"
        },
        {
          "label": "AMD Ryzen 3",
          "value": "AMD Ryzen 3"
        },
        {
          "label": "AMD Ryzen 5",
          "value": "AMD Ryzen 5"
        },
        {
          "label": "AMD Ryzen 7",
          "value": "AMD Ryzen 7"
        },
        {
          "label": "AMD Ryzen 9",
          "value": "AMD Ryzen 9"
        },
        {
          "label": "Apple M1",
          "value": "Apple M1"
        },
        {
          "label": "Apple M2",
          "value": "Apple M2"
        },
        {
          "label": "Apple M3",
          "value": "Apple M3"
        },
        {
          "label": "Apple M4",
          "value": "Apple M4"
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
      "key": "ram",
      "label": "RAM",
      "options": [
        {
          "label": "4GB",
          "value": "4GB"
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
        },
        {
          "label": "24GB",
          "value": "24GB"
        },
        {
          "label": "32GB",
          "value": "32GB"
        },
        {
          "label": "48GB",
          "value": "48GB"
        },
        {
          "label": "64GB",
          "value": "64GB"
        },
        {
          "label": "96GB",
          "value": "96GB"
        },
        {
          "label": "128GB",
          "value": "128GB"
        },
        {
          "label": "256GB",
          "value": "256GB"
        }
      ],
      "order": 40,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "storage",
      "label": "Yaddaş",
      "options": [
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
        },
        {
          "label": "2TB",
          "value": "2TB"
        },
        {
          "label": "4TB",
          "value": "4TB"
        },
        {
          "label": "8TB",
          "value": "8TB"
        }
      ],
      "order": 50,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "graphics_card",
      "label": "Videokart",
      "options": [
        {
          "label": "Integrated",
          "value": "Integrated"
        },
        {
          "label": "Intel UHD",
          "value": "Intel UHD"
        },
        {
          "label": "Intel Iris Xe",
          "value": "Intel Iris Xe"
        },
        {
          "label": "AMD Radeon Integrated",
          "value": "AMD Radeon Integrated"
        },
        {
          "label": "NVIDIA GeForce GTX",
          "value": "NVIDIA GeForce GTX"
        },
        {
          "label": "NVIDIA GeForce RTX 20 Series",
          "value": "NVIDIA GeForce RTX 20 Series"
        },
        {
          "label": "NVIDIA GeForce RTX 30 Series",
          "value": "NVIDIA GeForce RTX 30 Series"
        },
        {
          "label": "NVIDIA GeForce RTX 40 Series",
          "value": "NVIDIA GeForce RTX 40 Series"
        },
        {
          "label": "AMD Radeon RX",
          "value": "AMD Radeon RX"
        },
        {
          "label": "Apple M-series GPU",
          "value": "Apple M-series GPU"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 60,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "screen_size",
      "label": "Ekran ölçüsü",
      "options": [
        {
          "label": "11\"",
          "value": "11\""
        },
        {
          "label": "12\"",
          "value": "12\""
        },
        {
          "label": "13\"",
          "value": "13\""
        },
        {
          "label": "14\"",
          "value": "14\""
        },
        {
          "label": "15\"",
          "value": "15\""
        },
        {
          "label": "15.6\"",
          "value": "15.6\""
        },
        {
          "label": "16\"",
          "value": "16\""
        },
        {
          "label": "17\"",
          "value": "17\""
        },
        {
          "label": "18\"",
          "value": "18\""
        },
        {
          "label": "21.5\"",
          "value": "21.5\""
        },
        {
          "label": "24\"",
          "value": "24\""
        },
        {
          "label": "27\"",
          "value": "27\""
        },
        {
          "label": "32\"",
          "value": "32\""
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 70,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "battery_health",
      "label": "Batareya sağlamlığı (%)",
      "order": 80,
      "required": false,
      "type": "number",
      "validation": {
        "max": 100,
        "min": 0
      }
    },
    {
      "destination": "attributes",
      "key": "operating_system",
      "label": "Əməliyyat sistemi",
      "options": [
        {
          "label": "Windows 10",
          "value": "Windows 10"
        },
        {
          "label": "Windows 11",
          "value": "Windows 11"
        },
        {
          "label": "macOS",
          "value": "macOS"
        },
        {
          "label": "Linux",
          "value": "Linux"
        },
        {
          "label": "ChromeOS",
          "value": "ChromeOS"
        },
        {
          "label": "FreeDOS",
          "value": "FreeDOS"
        },
        {
          "label": "ƏS yoxdur",
          "value": "ƏS yoxdur"
        },
        {
          "label": "Digər",
          "value": "Digər"
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
      "order": 100,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "has_warranty",
      "label": "Zəmanət var",
      "order": 110,
      "required": false,
      "type": "boolean"
    },
    {
      "destination": "attributes",
      "key": "charger_included",
      "label": "Adapter var",
      "order": 120,
      "required": false,
      "type": "boolean"
    },
    {
      "destination": "attributes",
      "key": "box_included",
      "label": "Qutu var",
      "order": 130,
      "required": false,
      "type": "boolean"
    }
  ],
  "requires_subcategory": true,
  "schema_version": 1,
  "subcategory_slugs": [
    "noutbuklar"
  ]
}
$schema$::jsonb),
  ('monobloklar', $schema${
  "category_key": "electronics",
  "category_slug": "elektronika",
  "contract_version": 1,
  "fields": [
    {
      "depends_on": "subcategory",
      "destination": "attributes",
      "key": "brand",
      "label": "Marka",
      "option_source": "brands",
      "order": 10,
      "required": true,
      "type": "searchable_select"
    },
    {
      "destination": "attributes",
      "key": "model",
      "label": "Model",
      "order": 20,
      "required": true,
      "type": "searchable_text",
      "validation": {
        "maxLength": 120
      }
    },
    {
      "destination": "attributes",
      "key": "processor",
      "label": "Prosessor",
      "options": [
        {
          "label": "Intel Core i3",
          "value": "Intel Core i3"
        },
        {
          "label": "Intel Core i5",
          "value": "Intel Core i5"
        },
        {
          "label": "Intel Core i7",
          "value": "Intel Core i7"
        },
        {
          "label": "Intel Core i9",
          "value": "Intel Core i9"
        },
        {
          "label": "Intel Xeon",
          "value": "Intel Xeon"
        },
        {
          "label": "AMD Ryzen 3",
          "value": "AMD Ryzen 3"
        },
        {
          "label": "AMD Ryzen 5",
          "value": "AMD Ryzen 5"
        },
        {
          "label": "AMD Ryzen 7",
          "value": "AMD Ryzen 7"
        },
        {
          "label": "AMD Ryzen 9",
          "value": "AMD Ryzen 9"
        },
        {
          "label": "Apple M1",
          "value": "Apple M1"
        },
        {
          "label": "Apple M2",
          "value": "Apple M2"
        },
        {
          "label": "Apple M3",
          "value": "Apple M3"
        },
        {
          "label": "Apple M4",
          "value": "Apple M4"
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
      "key": "ram",
      "label": "RAM",
      "options": [
        {
          "label": "4GB",
          "value": "4GB"
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
        },
        {
          "label": "24GB",
          "value": "24GB"
        },
        {
          "label": "32GB",
          "value": "32GB"
        },
        {
          "label": "48GB",
          "value": "48GB"
        },
        {
          "label": "64GB",
          "value": "64GB"
        },
        {
          "label": "96GB",
          "value": "96GB"
        },
        {
          "label": "128GB",
          "value": "128GB"
        },
        {
          "label": "256GB",
          "value": "256GB"
        }
      ],
      "order": 40,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "storage",
      "label": "Yaddaş",
      "options": [
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
        },
        {
          "label": "2TB",
          "value": "2TB"
        },
        {
          "label": "4TB",
          "value": "4TB"
        },
        {
          "label": "8TB",
          "value": "8TB"
        }
      ],
      "order": 50,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "screen_size",
      "label": "Ekran ölçüsü",
      "options": [
        {
          "label": "11\"",
          "value": "11\""
        },
        {
          "label": "12\"",
          "value": "12\""
        },
        {
          "label": "13\"",
          "value": "13\""
        },
        {
          "label": "14\"",
          "value": "14\""
        },
        {
          "label": "15\"",
          "value": "15\""
        },
        {
          "label": "15.6\"",
          "value": "15.6\""
        },
        {
          "label": "16\"",
          "value": "16\""
        },
        {
          "label": "17\"",
          "value": "17\""
        },
        {
          "label": "18\"",
          "value": "18\""
        },
        {
          "label": "21.5\"",
          "value": "21.5\""
        },
        {
          "label": "24\"",
          "value": "24\""
        },
        {
          "label": "27\"",
          "value": "27\""
        },
        {
          "label": "32\"",
          "value": "32\""
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 60,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "touchscreen",
      "label": "Sensor ekran",
      "order": 70,
      "required": false,
      "type": "boolean"
    },
    {
      "destination": "attributes",
      "key": "graphics_card",
      "label": "Videokart",
      "options": [
        {
          "label": "Integrated",
          "value": "Integrated"
        },
        {
          "label": "Intel UHD",
          "value": "Intel UHD"
        },
        {
          "label": "Intel Iris Xe",
          "value": "Intel Iris Xe"
        },
        {
          "label": "AMD Radeon Integrated",
          "value": "AMD Radeon Integrated"
        },
        {
          "label": "NVIDIA GeForce GTX",
          "value": "NVIDIA GeForce GTX"
        },
        {
          "label": "NVIDIA GeForce RTX 20 Series",
          "value": "NVIDIA GeForce RTX 20 Series"
        },
        {
          "label": "NVIDIA GeForce RTX 30 Series",
          "value": "NVIDIA GeForce RTX 30 Series"
        },
        {
          "label": "NVIDIA GeForce RTX 40 Series",
          "value": "NVIDIA GeForce RTX 40 Series"
        },
        {
          "label": "AMD Radeon RX",
          "value": "AMD Radeon RX"
        },
        {
          "label": "Apple M-series GPU",
          "value": "Apple M-series GPU"
        },
        {
          "label": "Digər",
          "value": "Digər"
        }
      ],
      "order": 80,
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
      "order": 90,
      "required": false,
      "type": "select"
    },
    {
      "destination": "attributes",
      "key": "has_warranty",
      "label": "Zəmanət var",
      "order": 100,
      "required": false,
      "type": "boolean"
    }
  ],
  "requires_subcategory": true,
  "schema_version": 1,
  "subcategory_slugs": [
    "monobloklar"
  ]
}
$schema$::jsonb),
  (null::text, $schema${
  "category_key": "electronics",
  "category_slug": "elektronika",
  "contract_version": 1,
  "fields": [
    {
      "depends_on": "subcategory",
      "destination": "attributes",
      "key": "brand",
      "label": "Marka",
      "option_source": "brands",
      "order": 10,
      "required": false,
      "type": "searchable_select"
    },
    {
      "destination": "attributes",
      "key": "model",
      "label": "Model",
      "order": 20,
      "required": false,
      "type": "searchable_text",
      "validation": {
        "maxLength": 120
      }
    },
    {
      "destination": "attributes",
      "key": "has_warranty",
      "label": "Zəmanət var",
      "order": 30,
      "required": false,
      "type": "boolean"
    },
    {
      "destination": "attributes",
      "key": "specifications",
      "label": "Texniki xüsusiyyətlər",
      "order": 40,
      "required": false,
      "type": "textarea",
      "validation": {
        "maxLength": 1000
      }
    }
  ],
  "requires_subcategory": true,
  "schema_version": 1,
  "subcategory_slugs": [
    "planshetler",
    "elektron-kitablar",
    "monitorlar",
    "prosessorlar",
    "ana-platalar",
    "videokartlar",
    "operativ-yaddas-ram",
    "ssd-hdd-ve-yaddas-qurgulari",
    "korpus-qida-bloku-ve-soyutma",
    "komputer-periferiyasi",
    "printerler-ve-skanerler",
    "sebeke-avadanligi",
    "televizorlar",
    "proyektorlar",
    "tv-box-ve-media-pleyerler",
    "peyk-ve-tv-avadanligi",
    "qulaqliqlar",
    "portativ-dinamikler",
    "ev-audio-sistemleri",
    "mikrofon-ve-audio-interfeysler",
    "oyun-konsollari",
    "oyun-aksesuarlari",
    "foto-ve-videokameralar",
    "obyektiv-ve-foto-video-aksesuarlari",
    "smart-saat-ve-wearable-cihazlar",
    "agilli-ve-tehlukesizlik-sistemleri",
    "dronlar-ve-aksesuarlar"
  ]
}
$schema$::jsonb)
),
deactivate_form as (
  update public.category_form_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'elektronika'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_form_v1 as (
  delete from public.category_form_schemas
  where category_slug = 'elektronika'
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
  'elektronika',
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
  where slug = 'elektronika'
  limit 1
),
photo_seed(subcategory_slug, schema) as (
  values
  (null::text, $schema${
  "category_key": "electronics",
  "category_slug": "elektronika",
  "contract_version": 1,
  "max_photos": 6,
  "schema_version": 1,
  "slots": [
    {
      "key": "front",
      "label": "Ön görünüş",
      "order": 10,
      "required": true
    },
    {
      "key": "back",
      "label": "Arxa görünüş",
      "order": 20,
      "required": false
    },
    {
      "key": "ports_or_label",
      "label": "Portlar / etiket",
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
    "noutbuklar",
    "masaustu-komputerler",
    "monobloklar",
    "planshetler",
    "elektron-kitablar",
    "monitorlar",
    "prosessorlar",
    "ana-platalar",
    "videokartlar",
    "operativ-yaddas-ram",
    "ssd-hdd-ve-yaddas-qurgulari",
    "korpus-qida-bloku-ve-soyutma",
    "komputer-periferiyasi",
    "printerler-ve-skanerler",
    "sebeke-avadanligi",
    "televizorlar",
    "proyektorlar",
    "tv-box-ve-media-pleyerler",
    "peyk-ve-tv-avadanligi",
    "qulaqliqlar",
    "portativ-dinamikler",
    "ev-audio-sistemleri",
    "mikrofon-ve-audio-interfeysler",
    "oyun-konsollari",
    "oyun-aksesuarlari",
    "foto-ve-videokameralar",
    "obyektiv-ve-foto-video-aksesuarlari",
    "smart-saat-ve-wearable-cihazlar",
    "agilli-ve-tehlukesizlik-sistemleri",
    "dronlar-ve-aksesuarlar"
  ]
}
$schema$::jsonb)
),
deactivate_photo as (
  update public.category_photo_schemas
  set is_active = false, updated_at = now()
  where category_slug = 'elektronika'
    and is_active = true
    and schema_version <> 1
  returning id
),
delete_photo_v1 as (
  delete from public.category_photo_schemas
  where category_slug = 'elektronika'
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
  'elektronika',
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
