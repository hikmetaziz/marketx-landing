"use client";

import { useEffect } from "react";

function isStandaloneMode(): boolean {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    iosNavigator.standalone === true
  );
}

export function PwaStandaloneMode() {
  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");

    const syncStandaloneMode = () => {
      if (isStandaloneMode()) {
        document.body.dataset.marktxPwaStandalone = "true";
        return;
      }

      delete document.body.dataset.marktxPwaStandalone;
    };

    syncStandaloneMode();

    standaloneQuery.addEventListener("change", syncStandaloneMode);
    fullscreenQuery.addEventListener("change", syncStandaloneMode);
    window.addEventListener("appinstalled", syncStandaloneMode);

    return () => {
      standaloneQuery.removeEventListener("change", syncStandaloneMode);
      fullscreenQuery.removeEventListener("change", syncStandaloneMode);
      window.removeEventListener("appinstalled", syncStandaloneMode);
      delete document.body.dataset.marktxPwaStandalone;
    };
  }, []);

  return null;
}
