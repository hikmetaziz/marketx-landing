import type { SupabaseClient } from "@supabase/supabase-js";

import { unsubscribeCurrentBrowserPush } from "@/lib/push/web-push";

export async function signOutWithCleanup(supabase: SupabaseClient): Promise<void> {
  try {
    await unsubscribeCurrentBrowserPush(supabase);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Sign-out push cleanup failed", error);
    }
  }

  await supabase.auth.signOut({ scope: "local" });
}
