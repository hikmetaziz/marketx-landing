import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GLOBAL_FIELD_KEYS, SUPPORTED_FIELD_TYPES } from "./canonical-v1.mjs";

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function fail(errors) {
  for (const error of errors) {
    console.error(`schema_validate_error=${error}`);
  }
  process.exit(1);
}

const snapshotPath = resolve(readArg("--snapshot", "generated/category-schemas.json"));
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
const errors = [];
const supportedTypes = new Set(snapshot.supported_field_types ?? SUPPORTED_FIELD_TYPES);
const globalKeys = new Set(snapshot.global_field_keys ?? GLOBAL_FIELD_KEYS);
const validOptionSources = new Set(["brands", "models"]);

if (snapshot.contract_version !== 1) errors.push("contract_version must be 1");
if (!Array.isArray(snapshot.schemas)) errors.push("schemas must be an array");
if (!Array.isArray(snapshot.photo_schemas)) errors.push("photo_schemas must be an array");

const activeByCategory = new Map();
for (const schema of snapshot.schemas ?? []) {
  const schemaId = `${schema.category_slug}:${schema.schema_version?.version ?? "unknown"}`;
  if (schema.schema_version?.active) {
    const activeKey = `${schema.category_slug}:${[...(schema.subcategory_slugs ?? [])].sort().join("|")}`;
    activeByCategory.set(activeKey, (activeByCategory.get(activeKey) ?? 0) + 1);
  }

  const fieldKeys = new Set();
  for (const field of schema.fields ?? []) {
    if (fieldKeys.has(field.key)) errors.push(`${schemaId} duplicate field key ${field.key}`);
    fieldKeys.add(field.key);

    if (globalKeys.has(field.key)) errors.push(`${schemaId} duplicates global field ${field.key}`);
    if (!supportedTypes.has(field.type)) errors.push(`${schemaId}.${field.key} unsupported type ${field.type}`);
    if (field.destination !== "attributes") errors.push(`${schemaId}.${field.key} invalid destination`);

    if ((field.type === "select" || field.type === "multi_select") && (!Array.isArray(field.options) || field.options.length === 0)) {
      errors.push(`${schemaId}.${field.key} empty select options`);
    }
    if ((field.type === "searchable_select" || field.type === "dependent_select") && !validOptionSources.has(field.option_source)) {
      errors.push(`${schemaId}.${field.key} invalid option source`);
    }
    if (field.option_source && !validOptionSources.has(field.option_source)) {
      errors.push(`${schemaId}.${field.key} invalid option source ${field.option_source}`);
    }
    if (field.depends_on && !fieldKeys.has(field.depends_on) && !globalKeys.has(field.depends_on)) {
      errors.push(`${schemaId}.${field.key} invalid dependency ${field.depends_on}`);
    }
    if (field.key === "model" && field.type === "dependent_select" && field.option_source === "models" && field.depends_on !== "brand") {
      errors.push(`${schemaId}.model dependent model field must depend on brand`);
    }
    if (field.validation && typeof field.validation !== "object") {
      errors.push(`${schemaId}.${field.key} malformed validation`);
    }
  }
}

for (const [key, count] of activeByCategory) {
  if (count > 1) errors.push(`${key} has multiple active schema versions`);
}

for (const photoSchema of snapshot.photo_schemas ?? []) {
  const keys = new Set();
  for (const slot of photoSchema.slots ?? []) {
    if (keys.has(slot.key)) errors.push(`${photoSchema.category_slug} duplicate photo slot ${slot.key}`);
    keys.add(slot.key);
  }
}

if (errors.length > 0) fail(errors);
console.log(`schema_validate=pass snapshot=${snapshotPath}`);
