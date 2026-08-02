import type { Metadata } from "next";

import { SITE } from "@/constants/data";
import { sanitizeImageUrl } from "@/lib/images/validate-image-url";
import { formatListingPrice } from "@/lib/listings/format";
import { getDefaultOgImageMetadata } from "@/lib/seo-assets";
import { createPageMetadata } from "@/lib/seo";

const DESCRIPTION_MAX_LENGTH = 150;

export type ListingSeoInput = {
  title: string;
  description: string | null;
  price: number;
  slug: string;
  imageUrl: string | null;
  canonicalPath?: string;
};

export function truncateListingDescription(
  description: string | null | undefined,
  maxLength = DESCRIPTION_MAX_LENGTH,
): string {
  const text = (description ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trimEnd();
}

export function toAbsoluteImageUrl(url: string | null | undefined): string | undefined {
  const safe = sanitizeImageUrl(url);
  if (!safe) {
    return undefined;
  }

  if (safe.startsWith("http://") || safe.startsWith("https://")) {
    return safe;
  }

  if (safe.startsWith("/")) {
    return `${SITE.url}${safe}`;
  }

  return undefined;
}

export function createPublicListingMetadata(listing: ListingSeoInput): Metadata {
  const path = listing.canonicalPath ?? `/elanlar/${listing.slug}`;
  const truncatedDescription = truncateListingDescription(listing.description);
  const price = formatListingPrice(listing.price);
  const seoTitle = `${listing.title} - ${price}`;
  const description =
    truncatedDescription || `${listing.title} - ${price}. MarktX elan platforması.`;
  const ogImage = toAbsoluteImageUrl(listing.imageUrl);
  const ogImageMeta = ogImage
    ? { url: ogImage, alt: listing.title }
    : getDefaultOgImageMetadata(listing.title);
  const ogTitle = `${seoTitle} | ${SITE.name}`;
  const ogDescription = truncatedDescription
    ? `${truncatedDescription} - ${price}`
    : `${listing.title} - ${price}`;

  const base = createPageMetadata({
    title: seoTitle,
    description,
    path,
  });

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      title: ogTitle,
      description: ogDescription,
      images: [ogImageMeta],
    },
    twitter: {
      ...base.twitter,
      title: ogTitle,
      description: ogDescription,
      images: [ogImageMeta.url],
    },
  };
}

export function createNonPublicListingMetadata(slug: string, canonicalPath?: string): Metadata {
  return {
    robots: { index: false, follow: false },
    alternates: { canonical: canonicalPath ?? `/elanlar/${slug}` },
  };
}
