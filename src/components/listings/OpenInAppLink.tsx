"use client";

import { Smartphone } from "lucide-react";
import { useSyncExternalStore } from "react";

import { getAndroidListingIntentUrl, isAndroidMobileBrowser } from "@/lib/deep-link/android-intent";

type OpenInAppLinkProps = {
  slug: string;
};

function subscribeNoop() {
  return () => {};
}

function getAndroidSnapshot() {
  return isAndroidMobileBrowser(navigator.userAgent);
}

/** Android brauzerdə görünür — App Link verify olmadan tətbiqi açmağa cəhd edir. */
export function OpenInAppLink({ slug }: OpenInAppLinkProps) {
  const visible = useSyncExternalStore(subscribeNoop, getAndroidSnapshot, () => false);

  if (!visible) {
    return null;
  }

  return (
    <a
      href={getAndroidListingIntentUrl(slug)}
      aria-label="MarktX tətbiqində aç"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-surface/50 px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
    >
      <Smartphone className="h-4 w-4" />
      Tətbiqdə aç
    </a>
  );
}
