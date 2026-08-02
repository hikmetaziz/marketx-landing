import type { MetadataRoute } from "next";

import { SITE } from "@/constants/data";
import { getPublicListingSlugs } from "@/lib/listings/live-listings";
import { getPublicStoreSlugs } from "@/lib/stores/stores";
import { getCatalogueSlugs } from "@/lib/taxonomy/fetch-catalogue";
import { getCanonicalLeafRoutes } from "@/lib/taxonomy/marktx-taxonomy";

export const revalidate = 3600;

const PUBLIC_PAGES: Array<{
  path: string;
  changeFrequency: "weekly" | "monthly" | "daily";
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/elanlar", changeFrequency: "daily", priority: 0.9 },
  { path: "/stores", changeFrequency: "daily", priority: 0.8 },
  { path: "/categories", changeFrequency: "monthly", priority: 0.8 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.9 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.9 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const listingSlugs = await getPublicListingSlugs();
  const storeSlugs = await getPublicStoreSlugs();

  const staticEntries = PUBLIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  const categorySlugs = await getCatalogueSlugs();

  const categoryEntries = categorySlugs.map((slug) => ({
    url: `${SITE.url}/categories/${slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const leafCategoryEntries = getCanonicalLeafRoutes().map((route) => ({
    url: `${SITE.url}/categories/${route.categorySlug}?sub=${route.subcategorySlug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.68,
  }));

  const listingEntries = listingSlugs.map(({ slug, updated_at }) => ({
    url: `${SITE.url}/elanlar/${slug}`,
    lastModified: updated_at ? new Date(updated_at) : lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const storeEntries = storeSlugs.map(({ slug, created_at }) => ({
    url: `${SITE.url}/stores/${slug}`,
    lastModified: created_at ? new Date(created_at) : lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  return [...staticEntries, ...categoryEntries, ...leafCategoryEntries, ...listingEntries, ...storeEntries];
}
