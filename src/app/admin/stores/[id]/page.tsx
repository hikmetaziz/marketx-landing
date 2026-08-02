import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminStoreDetailPanel } from "@/components/admin/AdminStoreDetailPanel";
import { PageShell } from "@/components/layout/PageShell";
import {
  getAdminClaimRequests,
  getAdminStoreById,
  getAdminStoreOwnerSummary,
  getStoreListingsForOwner,
} from "@/lib/stores/stores";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/supabase/admin-session";

export const metadata: Metadata = createPageMetadata({
  title: "Mağaza detalı",
  description: "MarktX mağaza idarəetməsi.",
  path: "/admin/stores",
  noIndex: true,
});

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminStoreDetailPage({ params }: Props) {
  await requireAdmin();

  const { id } = await params;

  const store = await getAdminStoreById(id);
  if (!store) {
    notFound();
  }

  const [claimRequests, storeListings, currentOwner] = await Promise.all([
    getAdminClaimRequests(store.id),
    getStoreListingsForOwner(store.id),
    getAdminStoreOwnerSummary(store),
  ]);

  return (
    <PageShell wide title={store.name} subtitle={`Mağaza kodu: ${store.store_code}`}>
      <AdminStoreDetailPanel
        key={`${store.id}:${store.updated_at ?? store.created_at}`}
        store={store}
        claimRequests={claimRequests}
        storeListings={storeListings}
        currentOwner={currentOwner}
      />
    </PageShell>
  );
}
