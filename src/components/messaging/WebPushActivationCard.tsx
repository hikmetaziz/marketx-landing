"use client";

import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  getCurrentBrowserPushSubscription,
  isWebPushSupported,
  subscribeToWebPush,
} from "@/lib/push/web-push";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

type WebPushActivationState =
  | "checking"
  | "unsupported"
  | "default"
  | "active"
  | "denied"
  | "activating"
  | "error";

function getActivationErrorMessage(error: string): string {
  if (error === "missing_vapid_key" || error === "subscription_failed") {
    return "Bildirişlər hazırda aktivləşdirilə bilmir. Yenidən cəhd edin.";
  }

  if (error === "permission_denied") {
    return "Bildiriş icazəsi brauzerdə deaktiv edilib.";
  }

  if (error === "unauthenticated") {
    return "Bildirişləri aktiv etmək üçün hesaba daxil olun.";
  }

  return "Bildirişlər bu brauzerdə dəstəklənmir.";
}

export function WebPushActivationCard() {
  const { supabase, user } = useAuthUser();
  const [state, setState] = useState<WebPushActivationState>("checking");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const checkStatus = async () => {
      if (!user || !isWebPushSupported()) {
        if (active) setState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (active) setState("denied");
        return;
      }

      if (Notification.permission !== "granted") {
        if (active) setState("default");
        return;
      }

      const subscription = await getCurrentBrowserPushSubscription();
      if (active) setState(subscription ? "active" : "default");
    };

    void checkStatus();

    return () => {
      active = false;
    };
  }, [user]);

  const handleActivate = useCallback(async () => {
    if (!supabase || state === "activating") {
      return;
    }

    setState("activating");
    setErrorMessage("");

    const result = await subscribeToWebPush(supabase);
    if (result.ok) {
      setState("active");
      return;
    }

    setErrorMessage(getActivationErrorMessage(result.error));
    setState(result.error === "permission_denied" ? "denied" : "error");
  }, [state, supabase]);

  if (state === "checking" || state === "unsupported") {
    return null;
  }

  const activeState = state === "active";
  const deniedState = state === "denied";
  const activatingState = state === "activating";

  return (
    <section className="rounded-xl border border-brand-border bg-white p-4 shadow-sm md:rounded-2xl md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-primary-light text-brand-primary">
            <Bell className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-brand-text">Bildirişləri aktiv et</h2>
            <p className="mt-1 text-sm font-medium text-brand-muted">
              Yeni mesaj və vacib yeniliklərdən xəbərdar olun.
            </p>
            {deniedState ? (
              <p className="mt-2 text-xs font-semibold text-red-600">
                Bildiriş icazəsi brauzerdə deaktiv edilib.
              </p>
            ) : null}
            {errorMessage && !deniedState ? (
              <p className="mt-2 text-xs font-semibold text-red-600">{errorMessage}</p>
            ) : null}
          </div>
        </div>

        {activeState ? (
          <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Bildirişlər aktivdir
          </span>
        ) : deniedState ? null : (
          <button
            type="button"
            onClick={() => void handleActivate()}
            disabled={!supabase || activatingState}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-black text-white transition-colors hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {activatingState ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Bildirişləri aktiv et
          </button>
        )}
      </div>
    </section>
  );
}
