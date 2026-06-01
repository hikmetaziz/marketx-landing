import { createHash } from "crypto";
import { headers } from "next/headers";

/** Stable hashed key for rate limiting (IP-based, no PII stored in DB). */
export async function getRateLimitClientKey(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";

  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
