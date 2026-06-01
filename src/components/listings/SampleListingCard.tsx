import { Clock3, MapPin } from "lucide-react";
import Link from "next/link";

import { ListingFavoriteButton } from "@/components/listings/ListingFavoriteButton";
import { ListingStatusBadge } from "@/components/listings/ListingStatusBadge";
import { ListingImage } from "@/components/ui/ListingImage";
import { getPrimaryListingImage } from "@/lib/listings/listing-images";
import type { SampleListing } from "@/types/listing";

type SampleListingCardProps = {
  listing: SampleListing;
};

export function SampleListingCard({ listing }: SampleListingCardProps) {
  const primaryImage = getPrimaryListingImage(listing);

  return (
    <article className="card-premium group relative overflow-hidden rounded-2xl">
      <Link
        href={`/listings/${listing.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2"
      >
        <div className="relative m-2.5 overflow-hidden rounded-xl bg-brand-surface">
          <div className="relative aspect-[4/3]">
            {primaryImage ? (
              <ListingImage src={primaryImage} alt={listing.title} fallbackClass={listing.fallback} />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${listing.fallback}`}
              >
                <span className="px-3 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-muted/70">
                  {listing.title}
                </span>
              </div>
            )}
            <div className="absolute left-2.5 top-2.5">
              <ListingStatusBadge status={listing.status} />
            </div>
          </div>
        </div>

        <div className="space-y-2 px-3.5 pb-3.5 pt-0.5">
          <p className="text-base font-extrabold leading-none tracking-tight text-brand-primary">
            {listing.price}
          </p>
          <h3 className="line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-snug text-brand-text">
            {listing.title}
          </h3>
          <div className="space-y-1 border-t border-brand-border/60 pt-2 text-xs text-brand-muted">
            <p className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-primary/60" />
              <span className="truncate">{listing.location}</span>
            </p>
            <p className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-brand-primary/60" />
              {listing.time}
            </p>
          </div>
        </div>
      </Link>

      <ListingFavoriteButton
        listingId={listing.id}
        title={listing.title}
        className="absolute right-5 top-5 z-10 group-hover:scale-105"
      />
    </article>
  );
}
