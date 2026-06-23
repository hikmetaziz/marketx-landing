import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { sanitizeInternalPath } from "@/lib/safe-path";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/env";

export { isSupabaseConfigured };

let browserClient: SupabaseClient | undefined;
let passwordResetClient: SupabaseClient | undefined;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL və NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local-də olmalıdır.");
  }

  browserClient = createBrowserClient(url, key);
  return browserClient;
}

/**
 * Parol bərpası üçün implicit flow client.
 * PKCE token (pkce_...) yalnız onu yaradan brauzerdə açılır; implicit token_hash
 * isə istənilən brauzer/cihazda verifyOtp ilə işləyir.
 */
export function createPasswordResetClient() {
  if (passwordResetClient) {
    return passwordResetClient;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL və NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local-də olmalıdır.");
  }

  passwordResetClient = createSupabaseClient(url, key, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  return passwordResetClient;
}

export function getAuthRedirectUrl(path = "/login"): string {
  const normalizedPath = sanitizeInternalPath(path, "/login");
  if (typeof window === "undefined") {
    return normalizedPath;
  }
  return `${window.location.origin}${normalizedPath}`;
}
