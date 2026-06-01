"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { markMyListingSold } from "@/app/account/listings/actions";
import { ListingImage } from "@/components/ui/ListingImage";
import { OwnerListingStatusBadge } from "@/components/listings/OwnerListingStatusBadge";
import { dbCategoryToDisplay } from "@/lib/listings/category-map";
import { formatListingDate, formatListingPrice, formatListingViewCount } from "@/lib/listings/format";
import {
  getPrimaryListingImage,
  LISTING_IMAGE_FALLBACK_CLASS,
} from "@/lib/listings/listing-images";
import type { MyListing } from "@/lib/listings/my-listings";

type MyListingsPanelProps = {
  listings: MyListing[];
};

function getPublicListingHref(listing: MyListing): string | null {
  if (!listing.slug) {
    return null;
  }
  if (listing.status === "active" || listing.status === "sold") {
    return `/listings/${listing.slug}`;
  }
  return null;
}

export function MyListingsPanel({ listings }: MyListingsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const runMarkSold = (listingId: string) => {
    setErrorMessage("");
    setActiveId(listingId);
    startTransition(async () => {
      const result = await markMyListingSold(listingId);
      setActiveId(null);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      router.refresh();
    });
  };

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-8 text-center">
        <p className="text-sm text-brand-muted">Hələ elan yaratmamısınız.</p>
        <Link
          href="/create-listing"
          className="btn-primary-premium mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        >
          İlk elanı yerləşdir
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <ul className="space-y-4">
        {listings.map((listing) => {
          const primaryImage = getPrimaryListingImage(listing);
          const publicHref = getPublicListingHref(listing);
          const loading = isPending && activeId === listing.id;

          return (
            <li
              key={listing.id}
              className="card-premium overflow-hidden rounded-2xl hover:translate-y-0"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-brand-surface sm:w-36">
                  {primaryImage ? (
                    <ListingImage
                      src={primaryImage}
                      alt={listing.title}
                      fallbackClass={LISTING_IMAGE_FALLBACK_CLASS}
                      sizes="144px"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${LISTING_IMAGE_FALLBACK_CLASS}`}
                    >
                      <span className="px-2 text-center text-[10px] font-semibold uppercase text-brand-muted/70">
                        {listing.title}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <OwnerListingStatusBadge status={listing.status} />
                    <span className="text-xs text-brand-muted">{formatListingDate(listing.created_at)}</span>
                  </div>

                  <h2 className="text-lg font-bold text-brand-text">{listing.title}</h2>
                  <p className="text-lg font-extrabold text-brand-primary">{formatListingPrice(listing.price)}</p>

                  <p className="text-sm text-brand-muted">
                    {dbCategoryToDisplay(listing.category)} · {listing.city}
                    {(listing.status === "active" || listing.status === "sold") && listing.view_count > 0
                      ? ` · ${formatListingViewCount(listing.view_count)}`
                      : null}
                  </p>

                  {listing.status === "pending" ? (
                    <p className="text-sm text-brand-muted">Moderator yoxlanışı gözlənilir.</p>
                  ) : null}

                  {listing.status === "rejected" && listing.rejected_reason ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <strong>Rədd səbəbi:</strong> {listing.rejected_reason}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {publicHref ? (
                      <Link
                        href={publicHref}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border px-3 py-2 text-sm font-semibold text-brand-primary hover:border-brand-primary/40"
                      >
                        <ExternalLink className="h-4 w-4" />
                        İctimai səhifə
                      </Link>
                    ) : null}

                    {listing.status === "active" ? (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => runMarkSold(listing.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-brand-border px-3 py-2 text-sm font-semibold text-brand-text hover:border-brand-primary/40 disabled:opacity-70"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Satıldı et
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
