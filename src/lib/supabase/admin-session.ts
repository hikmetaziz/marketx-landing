import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import { getAuthenticatedUser } from "@/lib/supabase/session";

export type ProfileRole = "admin" | "moderator" | "support_agent" | "user" | string | null;

function isAdminRole(role: ProfileRole): boolean {
  return role === "admin";
}

function canAccessSupportPanelRole(role: ProfileRole): boolean {
  return role === "admin" || role === "moderator" || role === "support_agent";
}

export async function getUserWithProfileRole() {
  const user = await getAuthenticatedUser();
  if (!user || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

    return { user, role: (data?.role ?? null) as ProfileRole };
  } catch {
    return null;
  }
}

export async function getAdminUser() {
  const session = await getUserWithProfileRole();
  if (!session || !isAdminRole(session.role)) {
    return null;
  }

  return session.user;
}

export async function getSupportPanelUser() {
  const session = await getUserWithProfileRole();
  if (!session || !canAccessSupportPanelRole(session.role)) {
    return null;
  }

  return session.user;
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

export async function requireSupportPanelAccess() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?returnTo=/admin/support");
  }

  const supportUser = await getSupportPanelUser();
  if (!supportUser) {
    redirect("/");
  }

  return supportUser;
}
