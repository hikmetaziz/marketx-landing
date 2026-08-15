import Link from "next/link";

import type { AdminStoreStatusFilter } from "@/lib/stores/stores";

const TABS: Array<{ value: AdminStoreStatusFilter; label: string }> = [
  { value: "all", label: "Hamısı" },
  { value: "unclaimed", label: "Sahibsiz" },
  { value: "claim_pending", label: "Gözləyən" },
  { value: "claimed", label: "Sahiblənmiş" },
  { value: "suspended", label: "Dayandırılmış" },
];

export function AdminStoreStatusTabs({ active }: { active: AdminStoreStatusFilter }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Mağaza status filtri">
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        const href = tab.value === "all" ? "/admin/stores" : `/admin/stores?status=${tab.value}`;

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
