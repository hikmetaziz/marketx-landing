import Link from "next/link";

import type { AdminListingStatusFilter } from "@/lib/listings/admin-listings";

const TABS: Array<{ value: AdminListingStatusFilter; label: string }> = [
  { value: "pending", label: "Gözləyən" },
  { value: "active", label: "Aktiv" },
  { value: "sold", label: "Satıldı" },
  { value: "rejected", label: "Rədd" },
  { value: "archived", label: "Arxiv" },
  { value: "deleted", label: "Silinib" },
  { value: "all", label: "Hamısı" },
];

type AdminListingStatusTabsProps = {
  active: AdminListingStatusFilter;
};

export function AdminListingStatusTabs({ active }: AdminListingStatusTabsProps) {
  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Elan status filtri"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        const href = tab.value === "pending" ? "/admin/listings" : `/admin/listings?status=${tab.value}`;

        return (
          <Link
            key={tab.value}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              isActive
                ? "border-brand-primary bg-brand-primary-light text-brand-primary-dark"
                : "border-brand-border bg-white text-brand-muted hover:border-brand-primary/30 hover:text-brand-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function getAdminListingsEmptyMessage(status: AdminListingStatusFilter): string {
  switch (status) {
    case "pending":
      return "Gözləyən elan yoxdur.";
    case "active":
      return "Aktiv elan yoxdur.";
    case "sold":
      return "Satılmış elan yoxdur.";
    case "rejected":
      return "Rədd edilmiş elan yoxdur.";
    case "archived":
      return "Arxivdə elan yoxdur.";
    case "deleted":
      return "Silinmiş elan yoxdur.";
    case "all":
      return "Elan tapılmadı.";
    default:
      return "Elan tapılmadı.";
  }
}
