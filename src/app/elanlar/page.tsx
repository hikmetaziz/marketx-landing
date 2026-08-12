import type { Metadata } from "next";
import Link from "next/link";

import { ListingPagination } from "@/components/listings/ListingPagination";
import { ListingSearchForm } from "@/components/listings/ListingSearchForm";
import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { PageShell } from "@/components/layout/PageShell";
import { POPULAR_LISTINGS } from "@/constants/data";
import { SampleListingCard } from "@/components/listings/SampleListingCard";
import { getActiveListings, getActiveListingsPage, searchListings, searchListingsPage } from "@/lib/listings/live-listings";
import {
  getListingSearchCategoryOptions,
  getListingSearchSubcategoryOptions,
  hasListingSearchFilters,
  parseListingSearchParams,
  type ListingSearchParams,
} from "@/lib/listings/search";
import { createPageMetadata } from "@/lib/seo";


function paginateSampleListings(page: number, limit: number) {
  const total = POPULAR_LISTINGS.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;

  return {
    listings: POPULAR_LISTINGS.slice(start, start + limit),
    total,
    totalPages,
  };
}
type Props = {
  searchParams: Promise<ListingSearchParams>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = parseListingSearchParams(await searchParams);
  const hasFilters = hasListingSearchFilters(filters);
  const liveListings = hasFilters
    ? await searchListings(filters, 1)
    : await getActiveListings(1);

  return createPageMetadata({
    title: hasFilters ? "Elan axtarışı" : "Elanlar",
    description:
      liveListings.length > 0
        ? "MarktX-də aktiv və satılmış elanlar."
        : "MarktX elan kataloqu - canlı elanlar tezliklə genişlənəcək.",
    path: "/elanlar",
    noIndex: hasFilters || liveListings.length === 0,
  });
}

export default async function ElanlarPage({ searchParams }: Props) {
  const filters = parseListingSearchParams(await searchParams);
  const hasFilters = hasListingSearchFilters(filters);
  const [listingPage, categoryOptions] = await Promise.all([
    hasFilters
      ? searchListingsPage(filters)
      : getActiveListingsPage({ page: filters.page, limit: filters.limit }),
    getListingSearchCategoryOptions(),
  ]);
  const subcategoryOptions = filters.category
    ? getListingSearchSubcategoryOptions(filters.category)
    : [];
  const samplePage = !hasFilters && listingPage.listings.length === 0
    ? paginateSampleListings(filters.page, filters.limit)
    : null;
  const visibleListings = listingPage.listings;

  const subtitle = hasFilters
    ? listingPage.total > 0
      ? `${listingPage.total} nəticə tapıldı.`
      : "Seçilmiş filtrlərə uyğun elan tapılmadı."
    : "MarktX-də aktiv və satılmış elanlar.";

  return (
    <PageShell title="Elanlar" subtitle={subtitle} wide>
      <div className="space-y-4 md:space-y-6">
        <ListingSearchForm
          key={JSON.stringify(filters)}
          filters={filters}
          categoryOptions={categoryOptions}
          subcategoryOptions={subcategoryOptions}
        />

        {visibleListings.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4">
              {visibleListings.map((listing) => (
                <LiveListingCard key={listing.id} listing={listing} mobileCompact />
              ))}
            </div>
            <ListingPagination
              filters={filters}
              total={listingPage.total}
              totalPages={listingPage.totalPages}
            />
          </>
        ) : hasFilters ? (
          <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-center">
            <p className="text-sm leading-relaxed text-brand-muted">
              Filtrləri dəyişdirin və ya axtarışı təmizləyin.
            </p>
            <Link
              href="/elanlar"
              className="btn-primary-premium mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            >
              Filtrləri təmizlə
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-brand-muted">
              Canlı elanlar hələ yoxdur. Aşağıda nümunə (satılmış) elanlar göstərilir.
            </p>
            <div className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4">
              {(samplePage?.listings ?? POPULAR_LISTINGS).map((listing) => (
                <SampleListingCard key={listing.id} listing={listing} mobileCompact />
              ))}
            </div>
            {samplePage ? (
              <ListingPagination
                filters={filters}
                total={samplePage.total}
                totalPages={samplePage.totalPages}
              />
            ) : null}
          </>
        )}
      </div>
    </PageShell>
  );
}
