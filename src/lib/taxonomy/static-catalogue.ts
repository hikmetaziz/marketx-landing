import { ALL_CATEGORIES } from "@/constants/data";
import { categoryToSlug } from "@/lib/categories";
import { ICON_BY_TITLE } from "@/constants/category-catalogue";
import type { CategoryCatalogueEntry } from "@/lib/taxonomy/catalogue-types";

/** Supabase əlçatan olmadıqda — statik 16 kateqoriya */
export function buildStaticCatalogue(): CategoryCatalogueEntry[] {
  return ALL_CATEGORIES.map((title) => {
    const slug = categoryToSlug(title);
    return {
      id: slug,
      title,
      slug,
      icon: ICON_BY_TITLE[title],
      imageBasePath: `/images/catalogue/${slug}`,
    };
  });
}
