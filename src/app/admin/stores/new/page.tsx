import type { Metadata } from "next";

import { AdminStoreCreateForm } from "@/components/admin/AdminStoreCreateForm";
import { PageShell } from "@/components/layout/PageShell";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/supabase/admin-session";

export const metadata: Metadata = createPageMetadata({
  title: "Yeni mağaza",
  description: "MarktX yeni mağaza yaradılması.",
  path: "/admin/stores/new",
  noIndex: true,
});

export default async function AdminStoreNewPage() {
  await requireAdmin();

  return (
    <PageShell
      title="Yeni mağaza"
      subtitle="Mağaza profili yaradın — kod avtomatik generasiya olunacaq."
    >
      <AdminStoreCreateForm />
    </PageShell>
  );
}
