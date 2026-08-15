import type { Metadata } from "next";
import Link from "next/link";

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
import { requireAdmin } from "@/lib/supabase/admin-session";

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
  await requireAdmin();

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <AdminListingStatusTabs active={status} />
        <Link
          href="/admin/stores"
          className="rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
        >
          Mağazalar
        </Link>
      </div>
      <AdminListingsPanel
        listings={listings}
        showModerationActions={showModerationActions}
        emptyMessage={getAdminListingsEmptyMessage(status)}
        relativeDateNowIso={new Date().toISOString()}
      />
    </PageShell>
  );
}
