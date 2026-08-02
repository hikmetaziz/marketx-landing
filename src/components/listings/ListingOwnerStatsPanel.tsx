import { CalendarDays, Eye, Heart, Signal } from "lucide-react";

import { OwnerListingStatusBadge } from "@/components/listings/OwnerListingStatusBadge";
import { formatListingDate, formatListingViewCount } from "@/lib/listings/format";
import type { ListingStatus } from "@/types/live-listing";

type ListingOwnerStatsPanelProps = {
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  status: ListingStatus;
};

function formatCount(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function ListingOwnerStatsPanel({
  viewCount,
  favoriteCount,
  createdAt,
  status,
}: ListingOwnerStatsPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-brand-border/80 bg-white">
      <div className="border-b border-brand-border/70 px-4 py-3">
        <h2 className="text-base font-extrabold text-brand-text">Statistika</h2>
      </div>

      <dl className="grid sm:grid-cols-2">
        <div className="border-b border-brand-border/60 px-4 py-3 sm:border-r">
          <dt className="flex items-center gap-2 text-xs font-semibold text-brand-muted">
            <Eye className="h-3.5 w-3.5" />
            Baxış sayı
          </dt>
          <dd className="mt-1 text-sm font-extrabold text-brand-text">{formatListingViewCount(viewCount)}</dd>
        </div>

        <div className="border-b border-brand-border/60 px-4 py-3">
          <dt className="flex items-center gap-2 text-xs font-semibold text-brand-muted">
            <Heart className="h-3.5 w-3.5" />
            Favorit sayı
          </dt>
          <dd className="mt-1 text-sm font-extrabold text-brand-text">{formatCount(favoriteCount)} favorit</dd>
        </div>

        <div className="border-b border-brand-border/60 px-4 py-3 sm:border-r sm:border-b-0">
          <dt className="flex items-center gap-2 text-xs font-semibold text-brand-muted">
            <CalendarDays className="h-3.5 w-3.5" />
            Yaradılma tarixi
          </dt>
          <dd className="mt-1 text-sm font-extrabold text-brand-text">{formatListingDate(createdAt)}</dd>
        </div>

        <div className="px-4 py-3">
          <dt className="flex items-center gap-2 text-xs font-semibold text-brand-muted">
            <Signal className="h-3.5 w-3.5" />
            Status
          </dt>
          <dd className="mt-1">
            <OwnerListingStatusBadge status={status} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
