import Link from "next/link";

import { STORE_STATUS_LABELS } from "@/lib/stores/store-copy";
import type { Store } from "@/types/store";

const STATUS_BADGE_CLASS: Record<string, string> = {
  unclaimed: "border-brand-border bg-brand-surface text-brand-muted",
  claim_pending: "border-amber-200 bg-amber-50 text-amber-700",
  claimed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  suspended: "border-red-200 bg-red-50 text-red-700",
};

export function StoreStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_BADGE_CLASS[status] ?? STATUS_BADGE_CLASS.unclaimed
      }`}
    >
      {STORE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function AdminStoresPanel({ stores }: { stores: Store[] }) {
  if (stores.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-center">
        <p className="text-sm text-brand-muted">Mağaza tapılmadı.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-border/90 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-brand-border bg-brand-surface/80 text-xs uppercase tracking-wide text-brand-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Mağaza</th>
            <th className="px-4 py-3 font-semibold">Kod</th>
            <th className="px-4 py-3 font-semibold">Şəhər</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Tarix</th>
            <th className="px-4 py-3 font-semibold">Əməliyyat</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border/80">
          {stores.map((store) => (
            <tr key={store.id} className="align-top">
              <td className="px-4 py-4">
                <p className="font-semibold text-brand-text">{store.name}</p>
                {store.category ? <p className="mt-0.5 text-xs text-brand-muted">{store.category}</p> : null}
              </td>
              <td className="px-4 py-4 font-mono text-xs text-brand-muted">{store.store_code}</td>
              <td className="px-4 py-4 text-brand-muted">{store.city ?? "—"}</td>
              <td className="px-4 py-4">
                <StoreStatusBadge status={store.status} />
              </td>
              <td className="px-4 py-4 text-brand-muted">
                {new Date(store.created_at).toLocaleDateString("az-Latn-AZ")}
              </td>
              <td className="px-4 py-4">
                <Link
                  href={`/admin/stores/${store.id}`}
                  className="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
                >
                  Ətraflı
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
