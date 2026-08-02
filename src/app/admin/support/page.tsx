import type { Metadata } from "next";

import { AdminSupportPanel } from "@/components/admin/AdminSupportPanel";
import { PageShell } from "@/components/layout/PageShell";
import { createPageMetadata } from "@/lib/seo";
import { requireSupportPanelAccess } from "@/lib/supabase/admin-session";

export const metadata: Metadata = createPageMetadata({
  title: "Dəstək paneli",
  description: "MarktX dəstək söhbətləri.",
  path: "/admin/support",
  noIndex: true,
});

export default async function AdminSupportPage() {
  await requireSupportPanelAccess();

  return (
    <PageShell wide title="Dəstək paneli" subtitle="Customer və mağaza dəstək söhbətləri.">
      <AdminSupportPanel />
    </PageShell>
  );
}
