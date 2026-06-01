import type { MetadataRoute } from "next";

import { SITE } from "@/constants/data";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { getPublicListingSlugs } from "@/lib/listings/live-listings";

export const revalidate = 3600;

const PUBLIC_PAGES: Array<{
  path: string;
  changeFrequency: "weekly" | "monthly" | "daily";
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/listings", changeFrequency: "daily", priority: 0.9 },
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

  const staticEntries = PUBLIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  const categoryEntries = CATEGORY_SLUGS.map((slug) => ({
    url: `${SITE.url}/categories/${slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const listingEntries = listingSlugs.map(({ slug, updated_at }) => ({
    url: `${SITE.url}/listings/${slug}`,
    lastModified: updated_at ? new Date(updated_at) : lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...listingEntries];
}
