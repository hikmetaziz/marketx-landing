import { enrichAttributeDefinitionsWithOptions } from "@/lib/category-schema/resolve-category-options";
import {
  getActiveCategoryFormSchema,
  getActiveCategoryPhotoSchema,
} from "@/lib/category-schema/schema-contract";
import type {
  CategoryField,
  CategoryFormSchema,
  CategoryPhotoSchema,
  CategorySchemaSnapshot,
} from "@/lib/category-schema/schema-contract";
import type {
  ListingTaxonomy,
  TaxonomyAttributeDefinition,
  TaxonomyCategory,
  TaxonomySubcategory,
} from "@/lib/taxonomy/listing-taxonomy-types";

type CategorySchemaSelection = {
  category: TaxonomyCategory;
  subcategory: TaxonomySubcategory | null;
  formSchema: CategoryFormSchema | null;
  photoSchema: CategoryPhotoSchema | null;
};

function byOrderThenKey<T extends { order: number; key: string }>(left: T, right: T): number {
  return left.order - right.order || left.key.localeCompare(right.key);
}

function supportsSubcategory(
  schema: CategoryFormSchema | CategoryPhotoSchema,
  subcategory: TaxonomySubcategory | null,
): boolean {
  if (schema.subcategory_slugs.length === 0) {
    return true;
  }
  if (!subcategory) {
    return true;
  }
  return schema.subcategory_slugs.includes(subcategory.slug);
}

export function getCategorySchemaSelection(
  taxonomy: ListingTaxonomy,
  categoryId: string | null,
  subcategoryId: string | null,
  snapshot?: CategorySchemaSnapshot | null,
): CategorySchemaSelection | null {
  if (!categoryId || !snapshot) {
    return null;
  }

  const category = taxonomy.categories.find((item) => item.id === categoryId);
  if (!category) {
    return null;
  }

  const subcategory = subcategoryId
    ? category.subcategories.find((item) => item.id === subcategoryId) ?? null
    : null;
  const formSchema = getActiveCategoryFormSchema(snapshot, category.slug, subcategory?.slug ?? null);
  const photoSchema = getActiveCategoryPhotoSchema(snapshot, category.slug, subcategory?.slug ?? null);

  return {
    category,
    subcategory,
    formSchema:
      formSchema && supportsSubcategory(formSchema, subcategory) ? formSchema : null,
    photoSchema:
      photoSchema && supportsSubcategory(photoSchema, subcategory) ? photoSchema : null,
  };
}

export function shouldShowCategorySchemaFields(
  formSchema: CategoryFormSchema | null,
  subcategory: TaxonomySubcategory | null,
): boolean {
  if (!formSchema) {
    return false;
  }
  return !formSchema.requires_subcategory || Boolean(subcategory);
}

function fieldOptions(field: CategoryField): string[] {
  return (field.options ?? []).map((option) => option.value);
}

export function categoryFormSchemaToAttributeDefinitions(
  schema: CategoryFormSchema,
  categoryId: string,
): TaxonomyAttributeDefinition[] {
  return [...schema.fields].sort(byOrderThenKey).map((field) => ({
    id: `schema-v${schema.schema_version.version}-${schema.category_key}-${field.key}`,
    category_id: categoryId,
    subcategory_id: null,
    key: field.key,
    label_az: field.label,
    type: field.type,
    options: fieldOptions(field),
    is_required: field.required,
    is_filterable: field.type === "select" || field.type === "multi_select",
    sort_order: field.order,
    option_source: field.option_source,
    depends_on: field.depends_on,
    allow_custom_value: field.allow_custom_value,
    validation: field.validation,
    schema_version: schema.schema_version.version,
  }));
}

export function getSchemaAttributeDefinitions(
  taxonomy: ListingTaxonomy,
  categoryId: string | null,
  subcategoryId: string | null,
  snapshot?: CategorySchemaSnapshot | null,
  attributeValues?: Record<string, unknown>,
): TaxonomyAttributeDefinition[] | null {
  const selection = getCategorySchemaSelection(taxonomy, categoryId, subcategoryId, snapshot);
  if (!selection?.formSchema) {
    return null;
  }
  if (!shouldShowCategorySchemaFields(selection.formSchema, selection.subcategory)) {
    return [];
  }
  const definitions = categoryFormSchemaToAttributeDefinitions(
    selection.formSchema,
    selection.category.id,
  );
  return enrichAttributeDefinitionsWithOptions(definitions, {
    categoryKey: selection.formSchema.category_key,
    subcategorySlug: selection.subcategory?.slug ?? null,
    attributeValues,
  });
}

export function getResolvedPhotoLimit(
  taxonomy: ListingTaxonomy,
  categoryId: string | null,
  subcategoryId: string | null,
  snapshot?: CategorySchemaSnapshot | null,
  fallbackMax = 6,
): number {
  const selection = getCategorySchemaSelection(taxonomy, categoryId, subcategoryId, snapshot);
  return selection?.photoSchema?.max_photos ?? fallbackMax;
}

export function getResolvedListingSchemaVersions(
  taxonomy: ListingTaxonomy,
  categoryId: string | null,
  subcategoryId: string | null,
  snapshot?: CategorySchemaSnapshot | null,
): { form_schema_version?: number; photo_schema_version?: number } {
  const selection = getCategorySchemaSelection(taxonomy, categoryId, subcategoryId, snapshot);
  return {
    form_schema_version: selection?.formSchema?.schema_version.version,
    photo_schema_version: selection?.photoSchema?.schema_version.version,
  };
}
