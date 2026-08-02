import { SITE } from "@/constants/data";

/** Default share preview when a page has no specific image. */
export const DEFAULT_OG_IMAGE_PATH = "/images/hero-marketx.png";

export function getDefaultOgImageUrl(): string {
  return `${SITE.url}${DEFAULT_OG_IMAGE_PATH}`;
}

export function getDefaultOgImageMetadata(alt = `${SITE.name} — online elan platforması`) {
  return {
    url: getDefaultOgImageUrl(),
    alt,
    width: 1672,
    height: 941,
  };
}

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: getDefaultOgImageUrl(),
    email: SITE.contactEmail,
    areaServed: {
      "@type": "Country",
      name: "Azərbaycan",
    },
  };
}

export function getBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE.url}${item.path}`,
    })),
  };
}
