import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function schemaKey(schema) {
  return `${schema.category_key}:${schema.category_slug}:${[...(schema.subcategory_slugs ?? [])].sort().join("|")}`;
}

function fieldSignature(field) {
  return {
    key: field.key,
    type: field.type,
    required: field.required,
    option_source: field.option_source ?? null,
    depends_on: field.depends_on ?? null,
    allow_custom_value: field.allow_custom_value ?? false,
    options: (field.options ?? []).map((option) => option.value).sort(),
  };
}

function extractSupportedTypes(contractPath) {
  if (!existsSync(contractPath)) return null;
  const content = readFileSync(contractPath, "utf8");
  const match = content.match(/SUPPORTED_CATEGORY_FIELD_TYPES\s*=\s*\[([\s\S]*?)\]\s+as const/);
  if (!match) return null;
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]).sort();
}

const webRoot = resolve(readArg("--web", process.cwd()));
const mobileRoot = resolve(readArg("--mobile", "F:/projects/mobile_apps/marktx-app"));
const webSnapshotPath = join(webRoot, "generated", "category-schemas.json");
const mobileSnapshotPath = join(mobileRoot, "generated", "category-schemas.json");
const errors = [];

if (!existsSync(webSnapshotPath)) errors.push(`missing web snapshot ${webSnapshotPath}`);
if (!existsSync(mobileSnapshotPath)) errors.push(`missing mobile snapshot ${mobileSnapshotPath}`);

if (errors.length === 0) {
  const webSnapshotText = readFileSync(webSnapshotPath, "utf8");
  const mobileSnapshotText = readFileSync(mobileSnapshotPath, "utf8");
  const webHash = sha256(webSnapshotText);
  const mobileHash = sha256(mobileSnapshotText);
  if (webHash !== mobileHash) errors.push(`snapshot hashes differ web=${webHash} mobile=${mobileHash}`);

  const webSnapshot = readJson(webSnapshotPath);
  const mobileSnapshot = readJson(mobileSnapshotPath);
  if (webSnapshot.schema_version !== mobileSnapshot.schema_version) errors.push("schema versions differ");

  const webTypes = extractSupportedTypes(join(webRoot, "src", "lib", "category-schema", "schema-contract.ts"));
  const mobileTypes = extractSupportedTypes(join(mobileRoot, "lib", "category-schema", "schema-contract.ts"));
  const snapshotTypes = [...(webSnapshot.supported_field_types ?? [])].sort();

  if (!webTypes) errors.push("web contract supported types not found");
  if (!mobileTypes) errors.push("mobile contract supported types not found");
  if (webTypes && JSON.stringify(webTypes) !== JSON.stringify(snapshotTypes)) errors.push("web does not support every used field type");
  if (mobileTypes && JSON.stringify(mobileTypes) !== JSON.stringify(snapshotTypes)) errors.push("mobile does not support every used field type");

  const mobileSchemasByKey = new Map((mobileSnapshot.schemas ?? []).map((schema) => [schemaKey(schema), schema]));
  for (const schema of webSnapshot.schemas ?? []) {
    const key = schemaKey(schema);
    const mobileSchema = mobileSchemasByKey.get(key);
    if (!mobileSchema) {
      errors.push(`mobile missing ${key} schema`);
      continue;
    }
    const webFields = schema.fields.map(fieldSignature).sort((left, right) => left.key.localeCompare(right.key));
    const mobileFields = mobileSchema.fields.map(fieldSignature).sort((left, right) => left.key.localeCompare(right.key));
    if (JSON.stringify(webFields) !== JSON.stringify(mobileFields)) errors.push(`${key} fields differ`);
  }

  const webSchemaKeys = new Set((webSnapshot.schemas ?? []).map(schemaKey));
  for (const mobileSchema of mobileSnapshot.schemas ?? []) {
    const key = schemaKey(mobileSchema);
    if (!webSchemaKeys.has(key)) errors.push(`mobile has extra ${key} schema`);
  }

  const mobilePhotoByKey = new Map((mobileSnapshot.photo_schemas ?? []).map((schema) => [schemaKey(schema), schema]));
  for (const photoSchema of webSnapshot.photo_schemas ?? []) {
    const key = schemaKey(photoSchema);
    const mobilePhoto = mobilePhotoByKey.get(key);
    const webSlotKeys = photoSchema.slots.map((slot) => slot.key).sort();
    const mobileSlotKeys = (mobilePhoto?.slots ?? []).map((slot) => slot.key).sort();
    if (JSON.stringify(webSlotKeys) !== JSON.stringify(mobileSlotKeys)) {
      errors.push(`${key} photo slot keys differ`);
    }
  }

  if (errors.length === 0) {
    console.log(`schema_contract=pass hash=${webHash}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`schema_contract_error=${error}`);
  process.exit(1);
}
