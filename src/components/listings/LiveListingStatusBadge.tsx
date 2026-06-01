import type { PublicListingStatus } from "@/types/live-listing";

const STYLES: Record<PublicListingStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  sold: "border-slate-200 bg-slate-100 text-slate-600",
};

const LABELS: Record<PublicListingStatus, string> = {
  active: "Aktiv",
  sold: "Satıldı",
};

type LiveListingStatusBadgeProps = {
  status: PublicListingStatus;
  className?: string;
};

export function LiveListingStatusBadge({ status, className = "" }: LiveListingStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STYLES[status]} ${className}`}
    >
      {LABELS[status]}
    </span>
  );
}
