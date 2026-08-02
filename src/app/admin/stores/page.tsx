import type { Metadata } from "next";
import Link from "next/link";

import { AdminStoresPanel } from "@/components/admin/AdminStoresPanel";
import { AdminStoreStatusTabs } from "@/components/admin/AdminStoreStatusTabs";
import { PageShell } from "@/components/layout/PageShell";
import {
  getAdminStoresByStatus,
  isAdminStoreStatusFilter,
  type AdminStoreStatusFilter,
} from "@/lib/stores/stores";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/supabase/admin-session";

export const metadata: Metadata = createPageMetadata({
  title: "Mağazalar",
  description: "MarktX mağaza idarəetmə paneli.",
  path: "/admin/stores",
  noIndex: true,
});

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminStoresPage({ searchParams }: Props) {
  await requireAdmin();

  const { status: statusParam } = await searchParams;
  const status: AdminStoreStatusFilter = isAdminStoreStatusFilter(statusParam) ? statusParam : "all";

  const stores = await getAdminStoresByStatus(status);

  return (
    <PageShell
      wide
      title="Mağazalar"
      subtitle="Mağaza profillərini yaradın, elanları bağlayın və sahiblik müraciətlərini idarə edin."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <AdminStoreStatusTabs active={status} />
        <Link
          href="/admin/stores/new"
          className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
        >
          + Yeni mağaza
        </Link>
      </div>
      <AdminStoresPanel stores={stores} />
    </PageShell>
  );
}
