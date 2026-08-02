import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSubnav } from "@/components/account/AccountSubnav";
import { PageShell } from "@/components/layout/PageShell";
import { StoreApplicationsPanel } from "@/components/store/StoreApplicationsPanel";
import { createPageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export const metadata: Metadata = createPageMetadata({
  title: "Mağaza müraciətlərim",
  description:
    "MarktX mağaza müraciətlərinizin vəziyyətini izləyin.",
  path: "/account/store/applications",
  noIndex: true,
});

export default async function StoreApplicationsPage() {
  const returnTo = "/account/store/applications";

  if (!isSupabaseConfigured()) {
    redirect(
      `/login?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(
      `/login?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  return (
    <PageShell
      wide
      title="Mağaza müraciətlərim"
      subtitle="Yeni mağaza açılması üçün göndərdiyiniz müraciətlərin vəziyyətini izləyin."
    >
      <AccountSubnav active="store" />

      <StoreApplicationsPanel />
    </PageShell>
  );
}