import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { TAXONOMY, flattenLeaves } from "../taxonomy/marktx-taxonomy-v1.mjs";

export const CONTRACT_VERSION = 1;
export const SCHEMA_VERSION = 1;
export const GENERATED_FROM = "prepared-category-schema-v1";

export const SUPPORTED_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "searchable_select",
  "dependent_select",
  "multi_select",
  "boolean",
  "searchable_text",
];

export const GLOBAL_FIELD_KEYS = [
  "title",
  "description",
  "price",
  "city",
  "category",
  "subcategory",
  "condition",
  "contact_phone",
  "status",
];

const option = (value) => ({ value, label: value });

const phoneStorageOptions = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"].map(option);
const phoneRamOptions = ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"].map(option);
const commonColorOptions = [
  "Qara",
  "Ağ",
  "Boz",
  "Gümüşü",
  "Göy",
  "Qırmızı",
  "Yaşıl",
  "Qızılı",
  "Bənövşəyi",
  "Çəhrayı",
  "Digər",
].map(option);
const phoneAccessoryOptions = [
  "Qutu",
  "Adapter",
  "Kabel",
  "Qulaqlıq",
  "Çexol",
  "Ekran qoruyucu",
  "Sənəd",
  "Digər",
].map(option);
const phoneBatteryHealthOptions = [
  "100%",
  "95-99%",
  "90-94%",
  "85-89%",
  "80-84%",
  "80%-dən aşağı",
].map(option);
const computerStorageOptions = ["128GB", "256GB", "512GB", "1TB", "2TB", "4TB", "8TB"].map(option);
const computerRamOptions = ["4GB", "8GB", "12GB", "16GB", "24GB", "32GB", "48GB", "64GB", "96GB", "128GB", "256GB"].map(option);
const computerProcessorOptions = [
  "Intel Core i3",
  "Intel Core i5",
  "Intel Core i7",
  "Intel Core i9",
  "Intel Xeon",
  "AMD Ryzen 3",
  "AMD Ryzen 5",
  "AMD Ryzen 7",
  "AMD Ryzen 9",
  "Apple M1",
  "Apple M2",
  "Apple M3",
  "Apple M4",
  "Digər",
].map(option);
const computerGraphicsOptions = [
  "Integrated",
  "Intel UHD",
  "Intel Iris Xe",
  "AMD Radeon Integrated",
  "NVIDIA GeForce GTX",
  "NVIDIA GeForce RTX 20 Series",
  "NVIDIA GeForce RTX 30 Series",
  "NVIDIA GeForce RTX 40 Series",
  "AMD Radeon RX",
  "Apple M-series GPU",
  "Digər",
].map(option);
const computerScreenSizeOptions = [
  "11\"",
  "12\"",
  "13\"",
  "14\"",
  "15\"",
  "15.6\"",
  "16\"",
  "17\"",
  "18\"",
  "21.5\"",
  "24\"",
  "27\"",
  "32\"",
  "Digər",
].map(option);
const computerOperatingSystemOptions = [
  "Windows 10",
  "Windows 11",
  "macOS",
  "Linux",
  "ChromeOS",
  "FreeDOS",
  "ƏS yoxdur",
  "Digər",
].map(option);
const fuelTypeOptions = ["Benzin", "Dizel", "Hibrid", "Elektrik", "Qaz"].map(option);
const transmissionOptions = ["Avtomat", "Mexaniki", "Robot", "Variator"].map(option);
const engineOptions = [
  "0.8 L",
  "1.0 L",
  "1.2 L",
  "1.4 L",
  "1.5 L",
  "1.6 L",
  "1.8 L",
  "2.0 L",
  "2.2 L",
  "2.4 L",
  "2.5 L",
  "3.0 L",
  "3.5 L",
  "4.0 L+",
  "Elektrik",
].map(option);
const drivetrainOptions = ["Ön", "Arxa", "Tam", "4x4"].map(option);
const autoColorOptions = [
  "Qara",
  "Ağ",
  "Boz",
  "Gümüşü",
  "Göy",
  "Qırmızı",
  "Yaşıl",
  "Qızılı",
  "Qəhvəyi",
  "Bej",
  "Digər",
].map(option);
const seatCountOptions = ["2", "4", "5", "6", "7", "8+"].map(option);
const autoPartPlacementOptions = [
  "Ön",
  "Arxa",
  "Sol",
  "Sağ",
  "Ön sol",
  "Ön sağ",
  "Arxa sol",
  "Arxa sağ",
  "Universal",
  "Digər",
].map(option);
const furnitureTypeOptions = [
  "Divan",
  "Kreslo",
  "Yataq",
  "Yataq dəsti",
  "Tumba",
  "Şkaf",
  "Komod",
  "Masa",
  "Stol",
  "Stul",
  "TV stend",
  "Kitab rəfi",
  "Mətbəx mebeli",
  "Ofis mebeli",
  "Uşaq mebeli",
  "Bağ mebeli",
  "Dəhliz mebeli",
  "Digər",
].map(option);
const furnitureRoomOptions = [
  "Qonaq otağı",
  "Yataq otağı",
  "Mətbəx",
  "Uşaq otağı",
  "Ofis",
  "Dəhliz",
  "Hamam",
  "Bağ",
  "Digər",
].map(option);
const furnitureMaterialOptions = [
  "Taxta",
  "MDF",
  "DSP",
  "Metal",
  "Şüşə",
  "Dəri",
  "Parça",
  "Rattan",
  "Plastik",
  "Qarışıq",
  "Digər",
].map(option);
const bodyTypeOptions = [
  "Sedan",
  "Hetçbek",
  "Universal",
  "Kupe",
  "Krossover",
  "SUV",
  "Minivan",
  "Pikap",
].map(option);

function parentByKey(key) {
  const parent = TAXONOMY.find((item) => item.key === key);
  if (!parent) throw new Error(`Missing taxonomy parent ${key}`);
  return parent;
}

function leafSlugsForParent(key) {
  return flattenLeaves(parentByKey(key)).map((leaf) => leaf.slug);
}

function leafSlugsForGroup(key, groupKey) {
  const parent = parentByKey(key);
  const group = parent.groups.find((item) => item.key === groupKey);
  if (!group) throw new Error(`Missing taxonomy group ${key}:${groupKey}`);
  return group.leaves.map((leaf) => leaf.slug);
}

const automobileSchemaSubcategories = ["avtomobiller"];
const autoPartsSchemaSubcategories = leafSlugsForParent("auto_parts");
const phoneDeviceSubcategories = leafSlugsForGroup("phone", "phone-devices");
const electronicsSchemaSubcategories = leafSlugsForParent("electronics");
const electronicsDesktopSubcategories = ["masaustu-komputerler"];
const electronicsLaptopSubcategories = ["noutbuklar"];
const electronicsAllInOneSubcategories = ["monobloklar"];
const electronicsSpecificSubcategories = new Set([
  ...electronicsDesktopSubcategories,
  ...electronicsLaptopSubcategories,
  ...electronicsAllInOneSubcategories,
]);
const electronicsGenericSubcategories = electronicsSchemaSubcategories.filter(
  (slug) => !electronicsSpecificSubcategories.has(slug),
);
const homeGardenFurnitureSubcategories = ["mebel"];

function electronicsBrandField(required) {
  return {
    key: "brand",
    label: "Marka",
    type: "searchable_select",
    required,
    order: 10,
    destination: "attributes",
    option_source: "brands",
    depends_on: "subcategory",
  };
}

function searchableTextField(key, label, order, required = false, maxLength = 120) {
  return {
    key,
    label,
    type: "searchable_text",
    required,
    order,
    destination: "attributes",
    validation: { maxLength },
  };
}

function selectField(key, label, order, options, required = false) {
  return {
    key,
    label,
    type: "select",
    required,
    order,
    destination: "attributes",
    options,
  };
}

function multiSelectField(key, label, order, options, required = false) {
  return {
    key,
    label,
    type: "multi_select",
    required,
    order,
    destination: "attributes",
    options,
  };
}

function booleanField(key, label, order) {
  return {
    key,
    label,
    type: "boolean",
    required: false,
    order,
    destination: "attributes",
  };
}

const electronicsDesktopFields = [
  electronicsBrandField(true),
  searchableTextField("model", "Model", 20, true),
  selectField("processor", "Prosessor", 30, computerProcessorOptions),
  selectField("ram", "RAM", 40, computerRamOptions),
  selectField("storage", "Yaddaş", 50, computerStorageOptions),
  selectField("graphics_card", "Videokart", 60, computerGraphicsOptions),
  selectField("operating_system", "Əməliyyat sistemi", 70, computerOperatingSystemOptions),
  selectField("color", "Rəng", 80, commonColorOptions),
  booleanField("has_warranty", "Zəmanət var", 90),
  booleanField("box_included", "Qutu var", 100),
];

const electronicsLaptopFields = [
  electronicsBrandField(true),
  searchableTextField("model", "Model", 20, true),
  selectField("processor", "Prosessor", 30, computerProcessorOptions),
  selectField("ram", "RAM", 40, computerRamOptions),
  selectField("storage", "Yaddaş", 50, computerStorageOptions),
  selectField("graphics_card", "Videokart", 60, computerGraphicsOptions),
  selectField("screen_size", "Ekran ölçüsü", 70, computerScreenSizeOptions),
  {
    key: "battery_health",
    label: "Batareya sağlamlığı (%)",
    type: "number",
    required: false,
    order: 80,
    destination: "attributes",
    validation: { min: 0, max: 100 },
  },
  selectField("operating_system", "Əməliyyat sistemi", 90, computerOperatingSystemOptions),
  selectField("color", "Rəng", 100, commonColorOptions),
  booleanField("has_warranty", "Zəmanət var", 110),
  booleanField("charger_included", "Adapter var", 120),
  booleanField("box_included", "Qutu var", 130),
];

const electronicsAllInOneFields = [
  electronicsBrandField(true),
  searchableTextField("model", "Model", 20, true),
  selectField("processor", "Prosessor", 30, computerProcessorOptions),
  selectField("ram", "RAM", 40, computerRamOptions),
  selectField("storage", "Yaddaş", 50, computerStorageOptions),
  selectField("screen_size", "Ekran ölçüsü", 60, computerScreenSizeOptions),
  booleanField("touchscreen", "Sensor ekran", 70),
  selectField("graphics_card", "Videokart", 80, computerGraphicsOptions),
  selectField("color", "Rəng", 90, commonColorOptions),
  booleanField("has_warranty", "Zəmanət var", 100),
];

const ELECTRONICS_FORM_SCHEMAS = [
  {
    category_key: "electronics",
    category_slug: "elektronika",
    subcategory_slugs: electronicsDesktopSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    requires_subcategory: true,
    fields: electronicsDesktopFields,
  },
  {
    category_key: "electronics",
    category_slug: "elektronika",
    subcategory_slugs: electronicsLaptopSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    requires_subcategory: true,
    fields: electronicsLaptopFields,
  },
  {
    category_key: "electronics",
    category_slug: "elektronika",
    subcategory_slugs: electronicsAllInOneSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    requires_subcategory: true,
    fields: electronicsAllInOneFields,
  },
];

const HOME_GARDEN_FORM_SCHEMAS = [
  {
    category_key: "home_garden",
    category_slug: "ev-ve-bag",
    subcategory_slugs: homeGardenFurnitureSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    requires_subcategory: true,
    fields: [
      selectField("furniture_type", "Mebel növü", 10, furnitureTypeOptions, true),
      selectField("room", "Otaq", 20, furnitureRoomOptions),
      selectField("material", "Material", 30, furnitureMaterialOptions),
      booleanField("has_warranty", "Zəmanət var", 60),
      booleanField("delivery_available", "Çatdırılma var", 70),
      searchableTextField("dimensions", "Ölçülər", 80, false, 80),
    ],
  },
];

export const FORM_SCHEMAS = [
  {
    category_key: "automobile",
    category_slug: "avtomobil-ve-neqliyyat",
    subcategory_slugs: automobileSchemaSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    requires_subcategory: false,
    fields: [
      {
        key: "brand",
        label: "Marka",
        type: "searchable_select",
        required: true,
        order: 10,
        destination: "attributes",
        option_source: "brands",
      },
      {
        key: "model",
        label: "Model",
        type: "dependent_select",
        required: true,
        order: 20,
        destination: "attributes",
        option_source: "models",
        depends_on: "brand",
      },
      {
        key: "year",
        label: "Buraxılış ili",
        type: "number",
        required: true,
        order: 30,
        destination: "attributes",
        validation: { min: 1900, max: 2027 },
      },
      {
        key: "mileage",
        label: "Yürüş",
        type: "number",
        required: false,
        order: 40,
        destination: "attributes",
        validation: { min: 0, max: 2000000 },
      },
      {
        key: "fuel_type",
        label: "Yanacaq növü",
        type: "select",
        required: false,
        order: 50,
        destination: "attributes",
        options: fuelTypeOptions,
      },
      {
        key: "transmission",
        label: "Sürətlər qutusu",
        type: "select",
        required: false,
        order: 60,
        destination: "attributes",
        options: transmissionOptions,
      },
      {
        key: "body_type",
        label: "Ban növü",
        type: "select",
        required: false,
        order: 70,
        destination: "attributes",
        options: bodyTypeOptions,
      },
      {
        key: "engine",
        label: "Mühərrik",
        type: "select",
        required: false,
        order: 80,
        destination: "attributes",
        options: engineOptions,
      },
      {
        key: "drivetrain",
        label: "Ötürücü",
        type: "select",
        required: false,
        order: 90,
        destination: "attributes",
        options: drivetrainOptions,
      },
      {
        key: "color",
        label: "Rəng",
        type: "select",
        required: false,
        order: 100,
        destination: "attributes",
        options: autoColorOptions,
      },
      {
        key: "seats",
        label: "Oturacaq sayı",
        type: "select",
        required: false,
        order: 110,
        destination: "attributes",
        options: seatCountOptions,
      },
    ],
  },
  {
    category_key: "auto_parts",
    category_slug: "avto-ehtiyat-hisseleri-ve-avadanliq",
    subcategory_slugs: autoPartsSchemaSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    requires_subcategory: true,
    fields: [
      {
        key: "compatible_brand",
        label: "Uyğun marka",
        type: "searchable_select",
        required: false,
        order: 10,
        destination: "attributes",
        option_source: "brands",
      },
      {
        key: "compatible_model",
        label: "Uyğun model",
        type: "dependent_select",
        required: false,
        order: 20,
        destination: "attributes",
        option_source: "models",
        depends_on: "compatible_brand",
        allow_custom_value: true,
      },
      searchableTextField("manufacturer_brand", "İstehsalçı marka", 30, false, 80),
      searchableTextField("part_number", "OEM / detal kodu", 40, false, 80),
      selectField("placement", "Tərəf / mövqe", 50, autoPartPlacementOptions),
      searchableTextField("size", "Ölçü", 60, false, 80),
      booleanField("has_warranty", "Zəmanət var", 70),
    ],
  },
  {
    category_key: "phone",
    category_slug: "telefon",
    subcategory_slugs: phoneDeviceSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    requires_subcategory: false,
    fields: [
      {
        key: "brand",
        label: "Marka",
        type: "searchable_select",
        required: true,
        order: 10,
        destination: "attributes",
        option_source: "brands",
      },
      {
        key: "model",
        label: "Model",
        type: "dependent_select",
        required: true,
        order: 20,
        destination: "attributes",
        option_source: "models",
        depends_on: "brand",
        allow_custom_value: true,
      },
      {
        key: "storage",
        label: "Yaddaş",
        type: "select",
        required: false,
        order: 30,
        destination: "attributes",
        options: phoneStorageOptions,
      },
      {
        key: "ram",
        label: "RAM",
        type: "select",
        required: false,
        order: 40,
        destination: "attributes",
        options: phoneRamOptions,
      },
      {
        key: "color",
        label: "Rəng",
        type: "select",
        required: false,
        order: 50,
        destination: "attributes",
        options: commonColorOptions,
      },
      {
        key: "battery_health",
        label: "Batareya sağlamlığı",
        type: "select",
        required: false,
        order: 55,
        destination: "attributes",
        options: phoneBatteryHealthOptions,
      },
      {
        key: "has_warranty",
        label: "Zəmanət var",
        type: "boolean",
        required: false,
        order: 60,
        destination: "attributes",
      },
      multiSelectField("accessories", "Aksesuarlar", 70, phoneAccessoryOptions),
    ],
  },
  ...ELECTRONICS_FORM_SCHEMAS,
  ...HOME_GARDEN_FORM_SCHEMAS,
  {
    category_key: "electronics",
    category_slug: "elektronika",
    subcategory_slugs: electronicsGenericSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    requires_subcategory: true,
    fields: [
      {
        key: "brand",
        label: "Marka",
        type: "searchable_select",
        required: false,
        order: 10,
        destination: "attributes",
        option_source: "brands",
        depends_on: "subcategory",
      },
      {
        key: "model",
        label: "Model",
        type: "searchable_text",
        required: false,
        order: 20,
        destination: "attributes",
        validation: { maxLength: 120 },
      },
      {
        key: "has_warranty",
        label: "Zəmanət var",
        type: "boolean",
        required: false,
        order: 30,
        destination: "attributes",
      },
      {
        key: "specifications",
        label: "Texniki xüsusiyyətlər",
        type: "textarea",
        required: false,
        order: 40,
        destination: "attributes",
        validation: { maxLength: 1000 },
      },
    ],
  },
];

export const PHOTO_SCHEMAS = [
  {
    category_key: "automobile",
    category_slug: "avtomobil-ve-neqliyyat",
    subcategory_slugs: automobileSchemaSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    max_photos: 15,
    slots: [
      { key: "front", label: "Ön görünüş", required: true, order: 10 },
      { key: "rear", label: "Arxa görünüş", required: true, order: 20 },
      { key: "left_side", label: "Sol yan", required: false, order: 30 },
      { key: "right_side", label: "Sağ yan", required: false, order: 40 },
      { key: "interior", label: "Salon", required: true, order: 50 },
      { key: "dashboard", label: "Panel", required: false, order: 60 },
      { key: "engine_bay", label: "Mühərrik bölməsi", required: false, order: 70 },
      { key: "odometer", label: "Yürüş göstəricisi", required: false, order: 80 },
      { key: "gallery", label: "Əlavə şəkillər", required: false, order: 90 },
    ],
  },
  {
    category_key: "phone",
    category_slug: "telefon",
    subcategory_slugs: phoneDeviceSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    max_photos: 6,
    slots: [
      { key: "front", label: "Ön tərəf", required: true, order: 10 },
      { key: "back", label: "Arxa tərəf", required: true, order: 20 },
      { key: "screen_on", label: "Ekran açıq", required: false, order: 30 },
      { key: "accessories", label: "Aksesuarlar", required: false, order: 40 },
      { key: "gallery", label: "Əlavə şəkillər", required: false, order: 50 },
    ],
  },
  {
    category_key: "auto_parts",
    category_slug: "avto-ehtiyat-hisseleri-ve-avadanliq",
    subcategory_slugs: autoPartsSchemaSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    max_photos: 8,
    slots: [
      { key: "front", label: "Əsas görünüş", required: true, order: 10 },
      { key: "label_or_code", label: "Etiket / detal kodu", required: false, order: 20 },
      { key: "compatibility", label: "Uyğunluq işarəsi", required: false, order: 30 },
      { key: "defects", label: "Qüsurlar", required: false, order: 40 },
      { key: "gallery", label: "Əlavə şəkillər", required: false, order: 50 },
    ],
  },
  {
    category_key: "electronics",
    category_slug: "elektronika",
    subcategory_slugs: electronicsSchemaSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    max_photos: 6,
    slots: [
      { key: "front", label: "Ön görünüş", required: true, order: 10 },
      { key: "back", label: "Arxa görünüş", required: false, order: 20 },
      { key: "ports_or_label", label: "Portlar / etiket", required: false, order: 30 },
      { key: "accessories", label: "Aksesuarlar", required: false, order: 40 },
      { key: "gallery", label: "Əlavə şəkillər", required: false, order: 50 },
    ],
  },
  {
    category_key: "home_garden",
    category_slug: "ev-ve-bag",
    subcategory_slugs: homeGardenFurnitureSubcategories,
    schema_version: { version: SCHEMA_VERSION, active: true },
    max_photos: 8,
    slots: [
      { key: "front", label: "Ön görünüş", required: true, order: 10 },
      { key: "side", label: "Yan görünüş", required: false, order: 20 },
      { key: "detail", label: "Material / detal", required: false, order: 30 },
      { key: "defects", label: "Qüsurlar", required: false, order: 40 },
      { key: "gallery", label: "Əlavə şəkillər", required: false, order: 50 },
    ],
  },
];

function compareByOrderThenKey(left, right) {
  return (left.order ?? 0) - (right.order ?? 0) || String(left.key).localeCompare(String(right.key));
}

function schemaSortKey(schema) {
  return `${schema.category_key}:${schema.category_slug}:${[...schema.subcategory_slugs].sort().join("|")}`;
}

export function buildSnapshot() {
  return {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    generated_from: GENERATED_FROM,
    supported_field_types: [...SUPPORTED_FIELD_TYPES].sort(),
    global_field_keys: [...GLOBAL_FIELD_KEYS].sort(),
    schemas: FORM_SCHEMAS.map((schema) => ({
      ...schema,
      subcategory_slugs: [...schema.subcategory_slugs].sort(),
      fields: [...schema.fields].sort(compareByOrderThenKey),
    })).sort((left, right) => schemaSortKey(left).localeCompare(schemaSortKey(right))),
    photo_schemas: PHOTO_SCHEMAS.map((schema) => ({
      ...schema,
      subcategory_slugs: [...schema.subcategory_slugs].sort(),
      slots: [...schema.slots].sort(compareByOrderThenKey),
    })).sort((left, right) => schemaSortKey(left).localeCompare(schemaSortKey(right))),
  };
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function formatJson(value) {
  return `${JSON.stringify(JSON.parse(stableStringify(value)), null, 2)}\n`;
}

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function writeTextFile(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function dollarJson(value) {
  return `$schema$${formatJson(value)}$schema$::jsonb`;
}

function seedFileName(categoryKey) {
  if (categoryKey === "automobile") return "SEED_AUTOMOBILE_SCHEMA_V1.sql";
  if (categoryKey === "auto_parts") return "SEED_AUTO_PARTS_SCHEMA_V1.sql";
  if (categoryKey === "phone") return "SEED_PHONE_SCHEMA_V1.sql";
  if (categoryKey === "electronics") return "SEED_ELECTRONICS_SCHEMA_V1.sql";
  if (categoryKey === "home_garden") return "SEED_HOME_GARDEN_SCHEMA_V1.sql";
  return `SEED_${categoryKey.toUpperCase()}_SCHEMA_V1.sql`;
}

function schemaRowSubcategorySlug(schema) {
  return schema.subcategory_slugs.length === 1 ? schema.subcategory_slugs[0] : null;
}

function formSeedRow(schema) {
  const formJson = {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    category_key: schema.category_key,
    category_slug: schema.category_slug,
    subcategory_slugs: schema.subcategory_slugs,
    requires_subcategory: schema.requires_subcategory,
    fields: schema.fields,
  };
  return `  (${schemaRowSubcategorySlug(schema) === null ? "null::text" : sqlLiteral(schemaRowSubcategorySlug(schema))}, ${dollarJson(formJson)})`;
}

function photoSeedRow(schema) {
  const photoJson = {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    category_key: schema.category_key,
    category_slug: schema.category_slug,
    subcategory_slugs: schema.subcategory_slugs,
    max_photos: schema.max_photos,
    slots: schema.slots,
  };
  return `  (${schemaRowSubcategorySlug(schema) === null ? "null::text" : sqlLiteral(schemaRowSubcategorySlug(schema))}, ${dollarJson(photoJson)})`;
}

export function buildSeedSql(categoryKey, formSchemas, photoSchemas) {
  const categorySlug = formSchemas[0]?.category_slug ?? photoSchemas[0]?.category_slug;
  if (!categorySlug) {
    throw new Error(`Missing schema category slug for ${categoryKey}`);
  }
  const formRows = formSchemas.map(formSeedRow).join(",\n");
  const photoRows = photoSchemas.map(photoSeedRow).join(",\n");

  return `-- MarktX ${categoryKey} category schema v1 seed.
-- Prepared only. Do not run against production.
-- Reuses existing category slug ${categorySlug}; does not migrate listings.
-- Rollback after apply: delete schema_version = 1 rows for this category from
-- public.category_form_schemas and public.category_photo_schemas, then manually
-- re-enable the previously approved active version if one existed.

begin;

with target_category as (
  select id
  from public.categories
  where slug = ${sqlLiteral(categorySlug)}
  limit 1
),
form_seed(subcategory_slug, schema) as (
  values
${formRows}
),
deactivate_form as (
  update public.category_form_schemas
  set is_active = false, updated_at = now()
  where category_slug = ${sqlLiteral(categorySlug)}
    and is_active = true
    and schema_version <> ${SCHEMA_VERSION}
  returning id
),
delete_form_v1 as (
  delete from public.category_form_schemas
  where category_slug = ${sqlLiteral(categorySlug)}
    and schema_version = ${SCHEMA_VERSION}
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
  ${sqlLiteral(categorySlug)},
  form_seed.subcategory_slug,
  ${SCHEMA_VERSION},
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
  where slug = ${sqlLiteral(categorySlug)}
  limit 1
),
photo_seed(subcategory_slug, schema) as (
  values
${photoRows}
),
deactivate_photo as (
  update public.category_photo_schemas
  set is_active = false, updated_at = now()
  where category_slug = ${sqlLiteral(categorySlug)}
    and is_active = true
    and schema_version <> ${SCHEMA_VERSION}
  returning id
),
delete_photo_v1 as (
  delete from public.category_photo_schemas
  where category_slug = ${sqlLiteral(categorySlug)}
    and schema_version = ${SCHEMA_VERSION}
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
  ${sqlLiteral(categorySlug)},
  photo_seed.subcategory_slug,
  ${SCHEMA_VERSION},
  photo_seed.schema,
  true
from target_category
cross join photo_seed
left join public.subcategories target_subcategory
  on target_subcategory.category_id = target_category.id
  and target_subcategory.slug = photo_seed.subcategory_slug
where photo_seed.subcategory_slug is null or target_subcategory.id is not null;

commit;
`;
}

export function writeSeedFiles(rootDir) {
  const categoryKeys = [...new Set(FORM_SCHEMAS.map((schema) => schema.category_key))].sort();
  for (const categoryKey of categoryKeys) {
    const formSchemas = FORM_SCHEMAS.filter((schema) => schema.category_key === categoryKey);
    const photoSchemas = PHOTO_SCHEMAS.filter((schema) => schema.category_key === categoryKey);
    if (photoSchemas.length === 0) {
      throw new Error(`Missing photo schema for ${categoryKey}`);
    }
    writeTextFile(
      join(rootDir, "supabase", "seeds", seedFileName(categoryKey)),
      buildSeedSql(categoryKey, formSchemas, photoSchemas),
    );
  }
}
