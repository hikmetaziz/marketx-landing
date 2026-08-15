"use client";

import { Download, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DISMISS_KEY = "marktx_pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function IosShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

function IosInstallInstructions() {
  return (
    <>
      <p className="mt-1 text-center text-xs font-semibold text-brand-muted">Cəmi 3 addım</p>

      <ol className="mt-4 space-y-3 text-brand-text">
        <li className="rounded-2xl border border-brand-border bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-primary text-sm font-black text-white">
              1
            </span>
            <p className="text-sm font-black">Aşağıdakı Paylaş düyməsinə toxun</p>
          </div>
          <div
            className="mt-3 flex items-center justify-center gap-5 rounded-xl bg-slate-50 px-4 py-2.5 text-slate-400"
            aria-hidden="true"
          >
            <span className="text-2xl leading-none">‹</span>
            <span className="text-2xl leading-none">›</span>
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-brand-primary/30 bg-white text-brand-primary shadow-[0_0_0_5px_rgb(37_99_235/0.08)]">
              <IosShareIcon />
            </span>
            <span className="text-xl leading-none">▯</span>
          </div>
        </li>

        <li className="rounded-2xl border border-brand-border bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-primary text-sm font-black text-white">
              2
            </span>
            <p className="text-sm font-black">Menyuda “Ana ekrana əlavə et” seç</p>
          </div>
          <div className="mt-3 rounded-xl bg-slate-100 p-2.5" aria-hidden="true">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <span className="text-xs font-bold text-brand-text">Ana ekrana əlavə et</span>
              <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-brand-primary text-base font-black leading-none text-brand-primary">
                +
              </span>
            </div>
          </div>
        </li>

        <li className="rounded-2xl border border-brand-border bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-primary text-sm font-black text-white">
              3
            </span>
            <p className="text-sm font-black">Sağ yuxarıda “Əlavə et” düyməsinə toxun</p>
          </div>
          <div className="mt-3 rounded-xl bg-slate-100 p-2.5" aria-hidden="true">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <span className="text-[11px] font-semibold text-brand-primary">Ləğv et</span>
              <span className="truncate text-center text-[11px] font-bold text-brand-text">
                Ana ekrana əlavə et
              </span>
              <span className="rounded-md bg-brand-primary-light px-2 py-1 text-[11px] font-black text-brand-primary">
                Əlavə et
              </span>
            </div>
          </div>
        </li>
      </ol>
    </>
  );
}

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
            className={
              isIos
                ? "max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl"
                : "w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className={isIos ? "min-w-0 flex-1 pl-9 text-center" : undefined}>
                <h2 id="pwa-install-title" className="text-lg font-black text-brand-text">
                  {isIos ? "MarktX-i iPhone-a quraşdır" : "MarktX-i ana ekrana əlavə et"}
                </h2>
                {!isIos && fallbackMessage ? (
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

            {isIos ? (
              <IosInstallInstructions />
            ) : (
              <ol className="mt-4 space-y-3 text-sm font-semibold text-brand-text">
                <li>1. Brauzerin paylaş və ya menyu düyməsinə toxunun.</li>
                <li>2. “Ana ekrana əlavə et” seçimini açın.</li>
                <li>3. “Əlavə et” düyməsi ilə təsdiqləyin.</li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-black text-white"
            >
              {isIos ? "Bağla" : "Başa düşdüm"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
