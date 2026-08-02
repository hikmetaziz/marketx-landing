"use client";

import { useListingDetailRealtimeRefresh } from "@/hooks/use-listing-realtime-refresh";

import {
  ListingDetailAttributes,
  ListingDetailDescription,
  ListingDetailExpiry,
  ListingDetailFacts,
  ListingDetailNumber,
  ListingDetailSeller,
} from "@/components/listings/ListingDetailSections";
import { ListingDetailLiveStats } from "@/components/listings/ListingDetailLiveStats";
import { ListingDetailGallery } from "@/components/listings/ListingDetailGallery";
import { ListingActionBar } from "@/components/listings/ListingActionBar";
import { ListingOwnerStatsPanel } from "@/components/listings/ListingOwnerStatsPanel";
import { ListingPaymentWarning } from "@/components/listings/ListingPaymentWarning";
import { dbCategoryToDisplay } from "@/lib/listings/category-map";
import { formatListingNumberLabel } from "@/lib/listings/format-listing-number";
import { formatListingPrice } from "@/lib/listings/format";
import { getListingPublicUrl } from "@/lib/listings/listing-url";
import type { LiveListingDetailView } from "@/types/live-listing";

type LiveListingDetailProps = {
  listing: LiveListingDetailView;
  hasContactPhone: boolean;
  canManage?: boolean;
  isAuthenticated?: boolean;
  createdAtLabel: string;
  sellerLabel: string;
  favoriteCount: number;
  attributeRows: Array<{ label: string; value: string }>;
};

export function LiveListingDetail({
  listing,
  hasContactPhone,
  canManage = false,
  isAuthenticated = false,
  createdAtLabel,
  sellerLabel,
  favoriteCount,
  attributeRows,
}: LiveListingDetailProps) {
  useListingDetailRealtimeRefresh(listing.id);

  const isSold = listing.status === "sold";
  const isActive = listing.status === "active";
  const listingUrl = getListingPublicUrl(listing.slug);
  const listingNumberLabel =
    listing.listing_number != null ? formatListingNumberLabel(listing.listing_number) : null;
  const showPublicStats = isActive && !canManage;
  const showPaymentWarning = !canManage;
  const showSellerCard = !canManage && isActive && !listing.store_id;

  const factRows = [
    { label: "Şəhər", value: listing.city },
    { label: "Kateqoriya", value: dbCategoryToDisplay(listing.category) },
    { label: "Yeni?", value: listing.condition === "Yeni" ? "Bəli" : "Xeyr" },
    { label: "Çatdırılma?", value: listing.delivery_available ? "Bəli" : "Xeyr" },
    { label: "Tarix", value: createdAtLabel },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <ListingDetailGallery listing={listing} title={listing.title} />

      <div className="space-y-4 px-0.5">
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-brand-text sm:text-[1.75rem]">
            {listing.title}
          </h1>
          <p className="text-2xl font-extrabold text-brand-primary">{formatListingPrice(listing.price)}</p>
          {listingNumberLabel ? <ListingDetailNumber label={listingNumberLabel} /> : null}
          <p className="text-sm text-brand-muted">{createdAtLabel}</p>
        </div>

        {showPublicStats ? (
          <ListingDetailLiveStats
            listingId={listing.id}
            initialViews={listing.view_count}
            favorites={favoriteCount}
          />
        ) : null}

        {canManage ? (
          <div className="space-y-3">
            <ListingOwnerStatsPanel
              viewCount={listing.view_count}
              favoriteCount={favoriteCount}
              createdAt={listing.created_at}
              status={listing.status}
            />
            <ListingDetailExpiry
              createdAt={listing.created_at}
              expiresAt={listing.expires_at ?? null}
              status={listing.status}
            />
            <ListingActionBar
              listing={listing}
              isOwner
              isAuthenticated={isAuthenticated}
              hasContactPhone={hasContactPhone}
              shareUrl={listingUrl}
            />
          </div>
        ) : null}

        <ListingDetailFacts rows={factRows} />

        <ListingDetailAttributes rows={attributeRows} />

        <ListingDetailDescription description={listing.description} />

        {showSellerCard ? <ListingDetailSeller sellerLabel={sellerLabel} /> : null}

        {showPaymentWarning ? <ListingPaymentWarning /> : null}

        {isSold ? (
          <div className="rounded-xl border border-brand-border/80 bg-brand-surface/60 px-4 py-3 text-sm text-brand-muted">
            Bu elan artıq satılıb. Satıcı ilə əlaqə mümkün deyil.
          </div>
        ) : null}

        {!canManage ? (
          <div className="border-t border-brand-border/70 pt-4">
            <ListingActionBar
              listing={listing}
              isOwner={false}
              isAuthenticated={isAuthenticated}
              hasContactPhone={hasContactPhone}
              shareUrl={listingUrl}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
