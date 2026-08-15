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
  mobileCompact?: boolean;
};

export function LiveListingCard({ listing, mobileCompact = false }: LiveListingCardProps) {
  const primaryImage = getPrimaryListingImage(listing);
  const articleClassName = mobileCompact
    ? "card-premium group relative overflow-hidden rounded-xl md:rounded-2xl"
    : "card-premium group relative overflow-hidden rounded-2xl";
  const imageWrapClassName = mobileCompact
    ? "relative m-1.5 overflow-hidden rounded-lg bg-brand-surface md:m-2.5 md:rounded-xl"
    : "relative m-2.5 overflow-hidden rounded-xl bg-brand-surface";
  const contentClassName = mobileCompact
    ? "space-y-1.5 px-2.5 pb-2.5 pt-0.5 md:space-y-2 md:px-3.5 md:pb-3.5"
    : "space-y-2 px-3.5 pb-3.5 pt-0.5";
  const priceClassName = mobileCompact
    ? "text-[15px] font-extrabold leading-none tracking-tight text-brand-primary md:text-base"
    : "text-base font-extrabold leading-none tracking-tight text-brand-primary";
  const titleClassName = mobileCompact
    ? "line-clamp-2 min-h-[2.35rem] text-[13px] font-semibold leading-snug text-brand-text md:min-h-[2.75rem] md:text-[15px]"
    : "line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-snug text-brand-text";
  const metaClassName = mobileCompact
    ? "space-y-0.5 border-t border-brand-border/60 pt-1.5 text-[11px] text-brand-muted md:space-y-1 md:pt-2 md:text-xs"
    : "space-y-1 border-t border-brand-border/60 pt-2 text-xs text-brand-muted";

  return (
    <article className={articleClassName}>
      <Link
        href={`/elanlar/${listing.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2"
      >
        <div className={imageWrapClassName}>
          <div className="relative aspect-[4/3]">
            {primaryImage ? (
              <ListingImage
                src={primaryImage}
                alt={listing.title}
                fallbackClass={LISTING_IMAGE_FALLBACK_CLASS}
                fit="contain"
              />
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

        <div className={contentClassName}>
          <p className={priceClassName}>
            {formatListingPrice(listing.price)}
          </p>
          <h3 className={titleClassName}>
            {listing.title}
          </h3>
          <div className={metaClassName}>
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
