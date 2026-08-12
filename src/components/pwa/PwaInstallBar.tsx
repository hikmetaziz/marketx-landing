"use client";

import { Download, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DISMISS_KEY = "marktx_pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneApp(): boolean {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    iosNavigator.standalone === true
  );
}

function isIosBrowser(): boolean {
  const platform = navigator.platform || "";
  const userAgent = navigator.userAgent || "";
  const hasTouch = navigator.maxTouchPoints > 1;

  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && hasTouch);
}

function hasSessionDismissal(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberSessionDismissal() {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // sessionStorage can be unavailable in some private browsing modes.
  }
}

export function PwaInstallBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState("");

  const hideOnRoute = pathname?.startsWith("/account/messages/") ?? false;
  const shouldShow = visible && !hideOnRoute;

  useEffect(() => {
    const initializeId = window.setTimeout(() => {
      setIsIos(isIosBrowser());

      if (!isStandaloneApp() && !hasSessionDismissal()) {
        setVisible(true);
      }
    }, 0);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!isStandaloneApp() && !hasSessionDismissal()) {
        setVisible(true);
      }
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
      setShowInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(initializeId);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (shouldShow) {
      document.body.dataset.marktxPwaInstallBar = "visible";
      return;
    }

    delete document.body.dataset.marktxPwaInstallBar;
  }, [shouldShow]);

  useEffect(() => {
    return () => {
      delete document.body.dataset.marktxPwaInstallBar;
    };
  }, []);

  const dismiss = () => {
    rememberSessionDismissal();
    setVisible(false);
    setShowInstructions(false);
  };

  const openInstructions = (message = "") => {
    setFallbackMessage(message);
    setShowInstructions(true);
  };

  const handleInstall = async () => {
    if (isIos) {
      openInstructions();
      return;
    }

    if (!deferredPrompt) {
      openInstructions("Brauzeriniz avtomatik quraşdırma pəncərəsini hazırda göstərmir.");
      return;
    }

    const promptEvent = deferredPrompt;
    setDeferredPrompt(null);

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        setVisible(false);
      }
    } catch {
      openInstructions("Quraşdırma pəncərəsi açıla bilmədi.");
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <section
        aria-label="MarktX PWA quraşdırma paneli"
        className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-brand-primary/20 bg-white/95 px-3 py-2 text-brand-text shadow-[0_12px_36px_rgb(15_23_42/0.18)] backdrop-blur-xl md:hidden"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-primary-light text-brand-primary">
          <Download className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black leading-tight">MarktX-i telefona quraşdır</p>
          <p className="hidden text-[11px] font-medium leading-tight text-brand-muted min-[360px]:block">
            Daha rahat və sürətli giriş
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleInstall()}
          className="shrink-0 rounded-xl bg-brand-primary px-3 py-2 text-xs font-black text-white transition-colors hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/35"
        >
          {isIos ? "Necə əlavə edim?" : "Quraşdır"}
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Quraşdırma panelini bağla"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-border bg-white text-brand-muted transition-colors hover:border-brand-primary/30 hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>

      {showInstructions ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/35 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="pwa-install-title" className="text-lg font-black text-brand-text">
                  MarktX-i ana ekrana əlavə et
                </h2>
                {fallbackMessage ? (
                  <p className="mt-1 text-sm font-medium text-brand-muted">{fallbackMessage}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                aria-label="Quraşdırma təlimatını bağla"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-border text-brand-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ol className="mt-4 space-y-3 text-sm font-semibold text-brand-text">
              <li>1. Brauzerin paylaş və ya menyu düyməsinə toxunun.</li>
              <li>2. “Ana ekrana əlavə et” seçimini açın.</li>
              <li>3. “Əlavə et” düyməsi ilə təsdiqləyin.</li>
            </ol>

            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-black text-white"
            >
              Başa düşdüm
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
