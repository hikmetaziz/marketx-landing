import type { Metadata } from "next";

import { SITE } from "@/constants/data";
import { getDefaultOgImageMetadata, getDefaultOgImageUrl } from "@/lib/seo-assets";

type PageMetaOptions = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  ogImage?: { url: string; alt: string; width?: number; height?: number };
};

export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  ogImage,
}: PageMetaOptions): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const url = `${SITE.url}${canonical}`;
  const image = ogImage ?? getDefaultOgImageMetadata();
  const ogTitle = `${title} | ${SITE.name}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE.name,
      locale: "az_AZ",
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image.url],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

export const DEFAULT_METADATA: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Online elan platforması | ${SITE.domain}`,
    template: `%s | ${SITE.name}`,
  },
  description:
    "MarktX — Azərbaycanda online elan platforması. Alıcı və satıcıları bir araya gətirən rəsmi veb-sayt: marketx.az",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    siteName: SITE.name,
    locale: "az_AZ",
    type: "website",
    url: SITE.url,
    images: [getDefaultOgImageMetadata()],
  },
  twitter: {
    card: "summary_large_image",
    images: [getDefaultOgImageUrl()],
  },
};
