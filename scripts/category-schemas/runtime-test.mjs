import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildSnapshot } from "./canonical-v1.mjs";
import {
  resolveBrandOptions,
  resolveModelOptions,
} from "./option-catalogs-v1.mjs";

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const snapshotPath = resolve(readArg("--snapshot", "generated/category-schemas.json"));
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
const canonical = buildSnapshot();
const errors = [];

function findSchema(categoryKey, categorySlug, subcategorySlug) {
  const candidates = (snapshot.schemas ?? []).filter(
    (entry) =>
      entry.category_key === categoryKey &&
      entry.category_slug === categorySlug &&
      entry.schema_version?.active,
  );
  if (subcategorySlug) {
    const exact = candidates
      .filter((entry) => (entry.subcategory_slugs ?? []).includes(subcategorySlug))
      .sort((left, right) => left.subcategory_slugs.length - right.subcategory_slugs.length);
    if (exact[0]) return exact[0];
  }
  return candidates.find((entry) => (entry.subcategory_slugs ?? []).length === 0) ?? candidates[0] ?? null;
}

function fieldMap(schema) {
  return new Map((schema?.fields ?? []).map((field) => [field.key, field]));
}

const requiredCategories = [
  {
    key: "automobile",
    slug: "avtomobil-ve-neqliyyat",
    subcategory: "avtomobiller",
    brand: "Toyota",
    requiredFields: ["brand", "model", "year"],
    selectFields: ["fuel_type", "transmission", "body_type", "engine", "drivetrain", "color", "seats"],
  },
  {
    key: "auto_parts",
    slug: "avto-ehtiyat-hisseleri-ve-avadanliq",
    subcategory: "sinler",
    brand: "Toyota",
    requiredFields: ["compatible_brand", "compatible_model"],
    selectFields: ["placement"],
    forbiddenFields: ["condition"],
  },
  {
    key: "phone",
    slug: "telefon",
    subcategory: "smartfonlar",
    brand: "Apple",
    requiredFields: ["brand", "model"],
    selectFields: ["storage", "ram", "color", "battery_health"],
    multiSelectFields: ["accessories"],
  },
  {
    key: "electronics",
    slug: "elektronika",
    subcategory: "masaustu-komputerler",
    brand: "Apple",
    requiredFields: ["brand", "model"],
    forbiddenFields: ["battery_health", "battery_percentage", "charger_included", "touchscreen"],
    selectFields: ["processor", "ram", "storage", "graphics_card", "operating_system", "color"],
  },
  {
    key: "electronics",
    slug: "elektronika",
    subcategory: "noutbuklar",
    brand: "Apple",
    requiredFields: ["brand", "model", "battery_health", "charger_included"],
    forbiddenFields: ["battery_percentage", "touchscreen"],
    selectFields: ["processor", "ram", "storage", "graphics_card", "screen_size", "operating_system", "color"],
  },
  {
    key: "electronics",
    slug: "elektronika",
    subcategory: "monobloklar",
    brand: "Apple",
    requiredFields: ["brand", "model", "touchscreen"],
    forbiddenFields: ["battery_health", "battery_percentage", "charger_included", "box_included"],
    selectFields: ["processor", "ram", "storage", "screen_size", "graphics_card", "color"],
  },
  {
    key: "home_garden",
    slug: "ev-ve-bag",
    subcategory: "mebel",
    requiredFields: ["furniture_type"],
    selectFields: ["furniture_type", "room", "material"],
    forbiddenFields: ["color", "set_type", "sale_form"],
  },
];

for (const item of requiredCategories) {
  const schema = findSchema(item.key, item.slug, item.subcategory);
  if (!schema) {
    errors.push(`${item.key}:${item.subcategory} schema missing`);
    continue;
  }

  const fields = fieldMap(schema);
  const fieldKeys = new Set(fields.keys());
  for (const fieldKey of item.requiredFields) {
    if (!fieldKeys.has(fieldKey)) {
      errors.push(`${item.key}:${item.subcategory} missing field ${fieldKey}`);
    }
  }
  for (const fieldKey of item.forbiddenFields ?? []) {
    if (fieldKeys.has(fieldKey)) {
      errors.push(`${item.key}:${item.subcategory} must not expose ${fieldKey}`);
    }
  }
  for (const fieldKey of item.selectFields ?? []) {
    const field = fields.get(fieldKey);
    if (field?.type !== "select" || (field.options ?? []).length === 0) {
      errors.push(`${item.key}:${item.subcategory} ${fieldKey} must use select options`);
    }
  }
  for (const fieldKey of item.multiSelectFields ?? []) {
    const field = fields.get(fieldKey);
    if (field?.type !== "multi_select" || (field.options ?? []).length === 0) {
      errors.push(`${item.key}:${item.subcategory} ${fieldKey} must use multi_select options`);
    }
  }

  const brandField = fields.get("brand");
  if (brandField?.option_source === "brands") {
    const brands = resolveBrandOptions(item.key, item.subcategory);
    if (brands.length === 0) {
      errors.push(`${item.key}:${item.subcategory} brand catalog empty`);
    }
    const appleCount = brands.filter((brand) => brand.trim().normalize("NFKC").toLocaleLowerCase("az") === "apple").length;
    if (item.key === "electronics" && appleCount !== 1) {
      errors.push(`${item.key}:${item.subcategory} Apple brand count ${appleCount}`);
    }
  }

  const modelField = fields.get("model");
  if (modelField?.option_source === "models" && item.brand) {
    const models = resolveModelOptions(item.key, item.brand);
    if (models.length === 0) {
      errors.push(`${item.key} model catalog empty for ${item.brand}`);
    }
  }
  const compatibleModelField = fields.get("compatible_model");
  if (compatibleModelField?.option_source === "models" && item.brand) {
    const models = resolveModelOptions(item.key, item.brand);
    if (models.length === 0) {
      errors.push(`${item.key} compatible model catalog empty for ${item.brand}`);
    }
  }
  if (item.key === "electronics" && modelField?.type !== "searchable_text") {
    errors.push(`${item.key}:${item.subcategory} model must use searchable_text fallback`);
  }
  if (item.key === "electronics" && modelField?.required !== true) {
    errors.push(`${item.key}:${item.subcategory} model must be required`);
  }
  if (item.key === "electronics" && ["masaustu-komputerler", "noutbuklar", "monobloklar"].includes(item.subcategory)) {
    for (const fieldKey of ["ram", "storage"]) {
      const field = fields.get(fieldKey);
      if (field?.type !== "select") {
        errors.push(`${item.key}:${item.subcategory} ${fieldKey} must use select options`);
        continue;
      }
      const optionValues = (field.options ?? []).map((option) => option.value);
      if (fieldKey === "ram" && (!optionValues.includes("16GB") || !optionValues.includes("32GB") || !optionValues.includes("64GB"))) {
        errors.push(`${item.key}:${item.subcategory} RAM options incomplete`);
      }
      if (fieldKey === "storage" && (!optionValues.includes("512GB") || !optionValues.includes("1TB") || !optionValues.includes("2TB"))) {
        errors.push(`${item.key}:${item.subcategory} storage options incomplete`);
      }
    }
    for (const fieldKey of ["graphics_card"]) {
      const field = fields.get(fieldKey);
      if (field?.type !== "select") {
        errors.push(`${item.key}:${item.subcategory} ${fieldKey} must use select options`);
      }
    }
  }
  if (item.key === "electronics" && ["noutbuklar", "monobloklar"].includes(item.subcategory)) {
    const field = fields.get("screen_size");
    if (field?.type !== "select") {
      errors.push(`${item.key}:${item.subcategory} screen_size must use select options`);
    }
  }
  if (item.key === "electronics" && ["masaustu-komputerler", "noutbuklar"].includes(item.subcategory)) {
    const field = fields.get("operating_system");
    if (field?.type !== "select") {
      errors.push(`${item.key}:${item.subcategory} operating_system must use select options`);
    }
  }

  if (item.key === "electronics" && schema.requires_subcategory !== true) {
    errors.push("electronics requires_subcategory must be true");
  }
}

if (snapshot.contract_version !== canonical.contract_version) {
  errors.push("snapshot contract_version drift from canonical");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`schema_runtime_error=${error}`);
  process.exit(1);
}

console.log(`schema_runtime=pass snapshot=${snapshotPath}`);
