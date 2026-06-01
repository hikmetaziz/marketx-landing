import { POPULAR_LISTINGS } from "@/constants/data";
import type { SampleListing } from "@/types/listing";

const SAMPLE_CATEGORY_BY_SLUG: Record<string, string> = {
  "paltaryuyan-masin": "Məişət texnikası",
  tozsoran: "Məişət texnikası",
  "robot-tozsoran": "Məişət texnikası",
  blender: "Məişət texnikası",
  "mikrodalgali-soba": "Məişət texnikası",
  "kofe-masini": "Məişət texnikası",
  "rahat-kreslo": "Mebel və interyer",
  "gece-lampasi": "Mebel və interyer",
};

export function getSampleListings(): readonly SampleListing[] {
  return POPULAR_LISTINGS;
}

export function getSampleListingBySlug(slug: string): SampleListing | undefined {
  return POPULAR_LISTINGS.find((listing) => listing.slug === slug);
}

export function getSampleListingSlugs(): string[] {
  return POPULAR_LISTINGS.map((listing) => listing.slug);
}

export function getSimilarSampleListings(currentSlug: string, limit = 4): SampleListing[] {
  const currentCategory = SAMPLE_CATEGORY_BY_SLUG[currentSlug];
  const others = POPULAR_LISTINGS.filter((listing) => listing.slug !== currentSlug);

  const sameCategory = currentCategory
    ? others.filter((listing) => SAMPLE_CATEGORY_BY_SLUG[listing.slug] === currentCategory)
    : [];

  const combined = [...sameCategory];
  for (const listing of others) {
    if (combined.length >= limit) break;
    if (!combined.some((item) => item.id === listing.id)) {
      combined.push(listing);
    }
  }

  return combined.slice(0, limit);
}
