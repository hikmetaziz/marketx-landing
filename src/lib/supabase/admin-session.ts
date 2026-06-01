import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import { getAuthenticatedUser } from "@/lib/supabase/session";

export async function getAdminUser() {
  const user = await getAuthenticatedUser();
  if (!user || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

    if (data?.role !== "admin") {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?returnTo=/admin/listings");
  }

  const admin = await getAdminUser();
  if (!admin) {
    redirect("/");
  }

  return admin;
}
