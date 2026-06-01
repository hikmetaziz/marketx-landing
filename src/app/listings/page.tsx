import type { Metadata } from "next";

import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { SampleListingCard } from "@/components/listings/SampleListingCard";
import { PageShell } from "@/components/layout/PageShell";
import { POPULAR_LISTINGS } from "@/constants/data";
import { getActiveListings } from "@/lib/listings/live-listings";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const liveListings = await getActiveListings(1);

  return createPageMetadata({
    title: "Elanlar",
    description:
      liveListings.length > 0
        ? "MarktX-də aktiv və satılmış elanlar."
        : "MarktX elan kataloqu — canlı elanlar tezliklə genişlənəcək.",
    path: "/listings",
    noIndex: liveListings.length === 0,
  });
}

export default async function ListingsPage() {
  const liveListings = await getActiveListings();

  if (liveListings.length > 0) {
    return (
      <PageShell title="Elanlar" subtitle="MarktX-də aktiv və satılmış elanlar." wide>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {liveListings.map((listing) => (
            <LiveListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Elanlar"
      subtitle="Canlı elanlar hələ yoxdur. Aşağıda nümunə (satılmış) elanlar göstərilir."
      wide
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {POPULAR_LISTINGS.map((listing) => (
          <SampleListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </PageShell>
  );
}
