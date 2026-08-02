import { cache } from "react";

import type { CategoryCatalogueEntry } from "@/lib/taxonomy/catalogue-types";
import { resolveCatalogueIconKey } from "@/lib/taxonomy/icon-key";
import { buildStaticCatalogue } from "@/lib/taxonomy/static-catalogue";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { normalizeCategorySlug } from "@/lib/taxonomy/category-filter";

const HIDDEN_CATALOGUE_SLUGS = new Set(["mebel-ve-interyer"]);

function mapRow(row: {
  id: string;
  slug: string;
  name: string;
  icon_key: string | null;
  catalogue_image_path: string | null;
}): CategoryCatalogueEntry {
  const imagePath = row.catalogue_image_path?.trim();
  return {
    id: row.id,
    title: row.name,
    slug: row.slug,
    icon: resolveCatalogueIconKey(row.slug, row.icon_key),
    imageBasePath: imagePath || `/images/catalogue/${row.slug}`,
  };
}

export const getCatalogue = cache(async (): Promise<CategoryCatalogueEntry[]> => {
  if (!isSupabaseConfigured()) {
    return buildStaticCatalogue();
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, sort_order, icon_key, catalogue_image_path, home_visible")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) {
      return buildStaticCatalogue();
    }

    return data.map((row) => mapRow(row)).filter((entry) => !HIDDEN_CATALOGUE_SLUGS.has(entry.slug));
  } catch {
    return buildStaticCatalogue();
  }
});

export const getCatalogueSlugs = cache(async (): Promise<string[]> => {
  const catalogue = await getCatalogue();
  return catalogue.map((entry) => entry.slug);
});

export async function getCatalogueEntryBySlug(
  slug: string,
): Promise<CategoryCatalogueEntry | undefined> {
  const normalized = normalizeCategorySlug(slug);
  const catalogue = await getCatalogue();
  return catalogue.find((entry) => entry.slug === normalized);
}
