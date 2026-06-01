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
