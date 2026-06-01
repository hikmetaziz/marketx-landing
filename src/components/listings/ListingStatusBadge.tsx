import type { PublicListingStatus } from "@/types/live-listing";

const LABELS: Record<PublicListingStatus, string> = {
  sold: "Satıldı",
  active: "Aktiv",
};

type ListingStatusBadgeProps = {
  status: PublicListingStatus;
  className?: string;
};

export function ListingStatusBadge({ status, className = "" }: ListingStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-slate-800/88 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm ${className}`}
    >
      {LABELS[status]}
    </span>
  );
}
