"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ListingDetailGallery } from "@/components/listings/ListingDetailGallery";
import { ListingShareButton } from "@/components/listings/ListingShareButton";
import { ListingViewDisplay } from "@/components/listings/ListingViewCount";
import { buildListingReportMailto } from "@/lib/listings/report";
import { getListingPublicUrl } from "@/lib/listings/listing-url";
import type { SampleListing } from "@/types/listing";

type SoldSampleListingDetailProps = {
  listing: SampleListing;
};

export function SoldSampleListingDetail({ listing }: SoldSampleListingDetailProps) {
  const listingUrl = getListingPublicUrl(listing.slug);
  const reportMailto = buildListingReportMailto(listing.title, listingUrl);

  return (
    <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start lg:gap-10">
      <div className="min-w-0">
        <ListingDetailGallery listing={listing} title={listing.title} fallbackClass={listing.fallback} />
      </div>

      <aside className="mt-6 lg:sticky lg:top-24 lg:mt-0">
        <div className="card-premium space-y-5 rounded-2xl p-5 sm:p-6 hover:translate-y-0">
          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-brand-text sm:text-[1.75rem]">
              {listing.title}
            </h1>
            <p className="text-2xl font-extrabold text-brand-primary">{listing.price}</p>
            <ListingViewDisplay count={listing.views} />
          </div>

          <dl className="divide-y divide-brand-border/60 overflow-hidden rounded-xl border border-brand-border/80 bg-brand-surface/50">
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-brand-muted">Şəhər</dt>
              <dd className="text-right font-semibold text-brand-text">{listing.location}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-brand-muted">Tarix</dt>
              <dd className="text-right font-semibold text-brand-text">{listing.time}</dd>
            </div>
          </dl>

          <div className="rounded-xl border border-brand-border/80 bg-brand-surface/60 px-4 py-3 text-sm text-brand-muted">
            Bu elan artıq satılıb. Oxşar elanlara baxa və ya kateqoriyalara qayıda bilərsiniz.
          </div>

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
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-brand-border bg-brand-surface px-4 py-3.5 text-sm font-semibold text-brand-muted"
            >
              Bu elan satılıb
            </button>
            <ListingShareButton title={listing.title} slug={listing.slug} shareUrl={listingUrl} variant="tertiary" />
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
