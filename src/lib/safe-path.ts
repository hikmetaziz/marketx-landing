/** Blocks open redirects (e.g. //evil.com, https://evil.com). */
export function sanitizeInternalPath(
  path: string | null | undefined,
  fallback = "/",
): string {
  if (!path || typeof path !== "string") return fallback;

  const trimmed = path.trim();

  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("://") ||
    trimmed.includes("\\")
  ) {
    return fallback;
  }

  return trimmed;
}

/** Web + mobil deep link — elan yerləşdirmə girişi. */
export function isCreateListingReturnPath(path: string): boolean {
  return path === "/create-listing" || path === "/(tabs)/create-listing";
}

/** Mobil `/(tabs)/...` yolunu veb marşruta çevirir. */
export function resolveAuthReturnTo(path: string): string {
  if (path === "/(tabs)/create-listing") {
    return "/create-listing";
  }
  return path;
}
