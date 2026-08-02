import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveListingDetail } from "@/components/listings/LiveListingDetail";
import { SimilarListingsSection } from "@/components/listings/SimilarListingsSection";
import { SoldSampleListingDetail } from "@/components/listings/SoldSampleListingDetail";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildListingJsonLd } from "@/lib/listings/listing-json-ld";
import {
  getListingByIdOrSlug,
  getListingForSeoByIdOrSlug,
  getPrimaryListingImage,
  getSimilarListings,
  toListingDetailView,
} from "@/lib/listings/live-listings";
import {
  createNonPublicListingMetadata,
  createPublicListingMetadata,
} from "@/lib/listings/listing-seo";
import { formatListingRelativeDate } from "@/lib/listings/format";
import {
  buildListingAttributeRows,
  fetchListingFavoriteCount,
  fetchSellerLabel,
} from "@/lib/listings/listing-detail-extras";
import { fetchCategorySchemaSnapshot } from "@/lib/category-schema/fetch-category-schemas";
import {
  getSampleListingBySlug,
  getSampleListingSlugs,
  getSimilarSampleListings,
} from "@/lib/listings/sample-listings";
import { createPageMetadata } from "@/lib/seo";
import { getListingManagementAccess } from "@/lib/listings/listing-management-access";
import { getAuthenticatedUser } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { fetchListingTaxonomy } from "@/lib/taxonomy/fetch-listing-taxonomy";

function listingCanonicalPath(id: string): string {
  return `/elanlar/${encodeURIComponent(id)}`;
}

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return getSampleListingSlugs().map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const canonicalPath = listingCanonicalPath(id);
  const listingForSeo = await getListingForSeoByIdOrSlug(id);

  if (listingForSeo) {
    const isPublic =
      listingForSeo.status === "active" || listingForSeo.status === "sold";

    if (!isPublic) {
      return createNonPublicListingMetadata(id, canonicalPath);
    }

    return createPublicListingMetadata({
      title: listingForSeo.title,
      description: listingForSeo.description,
      price: listingForSeo.price,
      slug: listingForSeo.slug,
      imageUrl: getPrimaryListingImage(listingForSeo),
      canonicalPath,
    });
  }

  const sampleListing = getSampleListingBySlug(id);

  if (sampleListing) {
    return createPageMetadata({
      title: `${sampleListing.title} - ${sampleListing.price}`,
      description: `${sampleListing.title} - ${sampleListing.price}. Bu nümunə elan artıq satılıb.`,
      path: canonicalPath,
      ogImage: { url: sampleListing.image, alt: sampleListing.title },
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: "Elan tapılmadı",
    description: "MarktX elan səhifəsi tapılmadı.",
    path: canonicalPath,
    noIndex: true,
  });
}

export default async function ElanDetailPage({ params }: Props) {
  const { id } = await params;
  const liveListing = await getListingByIdOrSlug(id);

  if (liveListing) {
    const { listing, hasContactPhone } = await toListingDetailView(liveListing);
    const user = await getAuthenticatedUser();
    let canManage = false;
    if (user?.id) {
      const supabase = await createClient();
      const access = await getListingManagementAccess(supabase, {
        user_id: listing.user_id,
        store_id: listing.store_id ?? null,
      }, user.id);
      canManage = access.canEdit || access.canArchive;
    }
    const [similarListings, favoriteCount, sellerLabel, taxonomy, categorySchemaSnapshot] = await Promise.all([
      getSimilarListings(liveListing.category, liveListing.id, liveListing.slug, 4),
      fetchListingFavoriteCount(listing.id),
      listing.store_id ? Promise.resolve("Satıcı") : fetchSellerLabel(listing.user_id),
      fetchListingTaxonomy(),
      fetchCategorySchemaSnapshot(),
    ]);
    const attributeRows = buildListingAttributeRows(
      taxonomy,
      listing.category_id ?? null,
      listing.subcategory_id ?? null,
      listing.attributes ?? {},
      categorySchemaSnapshot,
    );

    return (
      <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <JsonLd
          data={buildListingJsonLd({
            title: listing.title,
            description: listing.description,
            price: listing.price,
            slug: listing.slug,
            status: listing.status,
            imageUrl: getPrimaryListingImage(listing),
            category: listing.category,
            city: listing.city,
            canonicalPath: listingCanonicalPath(id),
          })}
        />
        <Link
          href="/elanlar"
          className="text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-dark"
        >
          ← Elanlar
        </Link>
        <div className="mt-6">
          <LiveListingDetail
            listing={listing}
            hasContactPhone={hasContactPhone}
            canManage={canManage}
            isAuthenticated={Boolean(user)}
            createdAtLabel={formatListingRelativeDate(listing.created_at)}
            sellerLabel={sellerLabel}
            favoriteCount={favoriteCount}
            attributeRows={attributeRows}
          />
          <SimilarListingsSection liveListings={similarListings} />
        </div>
      </article>
    );
  }

  const sampleListing = getSampleListingBySlug(id);

  if (!sampleListing) {
    notFound();
  }

  const similarSamples = getSimilarSampleListings(sampleListing.slug, 4);

  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <Link
        href="/"
        className="text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-dark"
      >
        ← Ana səhifə
      </Link>
      <div className="mt-6">
        <SoldSampleListingDetail listing={sampleListing} />
        <SimilarListingsSection sampleListings={similarSamples} />
      </div>
    </article>
  );
}
