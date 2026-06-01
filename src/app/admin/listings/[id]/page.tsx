import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminListingDetailPanel } from "@/components/admin/AdminListingDetailPanel";
import { PageShell } from "@/components/layout/PageShell";
import { getAdminListingById } from "@/lib/listings/admin-listings";
import { createPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getAdminListingById(id);

  return createPageMetadata({
    title: listing ? `Moderasiya: ${listing.title}` : "Elan tapılmadı",
    description: "MarktX elan moderasiya paneli.",
    path: `/admin/listings/${id}`,
    noIndex: true,
  });
}

export default async function AdminListingDetailPage({ params }: Props) {
  const { id } = await params;
  const listing = await getAdminListingById(id);

  if (!listing) {
    notFound();
  }

  return (
    <PageShell wide title="Elan moderasiyası" subtitle={listing.title}>
      <Link
        href="/admin/listings"
        className="mb-6 inline-block text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
      >
        ← Gözləyən elanlar
      </Link>
      <AdminListingDetailPanel listing={listing} />
    </PageShell>
  );
}
