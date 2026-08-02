import { unstable_cache } from "next/cache";

import { getPrimaryListingImage, type ListingImageSource } from "@/lib/listings/listing-images";

async function probeImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const getCachedImageReachable = unstable_cache(
  async (url: string) => probeImageUrl(url),
  ["listing-image-reachable"],
  { revalidate: 86_400 },
);

export async function listingHasReachableImage(listing: ListingImageSource): Promise<boolean> {
  const url = getPrimaryListingImage(listing);
  if (!url) {
    return false;
  }

  return getCachedImageReachable(url);
}

export async function filterListingsWithReachableImages<T extends ListingImageSource>(
  listings: T[],
): Promise<T[]> {
  if (listings.length === 0) {
    return listings;
  }

  const results = await Promise.all(
    listings.map(async (listing) => ({
      listing,
      ok: await listingHasReachableImage(listing),
    })),
  );

  return results.filter(({ ok }) => ok).map(({ listing }) => listing);
}
