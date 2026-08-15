import { cache } from "react";

import type { CategoryFilter } from "@/lib/taxonomy/catalogue-types";
import { getCatalogueEntryBySlug } from "@/lib/taxonomy/fetch-catalogue";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getDbCategoriesForSlug } from "@/lib/listings/category-map";

const LEGACY_SLUG_ALIASES: Record<string, string> = {
  avto: "avtomobil-ve-neqliyyat",
  avtomobil: "avtomobil-ve-neqliyyat",
  neqliyyat: "avtomobil-ve-neqliyyat",
  "nəqliyyat": "avtomobil-ve-neqliyyat",
  "ehtiyat-hisseleri": "avto-ehtiyat-hisseleri-ve-avadanliq",
  "avto-ehtiyat-hisseleri": "avto-ehtiyat-hisseleri-ve-avadanliq",
  "avto-avadanliq": "avto-ehtiyat-hisseleri-ve-avadanliq",
  "avto-aksesuarlar": "avto-ehtiyat-hisseleri-ve-avadanliq",
  telefonlar: "telefon",
  "mobil-telefonlar": "telefon",
  komputer: "elektronika",
  "kompüter": "elektronika",
  "usaq-alemi": "usaq-mehsullari",
  geyim: "geyim-ve-aksesuar",
};

export function normalizeCategorySlug(slug: string): string {
  const trimmed = slug.trim().toLowerCase();
  return LEGACY_SLUG_ALIASES[trimmed] ?? trimmed;
}

export const resolveCategoryFilter = cache(async (categorySlug: string): Promise<CategoryFilter | null> => {
  const slug = normalizeCategorySlug(categorySlug);
  const entry = await getCatalogueEntryBySlug(slug);

  if (!isSupabaseConfigured()) {
    const legacyTexts = getDbCategoriesForSlug(slug);
    if (legacyTexts.length === 0) {
      return null;
    }
    return { categoryId: "", legacyTexts };
  }

  try {
    const supabase = await createClient();

    let categoryId = entry?.id ?? "";
    let categoryName = entry?.title ?? "";

    if (!categoryId) {
      const { data: row } = await supabase
        .from("categories")
        .select("id, name")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!row) {
        const legacyTexts = getDbCategoriesForSlug(slug);
        if (legacyTexts.length === 0) {
          return null;
        }
        return { categoryId: "", legacyTexts };
      }

      categoryId = row.id;
      categoryName = row.name;
    }

    const { data: aliases } = await supabase
      .from("category_aliases")
      .select("alias")
      .eq("category_id", categoryId)
      .eq("is_active", true);

    const legacyTexts = new Set<string>(getDbCategoriesForSlug(slug));
    if (categoryName) {
      legacyTexts.add(categoryName);
    }
    for (const row of aliases ?? []) {
      if (typeof row.alias === "string" && row.alias.trim()) {
        legacyTexts.add(row.alias.trim());
      }
    }

    return {
      categoryId,
      legacyTexts: [...legacyTexts],
    };
  } catch {
    const legacyTexts = getDbCategoriesForSlug(slug);
    if (legacyTexts.length === 0) {
      return null;
    }
    return { categoryId: "", legacyTexts };
  }
});

export function applyCategoryFilterToQuery<Q>(query: Q, filter: CategoryFilter): Q {
  const q = query as {
    or: (filters: string) => Q;
    eq: (column: string, value: string) => Q;
    in: (column: string, values: string[]) => Q;
  };

  if (filter.categoryId) {
    if (filter.legacyTexts.length > 0) {
      const escaped = filter.legacyTexts.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",");
      return q.or(`category_id.eq.${filter.categoryId},category.in.(${escaped})`);
    }
    return q.eq("category_id", filter.categoryId);
  }

  if (filter.legacyTexts.length > 0) {
    return q.in("category", filter.legacyTexts);
  }

  return query;
}
