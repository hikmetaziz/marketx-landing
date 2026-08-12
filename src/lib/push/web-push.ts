import type { SupabaseClient } from "@supabase/supabase-js";

const WEB_PUSH_SERVICE_WORKER_PATH = "/web-push-sw.js";
const WEB_PUSH_VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";

type WebPushSubscriptionResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; error: "unsupported" | "missing_vapid_key" | "permission_denied" | "unauthenticated" | "subscription_failed" };

export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

export async function registerWebPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register(WEB_PUSH_SERVICE_WORKER_PATH, {
      scope: "/",
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Web push service worker registration failed", error);
    }

    return null;
  }
}

export async function getCurrentBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

function readSubscriptionPayload(subscription: PushSubscription) {
  const payload = subscription.toJSON();
  const endpoint = typeof payload.endpoint === "string" ? payload.endpoint : "";
  const p256dh = typeof payload.keys?.p256dh === "string" ? payload.keys.p256dh : "";
  const auth = typeof payload.keys?.auth === "string" ? payload.keys.auth : "";

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    p256dh,
    auth,
    expiration_time: subscription.expirationTime,
    user_agent: navigator.userAgent || null,
  };
}

export async function subscribeToWebPush(supabase: SupabaseClient): Promise<WebPushSubscriptionResult> {
  if (!isWebPushSupported()) {
    return { ok: false, error: "unsupported" };
  }

  if (!WEB_PUSH_VAPID_PUBLIC_KEY) {
    return { ok: false, error: "missing_vapid_key" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "permission_denied" };
  }

  const registration = await registerWebPushServiceWorker();
  if (!registration) {
    return { ok: false, error: "unsupported" };
  }

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_VAPID_PUBLIC_KEY),
    }));

  const payload = readSubscriptionPayload(subscription);
  if (!payload) {
    return { ok: false, error: "subscription_failed" };
  }

  const { error } = await supabase.from("web_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: payload.endpoint,
      p256dh: payload.p256dh,
      auth: payload.auth,
      expiration_time: payload.expiration_time,
      user_agent: payload.user_agent,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Web push subscription persistence failed", error);
    }

    return { ok: false, error: "subscription_failed" };
  }

  return { ok: true, subscription };
}

export async function unsubscribeCurrentBrowserPush(supabase: SupabaseClient): Promise<boolean> {
  const subscription = await getCurrentBrowserPushSubscription();
  if (!subscription) {
    return false;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("web_push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Web push subscription cleanup failed", error);
    }
  }

  try {
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Web push unsubscribe failed", error);
    }

    return false;
  }
}
