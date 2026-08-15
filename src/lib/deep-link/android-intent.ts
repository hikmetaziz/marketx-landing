import { ANDROID_APP_PACKAGE } from "@/lib/deep-link/constants";
import { SITE } from "@/constants/data";
import { getListingPublicUrl } from "@/lib/listings/listing-url";

/**
 * Android Chrome intent URL — App Link verify olmasa belə "Tətbiqdə aç" düyməsi işləyir.
 * iOS / desktop üçün istifadə etməyin.
 */
export function getAndroidListingIntentUrl(slug: string): string {
  const fallback = getListingPublicUrl(slug);
  const path = `marketx.az/elanlar/${encodeURIComponent(slug)}`;

  return (
    `intent://${path}` +
    `#Intent;scheme=https;package=${ANDROID_APP_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};end`
  );
}

export function getAndroidStoreIntentUrl(slug: string): string {
  const fallback = `${SITE.url}/stores/${encodeURIComponent(slug)}`;
  const path = `marketx.az/stores/${encodeURIComponent(slug)}`;

  return (
    `intent://${path}` +
    `#Intent;scheme=https;package=${ANDROID_APP_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};end`
  );
}

/**
 * Chrome / Firefox / Samsung Internet — intent URL burada işləyir.
 * WhatsApp, Instagram və s. WebView-lərdə intent etibarsızdır; düyməni gizlədirik.
 */
export function isAndroidMobileBrowser(userAgent: string): boolean {
  if (!/Android/i.test(userAgent)) {
    return false;
  }

  if (/\; wv\)/.test(userAgent) || /WebView/i.test(userAgent)) {
    return false;
  }

  return true;
}
