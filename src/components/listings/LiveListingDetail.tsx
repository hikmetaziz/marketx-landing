"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { useListingDetailRealtimeRefresh } from "@/hooks/use-listing-realtime-refresh";

import { LiveListingFavoriteButton } from "@/components/listings/LiveListingFavoriteButton";
import { ListingMessageButton } from "@/components/messaging/ListingMessageButton";
import { ListingDetailGallery } from "@/components/listings/ListingDetailGallery";
import { ListingDetailMetadata } from "@/components/listings/ListingDetailMetadata";
import { ListingPhoneReveal } from "@/components/listings/ListingPhoneReveal";
import { OpenInAppLink } from "@/components/listings/OpenInAppLink";
import { ListingShareButton } from "@/components/listings/ListingShareButton";
import { ListingViewCount } from "@/components/listings/ListingViewCount";
import { getListingPublicUrl } from "@/lib/listings/listing-url";
import { dbCategoryToDisplay } from "@/lib/listings/category-map";
import { formatListingPrice, formatListingRelativeDate } from "@/lib/listings/format";
import { buildListingReportMailto } from "@/lib/listings/report";
import type { LiveListingDetailView } from "@/types/live-listing";

type LiveListingDetailProps = {
  listing: LiveListingDetailView;
  hasContactPhone: boolean;
};

function DescriptionCard({
  description,
  className = "",
}: {
  description: string | null;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-brand-border/80 bg-brand-surface/50 p-4 ${className}`}>
      <h2 className="text-sm font-bold text-brand-text">Təsvir</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
        {description?.trim() || "Bu elan üçün əlavə təsvir daxil edilməyib."}
      </p>
    </div>
  );
}

export function LiveListingDetail({ listing, hasContactPhone }: LiveListingDetailProps) {
  useListingDetailRealtimeRefresh(listing.id);
  const isSold = listing.status === "sold";
  const listingUrl = getListingPublicUrl(listing.slug);
  const reportMailto = buildListingReportMailto(listing.title, listingUrl);

  const metadataItems = [
    { label: "Kateqoriya", value: dbCategoryToDisplay(listing.category) },
    { label: "Şəhər", value: listing.city },
    ...(listing.condition ? [{ label: "Vəziyyət", value: listing.condition }] : []),
    { label: "Tarix", value: formatListingRelativeDate(listing.created_at) },
  ];

  return (
    <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start lg:gap-10">
      <div className="min-w-0 space-y-6">
        <ListingDetailGallery listing={listing} title={listing.title} />
        <DescriptionCard description={listing.description} className="hidden lg:block" />
      </div>

      <aside className="mt-6 space-y-6 lg:sticky lg:top-24 lg:mt-0">
        <div className="card-premium space-y-5 rounded-2xl p-5 sm:p-6 hover:translate-y-0">
          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-brand-text sm:text-[1.75rem]">
              {listing.title}
            </h1>
            <p className="text-2xl font-extrabold text-brand-primary">{formatListingPrice(listing.price)}</p>
            <ListingViewCount listingId={listing.id} initialCount={listing.view_count} />
          </div>

          <ListingDetailMetadata items={metadataItems} />

          <DescriptionCard description={listing.description} className="lg:hidden" />

          {isSold ? (
            <div className="rounded-xl border border-brand-border/80 bg-brand-surface/60 px-4 py-3 text-sm text-brand-muted">
              Bu elan artıq satılıb. Satıcı ilə əlaqə mümkün deyil.
            </div>
          ) : null}

          <div className="rounded-xl border border-brand-primary/15 bg-brand-primary-light/40 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-brand-text">Təhlükəsiz alış-satış üçün</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
                  Ödəniş etməzdən əvvəl məhsulu yoxlayın. Şəxsi məlumatlarınızı və kart məlumatlarınızı
                  paylaşmayın.
                </p>
                <a
                  href={reportMailto}
                  className="mt-3 inline-flex text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-dark"
                >
                  Şikayət et
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <ListingPhoneReveal
              slug={listing.slug}
              status={listing.status}
              hasContactPhone={hasContactPhone}
            />
            <ListingMessageButton
              listingId={listing.id}
              sellerId={listing.user_id}
              slug={listing.slug}
              status={listing.status}
            />
            <LiveListingFavoriteButton key={listing.id} listingId={listing.id} />
            <OpenInAppLink slug={listing.slug} />
            <ListingShareButton
              title={listing.title}
              slug={listing.slug}
              shareUrl={listingUrl}
              variant="tertiary"
            />
          </div>

          <div className="flex flex-col gap-2.5 border-t border-brand-border/70 pt-5 sm:flex-row">
            <Link
              href="/listings"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-brand-border bg-white px-5 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
            >
              Bütün elanlar
            </Link>
            <Link
              href="/"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-brand-border bg-white px-5 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
            >
              Ana səhifəyə qayıt
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
