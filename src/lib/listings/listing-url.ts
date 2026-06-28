import { SITE } from "@/constants/data";

/** Canonical public listing URL — mobil Universal/App Link ilə eyni format. */
export function getListingPublicUrl(slug: string): string {
  return `${SITE.url}/listings/${encodeURIComponent(slug)}`;
}

export function getListingPath(slug: string): string {
  return `/listings/${encodeURIComponent(slug)}`;
}

/** UUID deyil, slug kimi qəbul et (deep link / share). */
export function isListingUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function listingLookupField(value: string): "id" | "slug" {
  return isListingUuid(value) ? "id" : "slug";
}
