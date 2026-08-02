import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const snapshotPath = resolve(readArg("--snapshot", "generated/category-schemas.json"));
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
const required = [
  { key: "automobile", slug: "avtomobil-ve-neqliyyat", requiresBrand: true },
  { key: "auto_parts", slug: "avto-ehtiyat-hisseleri-ve-avadanliq", requiresBrand: true },
  { key: "phone", slug: "telefon", requiresBrand: true },
  { key: "electronics", slug: "elektronika", requiresBrand: true },
  { key: "home_garden", slug: "ev-ve-bag", requiresBrand: false },
];
const errors = [];

for (const item of required) {
  const schemas = (snapshot.schemas ?? []).filter(
    (entry) => entry.category_key === item.key && entry.category_slug === item.slug && entry.schema_version?.active,
  );
  if (schemas.length === 0) {
    errors.push(`${item.key} schema missing`);
    continue;
  }
  const coveredSubcategories = new Set(schemas.flatMap((schema) => schema.subcategory_slugs ?? []));
  if (coveredSubcategories.size === 0) {
    errors.push(`${item.key} required subcategories not mapped`);
  }
  if (item.requiresBrand && !schemas.some((schema) => schema.fields?.some((field) => field.option_source === "brands"))) {
    errors.push(`${item.key} brand coverage missing`);
  }

  const photoSchema = snapshot.photo_schemas?.find((entry) => entry.category_key === item.key && entry.category_slug === item.slug);
  if (!photoSchema) errors.push(`${item.key} photo schema missing`);
  if (photoSchema && (!Array.isArray(photoSchema.slots) || photoSchema.slots.length === 0)) {
    errors.push(`${item.key} photo slots missing`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`schema_coverage_error=${error}`);
  process.exit(1);
}

console.log(`schema_coverage=pass snapshot=${snapshotPath}`);
