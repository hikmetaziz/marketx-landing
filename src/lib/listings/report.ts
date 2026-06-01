import { SITE } from "@/constants/data";

export function buildListingReportMailto(title: string, listingUrl: string): string {
  const subject = "Elan şikayəti";
  const body = `Elan: ${title}\nURL: ${listingUrl}`;

  return `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
