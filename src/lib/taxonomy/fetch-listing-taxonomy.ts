import { cache } from "react";

import type {
  ListingTaxonomy,
  TaxonomyAttributeDefinition,
  TaxonomyCategory,
  TaxonomySubcategory,
} from "@/lib/taxonomy/listing-taxonomy-types";
import { createClient } from "@/lib/supabase/server";
import { applyCategoryFieldSchemas } from "@/lib/taxonomy/category-field-schemas";
import { mergeCanonicalTaxonomySubcategories } from "@/lib/taxonomy/marktx-taxonomy";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const HIDDEN_CATEGORY_SLUGS = new Set(["mebel-ve-interyer"]);

function parseOptions(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeAlias(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("az");
}

export const fetchListingTaxonomy = cache(async (): Promise<ListingTaxonomy> => {
  if (!isSupabaseConfigured()) {
    return { categories: [], attributes: [], aliases: [] };
  }

  try {
    const supabase = await createClient();
    const [categoriesResult, subcategoriesResult, attributesResult, aliasesResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, slug, name, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("subcategories")
        .select("id, category_id, slug, name, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("category_attribute_definitions")
        .select(
          "id, category_id, subcategory_id, key, label_az, type, options, is_required, is_filterable, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("category_aliases")
        .select("alias, category_id, subcategory_id")
        .eq("is_active", true),
    ]);

    if (categoriesResult.error || !categoriesResult.data?.length) {
      return { categories: [], attributes: [], aliases: [] };
    }

    const subcategories = (subcategoriesResult.data ?? []) as TaxonomySubcategory[];
    const attributes = (
      (attributesResult.data ?? []) as Array<Omit<TaxonomyAttributeDefinition, "options"> & { options: unknown }>
    ).map((item) => ({
      ...item,
      type: item.type as TaxonomyAttributeDefinition["type"],
      options: parseOptions(item.options),
    }));

    const categories = (categoriesResult.data as TaxonomyCategory[])
      .filter((category) => !HIDDEN_CATEGORY_SLUGS.has(category.slug))
      .map((category) => {
      const categorySubcategories = subcategories.filter((item) => item.category_id === category.id);
      return {
        ...category,
        subcategories: mergeCanonicalTaxonomySubcategories(
          category.slug,
          category.id,
          categorySubcategories,
        ),
        attributes: attributes.filter((item) => item.category_id === category.id && !item.subcategory_id),
      };
    });

    return applyCategoryFieldSchemas({
      categories,
      attributes,
      aliases: ((aliasesResult.data ?? []) as ListingTaxonomy["aliases"]).map((alias) => ({
        ...alias,
        alias: normalizeAlias(alias.alias),
      })),
    });
  } catch {
    return { categories: [], attributes: [], aliases: [] };
  }
});
