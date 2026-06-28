import { ANDROID_APP_PACKAGE, LISTING_PUBLIC_PATH_PREFIX } from "@/lib/deep-link/constants";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
} as const;

export function wellKnownJsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

export function parseCommaSeparatedEnv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getIosAppIds(): string[] {
  return parseCommaSeparatedEnv(process.env.MARKETX_IOS_APP_IDS);
}

export function getAndroidSha256Fingerprints(): string[] {
  return parseCommaSeparatedEnv(process.env.MARKETX_ANDROID_SHA256_CERT_FINGERPRINTS);
}

export function getAndroidPackageName(): string {
  return process.env.MARKETX_ANDROID_PACKAGE_NAME?.trim() || ANDROID_APP_PACKAGE;
}

/**
 * Apple Universal Links — yalnız MARKETX_IOS_APP_IDS doldurulanda aktiv.
 * iOS yoxdursa boş details qaytarır (200 OK, heç nə pozulmur).
 * Yalnız /listings/* — mobil app-in hazırkı deep link qabiliyyəti ilə uyğundur.
 */
export function buildAppleAppSiteAssociation() {
  const appIds = getIosAppIds();

  if (appIds.length === 0) {
    return { applinks: { apps: [], details: [] } };
  }

  const components = [{ "/": `${LISTING_PUBLIC_PATH_PREFIX}*` }];

  return {
    applinks: {
      apps: [],
      details: appIds.map((appID) => ({
        appIDs: [appID],
        components,
      })),
    },
  };
}

/**
 * Android App Links — MARKETX_ANDROID_SHA256_CERT_FINGERPRINTS lazımdır.
 * Boş olanda [] — veb normal işləyir, avtomatik app açılması yoxdur.
 */
export function buildAndroidAssetLinks() {
  const fingerprints = getAndroidSha256Fingerprints();

  if (fingerprints.length === 0) {
    return [];
  }

  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: getAndroidPackageName(),
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
