import { createBrowserClient } from "@supabase/ssr";

import { sanitizeInternalPath } from "@/lib/safe-path";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/env";

export { isSupabaseConfigured };

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL və NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local-də olmalıdır.");
  }

  return createBrowserClient(url, key);
}

export function getAuthRedirectUrl(path = "/login"): string {
  const normalizedPath = sanitizeInternalPath(path, "/login");
  if (typeof window === "undefined") {
    return normalizedPath;
  }
  return `${window.location.origin}${normalizedPath}`;
}
