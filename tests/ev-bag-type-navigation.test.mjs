import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EV_BAG_PRIMARY_TYPE_FIELD_KEYS,
  buildEvBagTypeHref,
  getEvBagTypeField,
  resolveEvBagTypeFilter,
} from "../src/lib/taxonomy/ev-bag-type-fields.ts";
const mebelSchema = {
  category_key: "home_garden",
  category_slug: "ev-ve-bag",
  subcategory_slugs: ["mebel"],
  schema_version: { version: 2, active: true },
  requires_subcategory: true,
  fields: [
    {
      key: "furniture_type",
      label: "Növ",
      type: "select",
      required: true,
      order: 10,
      destination: "attributes",
      options: [
        { value: "Divanlar və kreslolar", label: "Divanlar və kreslolar" },
        { value: "Digər", label: "Digər" },
      ],
    },
    {
      key: "room",
      label: "Otaq",
      type: "select",
      required: false,
      order: 20,
      destination: "attributes",
      options: [{ value: "Qonaq otağı", label: "Qonaq otağı" }],
    },
  ],
};

const snapshot = {
  contract_version: 1,
  schema_version: 2,
  generated_from: "test",
  supported_field_types: ["select"],
  global_field_keys: [],
  schemas: [mebelSchema],
  photo_schemas: [],
};

test("maps every canonical Ev və bağ subcategory to one primary type field", () => {
  assert.deepEqual(EV_BAG_PRIMARY_TYPE_FIELD_KEYS, {
    "bag-ve-bostan": "garden_type",
    bitkiler: "plant_type",
    "dekor-ve-interyer": "decor_type",
    "qida-ve-erzaq": "food_type",
    "ev-ve-bag-ucun-isiqlandirma": "lighting_type",
    "ev-tekstili": "textile_type",
    "ev-teserrufati-mallari": "household_type",
    mebel: "furniture_type",
    "qab-qacaq-ve-metbex-levazimatlari": "kitchenware_type",
    "temir-ve-tikinti": "repair_type",
    "xalcalar-ve-aksesuarlar": "carpet_type",
  });
});

test("resolves only exact active schema options and rejects arbitrary type values", () => {
  const field = getEvBagTypeField(snapshot, "ev-ve-bag", "mebel");
  assert.equal(field?.key, "furniture_type");
  assert.deepEqual(field?.options, mebelSchema.fields[0].options);
  assert.deepEqual(resolveEvBagTypeFilter(snapshot, "ev-ve-bag", "mebel", "Divanlar və kreslolar"), {
    fieldKey: "furniture_type",
    value: "Divanlar və kreslolar",
  });
  assert.equal(resolveEvBagTypeFilter(snapshot, "ev-ve-bag", "mebel", "arbitrary"), null);
  assert.equal(getEvBagTypeField(snapshot, "ev-ve-bag", "bitkiler"), null);
});

test("does not activate Ev və bağ type behavior for a same-slug subcategory elsewhere", () => {
  assert.equal(getEvBagTypeField(snapshot, "some-other-category", "mebel"), null);
  assert.equal(
    resolveEvBagTypeFilter(
      snapshot,
      "some-other-category",
      "mebel",
      "Divanlar və kreslolar",
    ),
    null,
  );
});

test("category page scopes both type UI and listing predicates to the current category", async () => {
  const source = await readFile(
    new URL("../src/app/categories/[slug]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /getEvBagTypeField\(categorySchemaSnapshot, slug, subcategory\.slug\)/);
  assert.match(
    source,
    /resolveEvBagTypeFilter\(categorySchemaSnapshot, slug, subcategory\.slug, requestedType\)/,
  );
  assert.match(source, /\{typeField \? <EvBagTypeFilter/);
  assert.match(source, /typeFilter: typeFilter \?\? undefined/);
});

test("type navigation preserves unrelated parameters and resets pagination", () => {
  assert.equal(
    buildEvBagTypeHref(
      "/categories/ev-ve-bag",
      "sub=mebel&page=4&campaign=home",
      "Divanlar və kreslolar",
    ),
    "/categories/ev-ve-bag?sub=mebel&campaign=home&type=Divanlar+v%C9%99+kreslolar",
  );
  assert.equal(
    buildEvBagTypeHref(
      "/categories/ev-ve-bag",
      "sub=mebel&type=Dig%C9%99r&page=2&campaign=home",
      "",
    ),
    "/categories/ev-ve-bag?sub=mebel&campaign=home",
  );
});

test("migration contains exactly ten new schemas and derives Mebel v2 without changing other fields", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260906130000_ev_bag_type_schemas.sql", import.meta.url),
    "utf8",
  );
  const jsonBlocks = [...sql.matchAll(/\$json\$\s*([\s\S]*?)\s*\$json\$::jsonb/g)];
  const specs = JSON.parse(jsonBlocks[0][1]);
  const mebelOptions = JSON.parse(jsonBlocks[1][1]);

  assert.equal(specs.length, 10);
  assert.equal(mebelOptions.length, 16);
  assert.equal(specs.some((spec) => spec.slug === "mebel"), false);
  assert.match(sql, /then field \|\| jsonb_build_object\('label', 'Növ', 'options', mebel_options\)/);
  assert.match(sql, /else field/);
  assert.match(sql, /jsonb_set\(mebel_v1_schema, '\{fields\}', mebel_fields, false\)/);
  assert.match(sql, /jsonb_set\(expected_mebel_schema, '\{schema_version\}', '2'::jsonb, true\)/);
  assert.doesNotMatch(sql, /category_photo_schemas/);
  assert.doesNotMatch(sql, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
});

test("migration rejects an unexpected active Mebel version", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260906130000_ev_bag_type_schemas.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /Expected exactly one historical mebel schema version 1/);
  assert.match(sql, /mebel_schema_version <> 1/);
  assert.match(sql, /active_count <> 1 or mebel_v1_active is distinct from true/);
});

test("migration rejects a tampered existing Mebel v2 using full JSONB equality", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260906130000_ev_bag_type_schemas.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /or mebel_v1_active is distinct from false/);
  assert.match(sql, /or existing_schema is distinct from expected_mebel_schema/);
  assert.doesNotMatch(sql, /mebel_field ->> 'label'/);
});

test("category listing queries use JSONB containment instead of raw filter fragments", async () => {
  const source = await readFile(
    new URL("../src/lib/listings/live-listings.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /\.contains\("attributes", \{/);
  assert.match(source, /\[options\.typeFilter\.fieldKey\]: options\.typeFilter\.value/);
});

test("existing create and edit flows keep using shared schema validation and attributes persistence", async () => {
  const [createForm, editForm, createAction, editAction] = await Promise.all([
    readFile(new URL("../src/components/listings/CreateListingForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/listings/EditListingForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/create-listing/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/account/listings/actions.ts", import.meta.url), "utf8"),
  ]);

  assert.match(createForm, /<DynamicAttributeFields/);
  assert.match(editForm, /useState<ListingAttributeValues>\(listing\.attributes\)/);
  assert.match(editForm, /<DynamicAttributeFields/);
  assert.match(createAction, /validateListingTaxonomyFields/);
  assert.match(createAction, /attributes: sanitizedAttributes/);
  assert.match(editAction, /validateListingTaxonomyFields/);
  assert.match(editAction, /attributes: mergedAttributes/);
});
