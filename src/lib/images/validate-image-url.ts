const BLOCKED_PROTOCOLS = ["javascript:", "data:", "vbscript:"] as const;

const UNSAFE_CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

function hasBlockedProtocol(value: string): boolean {
  const lower = value.toLowerCase();
  return BLOCKED_PROTOCOLS.some((protocol) => lower.startsWith(protocol));
}

/** Returns a safe image URL string, or null if the value should not be rendered. */
export function sanitizeImageUrl(url: unknown): string | null {
  if (typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();
  if (trimmed.length === 0 || hasBlockedProtocol(trimmed)) {
    return null;
  }

  if (trimmed.startsWith("//")) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return UNSAFE_CONTROL_CHARS.test(trimmed) ? null : trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "blob:") {
      return trimmed;
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    if (!parsed.hostname) {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
}

export function isValidImageUrl(url: unknown): url is string {
  return sanitizeImageUrl(url) !== null;
}
