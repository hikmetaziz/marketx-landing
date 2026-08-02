import type { ListingStatus } from "@/types/live-listing";

const STYLES: Record<ListingStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  sold: "border-slate-200 bg-slate-100 text-slate-600",
  rejected: "border-red-200 bg-red-50 text-red-700",
  archived: "border-brand-border bg-brand-surface text-brand-muted",
  deleted: "border-red-200 bg-red-50 text-red-700",
};

const LABELS: Record<ListingStatus, string> = {
  pending: "Gözləyir",
  active: "Aktiv",
  sold: "Satıldı",
  rejected: "Rədd edilib",
  archived: "Arxiv",
  deleted: "Silinib",
};

type OwnerListingStatusBadgeProps = {
  status: ListingStatus;
  className?: string;
};

export function OwnerListingStatusBadge({ status, className = "" }: OwnerListingStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STYLES[status]} ${className}`}
    >
      {LABELS[status]}
    </span>
  );
}
