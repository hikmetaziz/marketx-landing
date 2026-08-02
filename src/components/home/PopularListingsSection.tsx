import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { getActiveListings } from "@/lib/listings/live-listings";

export async function PopularListingsSection() {
  const liveListings = await getActiveListings(8);
  const hasLiveListings = liveListings.length > 0;

  return (
    <section className="pb-12 sm:pb-14" aria-labelledby="popular-listings-heading">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-0">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="popular-listings-heading"
            className="text-2xl font-extrabold text-brand-text sm:text-3xl"
          >
            Yeni elanlar
          </h2>
          <Link
            href="/elanlar"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-primary-dark transition-colors hover:bg-brand-primary-light/40 hover:text-brand-primary"
          >
            Hamısına bax
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {hasLiveListings ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {liveListings.map((listing) => (
              <LiveListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-brand-border bg-white px-5 py-8 text-center">
            <p className="text-sm text-brand-muted">Hazırda aktiv elan yoxdur.</p>
          </div>
        )}
      </div>
    </section>
  );
}
