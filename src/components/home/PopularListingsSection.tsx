import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { SampleListingCard } from "@/components/listings/SampleListingCard";
import { POPULAR_LISTINGS } from "@/constants/data";
import { getActiveListings } from "@/lib/listings/live-listings";

export async function PopularListingsSection() {
  const liveListings = await getActiveListings(8);
  const hasLiveListings = liveListings.length > 0;

  return (
    <section className="pb-2" aria-labelledby="popular-listings-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="popular-listings-heading"
              className="section-title-premium text-2xl font-extrabold tracking-tight text-brand-text"
            >
              Elanlar
            </h2>
            {!hasLiveListings ? (
              <p className="mt-1 text-sm text-brand-muted">Nümunə elanlar (satılıb)</p>
            ) : null}
          </div>
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary-light/50 hover:text-brand-primary-dark"
          >
            Hamısına bax
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {hasLiveListings
            ? liveListings.map((listing) => <LiveListingCard key={listing.id} listing={listing} />)
            : POPULAR_LISTINGS.map((listing) => (
                <SampleListingCard key={listing.id} listing={listing} />
              ))}
        </div>
      </div>
    </section>
  );
}
