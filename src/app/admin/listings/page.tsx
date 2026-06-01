import type { Metadata } from "next";

import {
  AdminListingStatusTabs,
  getAdminListingsEmptyMessage,
} from "@/components/admin/AdminListingStatusTabs";
import { AdminListingsPanel } from "@/components/admin/AdminListingsPanel";
import { PageShell } from "@/components/layout/PageShell";
import {
  getAdminListingsByStatus,
  isAdminListingStatusFilter,
  type AdminListingStatusFilter,
} from "@/lib/listings/admin-listings";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Moderasiya",
  description: "MarktX elan moderasiya paneli.",
  path: "/admin/listings",
  noIndex: true,
});

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminListingsPage({ searchParams }: Props) {
  const { status: statusParam } = await searchParams;
  const status: AdminListingStatusFilter = isAdminListingStatusFilter(statusParam)
    ? statusParam
    : "pending";

  const listings = await getAdminListingsByStatus(status);
  const showModerationActions = status === "pending";

  return (
    <PageShell
      wide
      title="Elan moderasiyası"
      subtitle="Elanları statusa görə filtrləyin, təsdiqləyin və ya ətraflı baxın."
    >
      <div className="mb-6">
        <AdminListingStatusTabs active={status} />
      </div>
      <AdminListingsPanel
        listings={listings}
        showModerationActions={showModerationActions}
        emptyMessage={getAdminListingsEmptyMessage(status)}
      />
    </PageShell>
  );
}
