import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountSubnav } from "@/components/account/AccountSubnav";
import { EditListingForm } from "@/components/listings/EditListingForm";
import { PageShell } from "@/components/layout/PageShell";
import { fetchCategorySchemaSnapshot } from "@/lib/category-schema/fetch-category-schemas";
import { getMyListingForEdit } from "@/lib/listings/my-listing-edit";
import { createPageMetadata } from "@/lib/seo";
import { fetchListingTaxonomy } from "@/lib/taxonomy/fetch-listing-taxonomy";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthenticatedUser } from "@/lib/supabase/session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return createPageMetadata({
    title: "Elanı düzəlt",
    description: "MarktX elanınızı redaktə edin.",
    path: `/account/listings/${id}/edit`,
    noIndex: true,
  });
}

export default async function EditMyListingPage({ params }: Props) {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const user = await getAuthenticatedUser();
  const { id } = await params;

  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(`/account/listings/${id}/edit`)}`);
  }
  const [listing, taxonomy, categorySchemaSnapshot] = await Promise.all([
    getMyListingForEdit(id, user.id),
    fetchListingTaxonomy(),
    fetchCategorySchemaSnapshot(),
  ]);

  if (!listing) {
    notFound();
  }

  return (
    <PageShell wide title="Elanı düzəlt" subtitle={listing.title}>
      <AccountSubnav active="listings" />
      <Link
        href="/account/listings"
        className="mb-6 inline-block text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
      >
        ← Mənim elanlarım
      </Link>
      <EditListingForm listing={listing} taxonomy={taxonomy} categorySchemaSnapshot={categorySchemaSnapshot} />
    </PageShell>
  );
}
