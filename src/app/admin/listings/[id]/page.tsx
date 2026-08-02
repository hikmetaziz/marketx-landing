import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminListingDetailPanel } from "@/components/admin/AdminListingDetailPanel";
import { PageShell } from "@/components/layout/PageShell";
import { getAdminListingById } from "@/lib/listings/admin-listings";
import { formatListingDate } from "@/lib/listings/format";
import { createPageMetadata } from "@/lib/seo";
import { getAdminUser, requireAdmin } from "@/lib/supabase/admin-session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const admin = await getAdminUser();
  if (!admin) {
    return createPageMetadata({
      title: "Moderasiya",
      description: "MarktX elan moderasiya paneli.",
      path: `/admin/listings/${id}`,
      noIndex: true,
    });
  }

  const listing = await getAdminListingById(id);

  return createPageMetadata({
    title: listing ? `Moderasiya: ${listing.title}` : "Elan tapılmadı",
    description: "MarktX elan moderasiya paneli.",
    path: `/admin/listings/${id}`,
    noIndex: true,
  });
}

export default async function AdminListingDetailPage({ params }: Props) {
  await requireAdmin();

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
      <AdminListingDetailPanel
        listing={listing}
        createdAtLabel={formatListingDate(listing.created_at)}
      />
    </PageShell>
  );
}
