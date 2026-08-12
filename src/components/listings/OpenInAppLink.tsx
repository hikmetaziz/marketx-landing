"use client";

import { Smartphone } from "lucide-react";
import { useSyncExternalStore } from "react";

import {
  getAndroidListingIntentUrl,
  getAndroidStoreIntentUrl,
  isAndroidMobileBrowser,
} from "@/lib/deep-link/android-intent";

type OpenInAppLinkProps = {
  type?: "listing" | "store";
  slug: string;
};

function subscribeBrowserState(onChange: () => void) {
  const mobileQuery = window.matchMedia("(max-width: 767px)");
  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");

  mobileQuery.addEventListener("change", onChange);
  standaloneQuery.addEventListener("change", onChange);
  fullscreenQuery.addEventListener("change", onChange);

  return () => {
    mobileQuery.removeEventListener("change", onChange);
    standaloneQuery.removeEventListener("change", onChange);
    fullscreenQuery.removeEventListener("change", onChange);
  };
}

function getAndroidSnapshot() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    iosNavigator.standalone === true;

  return isMobileViewport && isAndroidMobileBrowser(navigator.userAgent) && !isStandalone;
}

/** Android brauzerdə görünür — App Link verify olmadan tətbiqi açmağa cəhd edir. */
export function OpenInAppLink({ type = "listing", slug }: OpenInAppLinkProps) {
  const visible = useSyncExternalStore(subscribeBrowserState, getAndroidSnapshot, () => false);

  if (!visible) {
    return null;
  }

  const href =
    type === "store"
      ? getAndroidStoreIntentUrl(slug)
      : getAndroidListingIntentUrl(slug);

  return (
    <a
      href={href}
      aria-label="MarktX tətbiqində aç"
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-surface/50 px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary md:w-auto"
    >
      <Smartphone className="h-4 w-4" />
      Tətbiqdə aç
    </a>
  );
}
