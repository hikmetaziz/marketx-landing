import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSubnav } from "@/components/account/AccountSubnav";
import { PageShell } from "@/components/layout/PageShell";
import { SupportStartPanel } from "@/components/messaging/SupportStartPanel";
import { createPageMetadata } from "@/lib/seo";
import { getUserWithProfileRole, type ProfileRole } from "@/lib/supabase/admin-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export const metadata: Metadata = createPageMetadata({
  title: "Dəstək",
  description: "MarktX dəstək komandası ilə yazışın.",
  path: "/account/support",
  noIndex: true,
});

function canOpenAdminSupport(role: ProfileRole): boolean {
  return role === "admin" || role === "moderator" || role === "support_agent";
}

export default async function AccountSupportPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?returnTo=/account/support");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?returnTo=/account/support");
  }

  const roleSession = await getUserWithProfileRole();
  if (roleSession?.user.id === user.id && canOpenAdminSupport(roleSession.role)) {
    redirect("/admin/support");
  }

  return (
    <PageShell wide title="MarktX Dəstək" subtitle="Hesab, mağaza və elanlarla bağlı suallarınızı bizə yazın.">
      <AccountSubnav active="support" />
      <SupportStartPanel />
    </PageShell>
  );
}
