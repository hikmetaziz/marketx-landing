import "server-only";

import { cache } from "react";

import fallbackSnapshotJson from "../../../generated/category-schemas.json";
import {
  CATEGORY_SCHEMA_CONTRACT_VERSION,
  type CategoryField,
  type CategoryFormSchema,
  type CategoryPhotoSchema,
  type CategorySchemaSnapshot,
  type PhotoSlot,
  parseCategorySchemaSnapshot,
} from "@/lib/category-schema/schema-contract";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type SchemaRow = {
  category_slug: string | null;
  subcategory_slug: string | null;
  schema_version: number | null;
  schema: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function subcategorySlugsFromRow(row: SchemaRow, schema: Record<string, unknown>): string[] {
  const slugs = stringArray(schema.subcategory_slugs);
  if (slugs.length > 0) {
    return slugs;
  }
  return typeof row.subcategory_slug === "string" && row.subcategory_slug.trim()
    ? [row.subcategory_slug]
    : [];
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function schemaVersionFromRow(row: SchemaRow, schema: Record<string, unknown>): number {
  if (typeof row.schema_version === "number" && Number.isInteger(row.schema_version)) {
    return row.schema_version;
  }
  const rawVersion = schema.schema_version;
  if (typeof rawVersion === "number" && Number.isInteger(rawVersion)) {
    return rawVersion;
  }
  if (isRecord(rawVersion) && typeof rawVersion.version === "number") {
    return rawVersion.version;
  }
  return 1;
}

function acceptsContractVersion(schema: Record<string, unknown>): boolean {
  return (
    schema.contract_version === undefined ||
    schema.contract_version === CATEGORY_SCHEMA_CONTRACT_VERSION
  );
}

function normalizeFormSchema(row: SchemaRow): CategoryFormSchema | null {
  if (!isRecord(row.schema) || !acceptsContractVersion(row.schema)) {
    return null;
  }

  return {
    category_key: stringValue(row.schema.category_key, stringValue(row.category_slug, "")),
    category_slug: stringValue(row.schema.category_slug, stringValue(row.category_slug, "")),
    subcategory_slugs: subcategorySlugsFromRow(row, row.schema),
    schema_version: { version: schemaVersionFromRow(row, row.schema), active: true },
    requires_subcategory: row.schema.requires_subcategory === true,
    fields: Array.isArray(row.schema.fields) ? (row.schema.fields as CategoryField[]) : [],
  };
}

function normalizePhotoSchema(row: SchemaRow): CategoryPhotoSchema | null {
  if (!isRecord(row.schema) || !acceptsContractVersion(row.schema)) {
    return null;
  }

  return {
    category_key: stringValue(row.schema.category_key, stringValue(row.category_slug, "")),
    category_slug: stringValue(row.schema.category_slug, stringValue(row.category_slug, "")),
    subcategory_slugs: subcategorySlugsFromRow(row, row.schema),
    schema_version: { version: schemaVersionFromRow(row, row.schema), active: true },
    max_photos: numberValue(row.schema.max_photos, 6),
    slots: Array.isArray(row.schema.slots) ? (row.schema.slots as PhotoSlot[]) : [],
  };
}

function fallbackSnapshot(): CategorySchemaSnapshot {
  const parsed = parseCategorySchemaSnapshot(fallbackSnapshotJson);
  if (!parsed) {
    throw new Error("Generated category schema snapshot is invalid.");
  }
  return parsed;
}

function buildSnapshotFromRows(
  formRows: SchemaRow[],
  photoRows: SchemaRow[],
): CategorySchemaSnapshot | null {
  const fallback = fallbackSnapshot();
  const schemas = formRows.map(normalizeFormSchema).filter((item): item is CategoryFormSchema => item !== null);
  const photoSchemas = photoRows.map(normalizePhotoSchema).filter((item): item is CategoryPhotoSchema => item !== null);

  if (schemas.length === 0 || photoSchemas.length === 0) {
    return null;
  }

  return parseCategorySchemaSnapshot({
    contract_version: fallback.contract_version,
    schema_version: fallback.schema_version,
    generated_from: "category-schema-tables",
    supported_field_types: fallback.supported_field_types,
    global_field_keys: fallback.global_field_keys,
    schemas,
    photo_schemas: photoSchemas,
  });
}

export const fetchCategorySchemaSnapshot = cache(async (): Promise<CategorySchemaSnapshot> => {
  if (!isSupabaseConfigured()) {
    return fallbackSnapshot();
  }

  try {
    const supabase = await createClient();
    const [formResult, photoResult] = await Promise.all([
      supabase
        .from("category_form_schemas")
        .select("category_slug, subcategory_slug, schema_version, schema")
        .eq("is_active", true),
      supabase
        .from("category_photo_schemas")
        .select("category_slug, subcategory_slug, schema_version, schema")
        .eq("is_active", true),
    ]);

    if (formResult.error || photoResult.error) {
      return fallbackSnapshot();
    }

    return (
      buildSnapshotFromRows(
        (formResult.data ?? []) as SchemaRow[],
        (photoResult.data ?? []) as SchemaRow[],
      ) ?? fallbackSnapshot()
    );
  } catch {
    return fallbackSnapshot();
  }
});
