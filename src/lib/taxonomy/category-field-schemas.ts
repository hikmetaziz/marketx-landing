import type {
  AttributeType,
  ListingTaxonomy,
  TaxonomyAttributeDefinition,
  TaxonomyCategory,
} from "@/lib/taxonomy/listing-taxonomy-types";

type SchemaFieldType = Extract<AttributeType, "text" | "number" | "select" | "boolean">;

type SchemaField = {
  key: string;
  label_az: string;
  type: SchemaFieldType;
  options?: string[];
  is_required?: boolean;
  is_filterable?: boolean;
  sort_order: number;
};

export type CategoryFieldSchema = {
  key: "automobile" | "real_estate" | "phone";
  categorySlugs: string[];
  fields: SchemaField[];
};

export const CATEGORY_FIELD_SCHEMAS: CategoryFieldSchema[] = [
  {
    key: "automobile",
    categorySlugs: ["avtomobil-ve-neqliyyat", "neqliyyat"],
    fields: [
      { key: "brand", label_az: "Marka", type: "text", is_required: true, is_filterable: true, sort_order: 10 },
      { key: "model", label_az: "Model", type: "text", is_required: true, is_filterable: true, sort_order: 20 },
      { key: "year", label_az: "Buraxılış ili", type: "number", is_required: true, is_filterable: true, sort_order: 30 },
      { key: "mileage", label_az: "Yürüş", type: "number", is_filterable: true, sort_order: 40 },
      {
        key: "fuel_type",
        label_az: "Yanacaq növü",
        type: "select",
        options: ["Benzin", "Dizel", "Hibrid", "Elektrik", "Qaz"],
        is_filterable: true,
        sort_order: 50,
      },
      {
        key: "transmission",
        label_az: "Sürətlər qutusu",
        type: "select",
        options: ["Avtomat", "Mexaniki", "Robot", "Variator"],
        is_filterable: true,
        sort_order: 60,
      },
    ],
  },
  {
    key: "real_estate",
    categorySlugs: ["dasinmaz-emlak"],
    fields: [
      {
        key: "property_type",
        label_az: "Əmlak növü",
        type: "select",
        options: ["Mənzil", "Həyət evi / villa", "Torpaq", "Obyekt", "Ofis"],
        is_required: true,
        is_filterable: true,
        sort_order: 10,
      },
      { key: "area", label_az: "Sahə (m²)", type: "number", is_required: true, is_filterable: true, sort_order: 20 },
      { key: "rooms", label_az: "Otaq sayı", type: "number", is_filterable: true, sort_order: 30 },
      { key: "floor", label_az: "Mərtəbə", type: "number", is_filterable: true, sort_order: 40 },
      {
        key: "document_type",
        label_az: "Sənəd",
        type: "select",
        options: ["Çıxarış", "Müqavilə", "Sərəncam", "Sənədsiz"],
        is_filterable: true,
        sort_order: 50,
      },
    ],
  },
  {
    key: "phone",
    categorySlugs: ["telefon"],
    fields: [
      { key: "brand", label_az: "Marka", type: "text", is_required: true, is_filterable: true, sort_order: 10 },
      { key: "model", label_az: "Model", type: "text", is_required: true, is_filterable: true, sort_order: 20 },
      {
        key: "storage",
        label_az: "Yaddaş",
        type: "select",
        options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"],
        is_filterable: true,
        sort_order: 30,
      },
      {
        key: "ram",
        label_az: "RAM",
        type: "select",
        options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"],
        is_filterable: true,
        sort_order: 40,
      },
      { key: "color", label_az: "Rəng", type: "text", is_filterable: true, sort_order: 50 },
      { key: "has_warranty", label_az: "Zəmanət var", type: "boolean", is_filterable: true, sort_order: 60 },
    ],
  },
];

function schemaForCategory(category: TaxonomyCategory): CategoryFieldSchema | undefined {
  return CATEGORY_FIELD_SCHEMAS.find((schema) => schema.categorySlugs.includes(category.slug));
}

function toAttributeDefinition(
  category: TaxonomyCategory,
  schema: CategoryFieldSchema,
  field: SchemaField,
): TaxonomyAttributeDefinition {
  return {
    id: `schema-${schema.key}-${field.key}`,
    category_id: category.id,
    subcategory_id: null,
    key: field.key,
    label_az: field.label_az,
    type: field.type,
    options: field.options ?? [],
    is_required: field.is_required ?? false,
    is_filterable: field.is_filterable ?? false,
    sort_order: field.sort_order,
  };
}

export function applyCategoryFieldSchemas(taxonomy: ListingTaxonomy): ListingTaxonomy {
  if (taxonomy.categories.length === 0) {
    return taxonomy;
  }

  const existingCategoryFieldKeys = new Set(
    taxonomy.attributes
      .filter((definition) => definition.subcategory_id === null)
      .map((definition) => `${definition.category_id}:${definition.key}`),
  );

  const schemaAttributes = taxonomy.categories.flatMap((category) => {
    const schema = schemaForCategory(category);
    if (!schema) {
      return [];
    }

    return schema.fields
      .filter((field) => !existingCategoryFieldKeys.has(`${category.id}:${field.key}`))
      .map((field) => toAttributeDefinition(category, schema, field));
  });

  if (schemaAttributes.length === 0) {
    return taxonomy;
  }

  const attributes = [...taxonomy.attributes, ...schemaAttributes];
  const categories = taxonomy.categories.map((category) => ({
    ...category,
    attributes: attributes.filter((item) => item.category_id === category.id && !item.subcategory_id),
  }));

  return {
    ...taxonomy,
    categories,
    attributes,
  };
}