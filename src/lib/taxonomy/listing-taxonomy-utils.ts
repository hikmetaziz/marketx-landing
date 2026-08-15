import type {
  ListingTaxonomy,
  TaxonomyAttributeDefinition,
  TaxonomyCategory,
  TaxonomySubcategory,
} from "@/lib/taxonomy/listing-taxonomy-types";
import type { CategorySchemaSnapshot } from "@/lib/category-schema/schema-contract";
import {
  getCategorySchemaSelection,
  getSchemaAttributeDefinitions,
} from "@/lib/category-schema/resolve-category-schema";

export function getAttributeDefinitions(
  taxonomy: ListingTaxonomy,
  categoryId: string | null,
  subcategoryId: string | null,
  schemaSnapshot?: CategorySchemaSnapshot | null,
  attributeValues?: Record<string, unknown>,
): TaxonomyAttributeDefinition[] {
  if (!categoryId) {
    return [];
  }

  const schemaDefinitions = getSchemaAttributeDefinitions(
    taxonomy,
    categoryId,
    subcategoryId,
    schemaSnapshot,
    attributeValues,
  );
  if (schemaDefinitions !== null) {
    return schemaDefinitions;
  }

  const definitionsByKey = new Map<string, TaxonomyAttributeDefinition>();

  for (const definition of taxonomy.attributes) {
    if (definition.category_id === categoryId && !definition.subcategory_id) {
      definitionsByKey.set(definition.key, definition);
    }
  }

  if (subcategoryId) {
    for (const definition of taxonomy.attributes) {
      if (definition.subcategory_id === subcategoryId) {
        definitionsByKey.set(definition.key, definition);
      }
    }
  }

  return Array.from(definitionsByKey.values()).sort((a, b) => a.sort_order - b.sort_order);
}

export function findTaxonomyCategory(
  taxonomy: ListingTaxonomy,
  categoryId: string,
): TaxonomyCategory | undefined {
  return taxonomy.categories.find((category) => category.id === categoryId);
}

export function findTaxonomySubcategory(
  category: TaxonomyCategory,
  subcategoryId: string | null,
): TaxonomySubcategory | undefined {
  if (!subcategoryId) {
    return undefined;
  }
  return category.subcategories.find((subcategory) => subcategory.id === subcategoryId);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isAttributeValueEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function isSelectLike(definition: TaxonomyAttributeDefinition): boolean {
  return (
    definition.type === "select" ||
    definition.type === "searchable_select" ||
    definition.type === "dependent_select"
  );
}

function isTextLike(definition: TaxonomyAttributeDefinition): boolean {
  return (
    definition.type === "text" ||
    definition.type === "textarea" ||
    definition.type === "searchable_text"
  );
}

function getMaxTextLength(definition: TaxonomyAttributeDefinition): number {
  if (typeof definition.validation?.maxLength === "number") {
    return definition.validation.maxLength;
  }
  return definition.type === "textarea" ? 1000 : 200;
}

function validateTextPattern(definition: TaxonomyAttributeDefinition, value: string): boolean {
  if (!definition.validation?.pattern) {
    return true;
  }
  try {
    return new RegExp(definition.validation.pattern).test(value);
  } catch {
    return true;
  }
}

export function validateListingTaxonomyFields(
  taxonomy: ListingTaxonomy,
  input: {
    categoryId: string;
    subcategoryId: string | null;
    attributes: Record<string, unknown>;
  },
  schemaSnapshot?: CategorySchemaSnapshot | null,
): { ok: true; categoryName: string } | { ok: false; error: string } {
  if (!isUuid(input.categoryId)) {
    return { ok: false, error: "Kateqoriya seçin." };
  }

  const category = findTaxonomyCategory(taxonomy, input.categoryId);
  if (!category) {
    return { ok: false, error: "Kateqoriya seçimi yanlışdır." };
  }

  if (input.subcategoryId) {
    if (!isUuid(input.subcategoryId)) {
      return { ok: false, error: "Alt kateqoriya seçimi yanlışdır." };
    }
    const subcategory = findTaxonomySubcategory(category, input.subcategoryId);
    if (!subcategory) {
      return { ok: false, error: "Alt kateqoriya bu kateqoriyaya aid deyil." };
    }
  }

  const schemaSelection = getCategorySchemaSelection(
    taxonomy,
    input.categoryId,
    input.subcategoryId,
    schemaSnapshot,
  );
  if (
    schemaSelection?.formSchema?.requires_subcategory &&
    !schemaSelection.subcategory
  ) {
    return { ok: false, error: "Alt kateqoriya seçin." };
  }

  const definitions = getAttributeDefinitions(
    taxonomy,
    input.categoryId,
    input.subcategoryId,
    schemaSnapshot,
    input.attributes,
  );

  for (const definition of definitions) {
    const raw = input.attributes[definition.key];

    if (isAttributeValueEmpty(raw)) {
      if (definition.is_required) {
        return { ok: false, error: `${definition.label_az} sahəsini doldurun.` };
      }
      continue;
    }

    if (definition.type === "boolean") {
      if (typeof raw !== "boolean") {
        return { ok: false, error: `${definition.label_az} düzgün deyil.` };
      }
      continue;
    }

    if (definition.type === "number") {
      const number = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(number)) {
        return { ok: false, error: `${definition.label_az} rəqəm olmalıdır.` };
      }
      if (typeof definition.validation?.min === "number" && number < definition.validation.min) {
        return { ok: false, error: `${definition.label_az} düzgün deyil.` };
      }
      if (typeof definition.validation?.max === "number" && number > definition.validation.max) {
        return { ok: false, error: `${definition.label_az} düzgün deyil.` };
      }
      continue;
    }

    if (isSelectLike(definition)) {
      const value = typeof raw === "string" ? raw.trim() : "";
      const hasFixedOptions = definition.options.length > 0 && definition.allow_custom_value !== true;
      if (!value || (hasFixedOptions && !definition.options.includes(value))) {
        return { ok: false, error: `${definition.label_az} seçimi yanlışdır.` };
      }
      continue;
    }

    if (definition.type === "multi_select") {
      if (!Array.isArray(raw) || !raw.every((item) => typeof item === "string" && definition.options.includes(item))) {
        return { ok: false, error: `${definition.label_az} seçimi yanlışdır.` };
      }
      continue;
    }

    if (isTextLike(definition)) {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (value && (value.length > getMaxTextLength(definition) || !validateTextPattern(definition, value))) {
        return { ok: false, error: `${definition.label_az} düzgün deyil.` };
      }
      if (!value && definition.is_required) {
        return { ok: false, error: `${definition.label_az} sahəsini doldurun.` };
      }
    }
  }

  return { ok: true, categoryName: category.name };
}

export function sanitizeAttributesForInsert(
  taxonomy: ListingTaxonomy,
  categoryId: string,
  subcategoryId: string | null,
  attributes: Record<string, unknown>,
  schemaSnapshot?: CategorySchemaSnapshot | null,
): Record<string, string | number | boolean | string[]> {
  const definitions = getAttributeDefinitions(
    taxonomy,
    categoryId,
    subcategoryId,
    schemaSnapshot,
    attributes,
  );
  const result: Record<string, string | number | boolean | string[]> = {};

  for (const definition of definitions) {
    const raw = attributes[definition.key];
    if (isAttributeValueEmpty(raw)) {
      continue;
    }

    if (definition.type === "boolean" && typeof raw === "boolean") {
      result[definition.key] = raw;
    } else if (definition.type === "number" && Number.isFinite(Number(raw))) {
      result[definition.key] = Number(raw);
    } else if (isSelectLike(definition) && typeof raw === "string") {
      const value = raw.trim();
      const hasFixedOptions = definition.options.length > 0 && definition.allow_custom_value !== true;
      if (value && (!hasFixedOptions || definition.options.includes(value))) {
        result[definition.key] = value.slice(0, getMaxTextLength(definition));
      }
    } else if (
      definition.type === "multi_select" &&
      Array.isArray(raw) &&
      raw.every((item) => typeof item === "string" && definition.options.includes(item))
    ) {
      result[definition.key] = raw;
    } else if (isTextLike(definition) && typeof raw === "string" && raw.trim()) {
      const value = raw.trim();
      if (value.length <= getMaxTextLength(definition) && validateTextPattern(definition, value)) {
        result[definition.key] = value.slice(0, getMaxTextLength(definition));
      }
    }
  }

  return result;
}
