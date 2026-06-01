import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { SampleListingCard } from "@/components/listings/SampleListingCard";
import type { LiveListing } from "@/types/live-listing";
import type { SampleListing } from "@/types/listing";

type SimilarListingsSectionProps = {
  liveListings?: LiveListing[];
  sampleListings?: SampleListing[];
};

export function SimilarListingsSection({ liveListings, sampleListings }: SimilarListingsSectionProps) {
  const live = liveListings ?? [];
  const samples = sampleListings ?? [];
  const total = live.length + samples.length;

  if (total === 0) {
    return null;
  }

  return (
    <section className="mt-12 border-t border-brand-border/70 pt-10">
      <h2 className="text-xl font-extrabold tracking-tight text-brand-text">Oxşar elanlar</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {live.map((listing) => (
          <LiveListingCard key={listing.id} listing={listing} />
        ))}
        {samples.map((listing) => (
          <SampleListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
