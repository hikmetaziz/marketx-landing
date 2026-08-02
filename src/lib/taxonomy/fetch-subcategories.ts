import type { SubcategoryEntry } from "@/lib/taxonomy/catalogue-types";
import { normalizeCategorySlug, resolveCategoryFilter } from "@/lib/taxonomy/category-filter";
import {
  getCanonicalLeafBySlugOrAlias,
  isCanonicalParentSlug,
  mergeCanonicalSubcategoryEntries,
} from "@/lib/taxonomy/marktx-taxonomy";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cache } from "react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export const getSubcategoriesByCategorySlug = cache(
  async (categorySlug: string): Promise<SubcategoryEntry[]> => {
    const slug = normalizeCategorySlug(categorySlug);
    const categoryFilter = await resolveCategoryFilter(slug);

    if (!categoryFilter?.categoryId || !isUuid(categoryFilter.categoryId)) {
      return isCanonicalParentSlug(slug) ? mergeCanonicalSubcategoryEntries(slug, []) : [];
    }

    if (!isSupabaseConfigured()) {
      return isCanonicalParentSlug(slug) ? mergeCanonicalSubcategoryEntries(slug, []) : [];
    }

    try {
      const supabase = await createClient();
      const withMetadata = await supabase
        .from("subcategories")
        .select(
          "id, slug, name, sort_order, group_key, group_label, group_order, taxonomy_version, is_listing_enabled, is_filter_enabled",
        )
        .eq("category_id", categoryFilter.categoryId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      let data = withMetadata.data as SubcategoryEntry[] | null;
      let error = withMetadata.error;

      if (error) {
        const fallback = await supabase
          .from("subcategories")
          .select("id, slug, name, sort_order")
          .eq("category_id", categoryFilter.categoryId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        data = fallback.data as SubcategoryEntry[] | null;
        error = fallback.error;
      }

      const entries = (error || !data?.length ? [] : data).map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        sort_order: row.sort_order,
        group_key: row.group_key ?? null,
        group_label: row.group_label ?? null,
        group_order: row.group_order ?? null,
        taxonomy_version: row.taxonomy_version ?? null,
        is_listing_enabled: row.is_listing_enabled ?? null,
        is_filter_enabled: row.is_filter_enabled ?? null,
      }));
      return mergeCanonicalSubcategoryEntries(slug, entries);
    } catch {
      return isCanonicalParentSlug(slug) ? mergeCanonicalSubcategoryEntries(slug, []) : [];
    }
  },
);

export async function getSubcategoryBySlug(
  categorySlug: string,
  subcategorySlug: string,
): Promise<SubcategoryEntry | null> {
  const normalized = subcategorySlug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const subcategories = await getSubcategoriesByCategorySlug(categorySlug);
  const direct = subcategories.find((entry) => entry.slug === normalized);
  if (direct) {
    return direct;
  }

  const canonical = getCanonicalLeafBySlugOrAlias(normalizeCategorySlug(categorySlug), normalized);
  if (!canonical) {
    return null;
  }
  return subcategories.find((entry) => entry.slug === canonical.slug) ?? null;
}
