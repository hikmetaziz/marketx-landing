import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { LiveListingDetail } from "@/components/listings/LiveListingDetail";
import { SimilarListingsSection } from "@/components/listings/SimilarListingsSection";
import { SoldSampleListingDetail } from "@/components/listings/SoldSampleListingDetail";
import {
  getListingBySlug,
  getListingForSeo,
  getPrimaryListingImage,
  getSimilarListings,
  toListingDetailView,
} from "@/lib/listings/live-listings";
import {
  createNonPublicListingMetadata,
  createPublicListingMetadata,
} from "@/lib/listings/listing-seo";
import { buildListingJsonLd } from "@/lib/listings/listing-json-ld";
import {
  getSampleListingBySlug,
  getSampleListingSlugs,
  getSimilarSampleListings,
} from "@/lib/listings/sample-listings";
import { createPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return getSampleListingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listingForSeo = await getListingForSeo(slug);

  if (listingForSeo) {
    const isPublic =
      listingForSeo.status === "active" || listingForSeo.status === "sold";

    if (!isPublic) {
      return createNonPublicListingMetadata(slug);
    }

    return createPublicListingMetadata({
      title: listingForSeo.title,
      description: listingForSeo.description,
      price: listingForSeo.price,
      slug: listingForSeo.slug,
      imageUrl: getPrimaryListingImage(listingForSeo),
    });
  }

  const sampleListing = getSampleListingBySlug(slug);

  if (sampleListing) {
    return createPageMetadata({
      title: sampleListing.title,
      description: `${sampleListing.title} — ${sampleListing.price}. Bu nümunə elan artıq satılıb.`,
      path: `/listings/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: "Elan tapılmadı",
    description: "MarktX elan səhifəsi tapılmadı.",
    path: `/listings/${slug}`,
    noIndex: true,
  });
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params;
  const liveListing = await getListingBySlug(slug);

  if (liveListing) {
    const { listing, hasContactPhone } = await toListingDetailView(liveListing);
    const similarListings = await getSimilarListings(
      liveListing.category,
      liveListing.id,
      liveListing.slug,
      4,
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
          })}
        />
        <Link
          href="/listings"
          className="text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-dark"
        >
          ← Elanlar
        </Link>
        <div className="mt-6">
          <LiveListingDetail listing={listing} hasContactPhone={hasContactPhone} />
          <SimilarListingsSection liveListings={similarListings} />
        </div>
      </article>
    );
  }

  const sampleListing = getSampleListingBySlug(slug);

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
