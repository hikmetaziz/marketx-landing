import { Clock3, MapPin } from "lucide-react";
import Link from "next/link";

import { ListingImage } from "@/components/ui/ListingImage";
import { formatListingPrice, formatListingRelativeDate } from "@/lib/listings/format";
import {
  getPrimaryListingImage,
  LISTING_IMAGE_FALLBACK_CLASS,
} from "@/lib/listings/listing-images";
import { dbCategoryToDisplay } from "@/lib/listings/category-map";
import type { LiveListing } from "@/types/live-listing";

type LiveListingCardProps = {
  listing: LiveListing;
};

export function LiveListingCard({ listing }: LiveListingCardProps) {
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
              <ListingImage src={primaryImage} alt={listing.title} fallbackClass={LISTING_IMAGE_FALLBACK_CLASS} />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${LISTING_IMAGE_FALLBACK_CLASS}`}
              >
                <span className="px-3 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-muted/70">
                  {listing.title}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 px-3.5 pb-3.5 pt-0.5">
          <p className="text-base font-extrabold leading-none tracking-tight text-brand-primary">
            {formatListingPrice(listing.price)}
          </p>
          <h3 className="line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-snug text-brand-text">
            {listing.title}
          </h3>
          <div className="space-y-1 border-t border-brand-border/60 pt-2 text-xs text-brand-muted">
            <p className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-primary/60" />
              <span className="truncate">{listing.city}</span>
            </p>
            <p className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-brand-primary/60" />
              {formatListingRelativeDate(listing.created_at)}
            </p>
            <p className="truncate">{dbCategoryToDisplay(listing.category)}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}
