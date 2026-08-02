import { sanitizeImageUrl } from "@/lib/images/validate-image-url";

export type ListingImageSource = {
  image_url?: string | null;
  image_urls?: string[] | null;
  image?: string | null;
};

export const LISTING_IMAGE_FALLBACK_CLASS = "from-slate-100 to-gray-50";

/** Shared image list — same order on cards and detail pages. */
export function getListingImages(listing: ListingImageSource): string[] {
  const fromUrls = (listing.image_urls ?? [])
    .map(sanitizeImageUrl)
    .filter((url): url is string => url !== null);
  if (fromUrls.length > 0) {
    return fromUrls;
  }

  const imageUrl = sanitizeImageUrl(listing.image_url);
  if (imageUrl) {
    return [imageUrl];
  }

  const legacyImage = sanitizeImageUrl(listing.image);
  if (legacyImage) {
    return [legacyImage];
  }

  return [];
}

export function getPrimaryListingImage(listing: ListingImageSource): string | null {
  return getListingImages(listing)[0] ?? null;
}

/** Public siyahılar üçün — ən azı bir etibarlı şəkil URL-i olmalıdır. */
export function listingHasImages(listing: ListingImageSource): boolean {
  return getListingImages(listing).length > 0;
}
