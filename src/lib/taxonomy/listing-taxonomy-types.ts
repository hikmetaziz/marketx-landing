import type {
  CategoryFieldType,
  CategoryFieldValidation,
} from "@/lib/category-schema/schema-contract";

export type AttributeType = CategoryFieldType;

export type TaxonomyAttributeDefinition = {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  key: string;
  label_az: string;
  type: AttributeType;
  options: string[];
  is_required: boolean;
  is_filterable: boolean;
  sort_order: number;
  option_source?: "brands" | "models";
  depends_on?: string;
  allow_custom_value?: boolean;
  validation?: CategoryFieldValidation;
  schema_version?: number;
};

export type TaxonomySubcategory = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  sort_order: number;
  group_key?: string | null;
  group_label?: string | null;
  group_order?: number | null;
  taxonomy_version?: string | null;
  is_listing_enabled?: boolean | null;
  is_filter_enabled?: boolean | null;
};

export type TaxonomyCategory = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  subcategories: TaxonomySubcategory[];
  attributes: TaxonomyAttributeDefinition[];
};

export type CategoryAlias = {
  alias: string;
  category_id: string;
  subcategory_id: string | null;
};

export type ListingTaxonomy = {
  categories: TaxonomyCategory[];
  attributes: TaxonomyAttributeDefinition[];
  aliases: CategoryAlias[];
};

export type ListingAttributeValues = Record<string, string | number | boolean | string[] | null>;

export const EMPTY_LISTING_TAXONOMY: ListingTaxonomy = {
  categories: [],
  attributes: [],
  aliases: [],
};
