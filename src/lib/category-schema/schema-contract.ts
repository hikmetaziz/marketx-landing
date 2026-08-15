export const CATEGORY_SCHEMA_CONTRACT_VERSION = 1;

export const SUPPORTED_CATEGORY_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "searchable_select",
  "dependent_select",
  "multi_select",
  "boolean",
  "searchable_text",
] as const;

export type CategoryFieldType = (typeof SUPPORTED_CATEGORY_FIELD_TYPES)[number];

export type SchemaVersion = {
  version: number;
  active: boolean;
};

export type CategoryFieldOption = {
  value: string;
  label: string;
};

export type CategoryFieldValidation = {
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
};

export type CategoryField = {
  key: string;
  label: string;
  type: CategoryFieldType;
  required: boolean;
  order: number;
  destination: "attributes";
  options?: CategoryFieldOption[];
  option_source?: "brands" | "models";
  depends_on?: string;
  allow_custom_value?: boolean;
  validation?: CategoryFieldValidation;
};

export type CategoryFormSchema = {
  category_key: string;
  category_slug: string;
  subcategory_slugs: string[];
  schema_version: SchemaVersion;
  requires_subcategory: boolean;
  fields: CategoryField[];
};

export type PhotoSlot = {
  key: string;
  label: string;
  required: boolean;
  order: number;
};

export type CategoryPhotoSchema = {
  category_key: string;
  category_slug: string;
  subcategory_slugs: string[];
  schema_version: SchemaVersion;
  max_photos: number;
  slots: PhotoSlot[];
};

export type CategorySchemaSnapshot = {
  contract_version: number;
  schema_version: number;
  generated_from: string;
  supported_field_types: CategoryFieldType[];
  global_field_keys: string[];
  schemas: CategoryFormSchema[];
  photo_schemas: CategoryPhotoSchema[];
};

type SubcategoryScopedSchema = {
  category_slug: string;
  subcategory_slugs: string[];
  schema_version: SchemaVersion;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFieldType(value: unknown): value is CategoryFieldType {
  return (
    typeof value === "string" &&
    SUPPORTED_CATEGORY_FIELD_TYPES.includes(value as CategoryFieldType)
  );
}

function isSchemaVersion(value: unknown): value is SchemaVersion {
  return (
    isRecord(value) &&
    typeof value.version === "number" &&
    Number.isInteger(value.version) &&
    value.version > 0 &&
    typeof value.active === "boolean"
  );
}

function isFieldOption(value: unknown): value is CategoryFieldOption {
  return isRecord(value) && typeof value.value === "string" && typeof value.label === "string";
}

function isValidation(value: unknown): value is CategoryFieldValidation {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return ["min", "max", "maxLength"].every(
    (key) => value[key] === undefined || typeof value[key] === "number",
  ) && (value.pattern === undefined || typeof value.pattern === "string");
}

function isField(value: unknown): value is CategoryField {
  if (!isRecord(value)) return false;
  const options = value.options;
  const source = value.option_source;
  return (
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    isFieldType(value.type) &&
    typeof value.required === "boolean" &&
    typeof value.order === "number" &&
    value.destination === "attributes" &&
    (options === undefined || (Array.isArray(options) && options.every(isFieldOption))) &&
    (source === undefined || source === "brands" || source === "models") &&
    (value.depends_on === undefined || typeof value.depends_on === "string") &&
    (value.allow_custom_value === undefined || typeof value.allow_custom_value === "boolean") &&
    isValidation(value.validation)
  );
}

function isFormSchema(value: unknown): value is CategoryFormSchema {
  return (
    isRecord(value) &&
    typeof value.category_key === "string" &&
    typeof value.category_slug === "string" &&
    isStringArray(value.subcategory_slugs) &&
    isSchemaVersion(value.schema_version) &&
    typeof value.requires_subcategory === "boolean" &&
    Array.isArray(value.fields) &&
    value.fields.every(isField)
  );
}

function isPhotoSlot(value: unknown): value is PhotoSlot {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    typeof value.required === "boolean" &&
    typeof value.order === "number"
  );
}

function isPhotoSchema(value: unknown): value is CategoryPhotoSchema {
  return (
    isRecord(value) &&
    typeof value.category_key === "string" &&
    typeof value.category_slug === "string" &&
    isStringArray(value.subcategory_slugs) &&
    isSchemaVersion(value.schema_version) &&
    typeof value.max_photos === "number" &&
    Array.isArray(value.slots) &&
    value.slots.every(isPhotoSlot)
  );
}

export function parseCategorySchemaSnapshot(value: unknown): CategorySchemaSnapshot | null {
  if (!isRecord(value)) return null;
  if (value.contract_version !== CATEGORY_SCHEMA_CONTRACT_VERSION) return null;
  if (typeof value.schema_version !== "number" || value.schema_version < 1) return null;
  if (typeof value.generated_from !== "string") return null;
  if (!isStringArray(value.global_field_keys)) return null;
  if (!Array.isArray(value.supported_field_types) || !value.supported_field_types.every(isFieldType)) {
    return null;
  }
  if (!Array.isArray(value.schemas) || !value.schemas.every(isFormSchema)) return null;
  if (!Array.isArray(value.photo_schemas) || !value.photo_schemas.every(isPhotoSchema)) return null;

  return value as CategorySchemaSnapshot;
}

function findActiveScopedSchema<T extends SubcategoryScopedSchema>(
  schemas: T[],
  categorySlug: string,
  subcategorySlug?: string | null,
): T | null {
  const candidates = schemas.filter(
    (schema) => schema.category_slug === categorySlug && schema.schema_version.active,
  );
  if (candidates.length === 0) {
    return null;
  }

  if (subcategorySlug) {
    const exact = candidates
      .filter((schema) => schema.subcategory_slugs.includes(subcategorySlug))
      .sort((left, right) => left.subcategory_slugs.length - right.subcategory_slugs.length);
    if (exact[0]) {
      return exact[0];
    }
  }

  return candidates.find((schema) => schema.subcategory_slugs.length === 0) ?? candidates[0] ?? null;
}

export function getActiveCategoryFormSchema(
  snapshot: CategorySchemaSnapshot,
  categorySlug: string,
  subcategorySlug?: string | null,
): CategoryFormSchema | null {
  return findActiveScopedSchema(snapshot.schemas, categorySlug, subcategorySlug);
}

export function getActiveCategoryPhotoSchema(
  snapshot: CategorySchemaSnapshot,
  categorySlug: string,
  subcategorySlug?: string | null,
): CategoryPhotoSchema | null {
  return findActiveScopedSchema(snapshot.photo_schemas, categorySlug, subcategorySlug);
}
