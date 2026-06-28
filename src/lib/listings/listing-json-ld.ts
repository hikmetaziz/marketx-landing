import { SITE } from "@/constants/data";
import { getListingPublicUrl } from "@/lib/listings/listing-url";
import { formatListingPrice } from "@/lib/listings/format";
import { truncateListingDescription, toAbsoluteImageUrl } from "@/lib/listings/listing-seo";
import { getDefaultOgImageUrl } from "@/lib/seo-assets";
import type { PublicListingStatus } from "@/types/live-listing";

export type ListingJsonLdInput = {
  title: string;
  description: string | null;
  price: number;
  slug: string;
  status: PublicListingStatus;
  imageUrl: string | null;
  category: string;
  city: string;
};

export function buildListingJsonLd(listing: ListingJsonLdInput) {
  const listingUrl = getListingPublicUrl(listing.slug);
  const image = toAbsoluteImageUrl(listing.imageUrl) ?? getDefaultOgImageUrl();
  const description =
    truncateListingDescription(listing.description) ||
    `${listing.title} — ${formatListingPrice(listing.price)}`;

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description,
    image,
    category: listing.category,
    url: listingUrl,
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: "AZN",
      availability:
        listing.status === "sold"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: listingUrl,
      seller: {
        "@type": "Organization",
        name: SITE.name,
      },
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana səhifə",
        item: SITE.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Elanlar",
        item: `${SITE.url}/listings`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: listing.title,
        item: listingUrl,
      },
    ],
  };

  return [product, breadcrumb];
}
