"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { approveListing, rejectListing } from "@/app/admin/listings/actions";
import { OwnerListingStatusBadge } from "@/components/listings/OwnerListingStatusBadge";
import { dbCategoryToDisplay } from "@/lib/listings/category-map";
import { formatListingDate, formatListingPrice } from "@/lib/listings/format";
import type { AdminListing } from "@/lib/listings/admin-listings";

type AdminListingsPanelProps = {
  listings: AdminListing[];
  showModerationActions?: boolean;
  emptyMessage?: string;
};

export function AdminListingsPanel({
  listings,
  showModerationActions = true,
  emptyMessage = "Gözləyən elan yoxdur.",
}: AdminListingsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const runAction = (listingId: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setErrorMessage("");
    setActiveId(listingId);
    startTransition(async () => {
      const result = await action();
      setActiveId(null);
      if (!result.ok) {
        setErrorMessage(result.error ?? "Əməliyyat uğursuz oldu.");
        return;
      }
      router.refresh();
    });
  };

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-center">
        <p className="text-sm text-brand-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-brand-border/90 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-brand-border bg-brand-surface/80 text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Elan</th>
              <th className="px-4 py-3 font-semibold">Kateqoriya</th>
              <th className="px-4 py-3 font-semibold">Şəhər</th>
              <th className="px-4 py-3 font-semibold">Tarix</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">{showModerationActions ? "Əməliyyat" : "Link"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/80">
            {listings.map((listing) => {
              const loading = isPending && activeId === listing.id;

              return (
                <tr key={listing.id} className="align-top">
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/listings/${listing.id}`}
                      className="font-semibold text-brand-text hover:text-brand-primary"
                    >
                      {listing.title}
                    </Link>
                    <p className="mt-1 text-brand-primary">{formatListingPrice(listing.price)}</p>
                  </td>
                  <td className="px-4 py-4 text-brand-muted">{dbCategoryToDisplay(listing.category)}</td>
                  <td className="px-4 py-4 text-brand-muted">{listing.city}</td>
                  <td className="px-4 py-4 text-brand-muted">{formatListingDate(listing.created_at)}</td>
                  <td className="px-4 py-4">
                    <OwnerListingStatusBadge status={listing.status} />
                  </td>
                  <td className="px-4 py-4">
                    {showModerationActions ? (
                      <div className="flex min-w-[220px] flex-col gap-2">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => runAction(listing.id, () => approveListing(listing.id))}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
                        >
                          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Təsdiqlə
                        </button>
                        <input
                          type="text"
                          placeholder="Rədd səbəbi"
                          value={rejectReasons[listing.id] ?? ""}
                          onChange={(e) =>
                            setRejectReasons((prev) => ({ ...prev, [listing.id]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-brand-border px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            runAction(listing.id, () =>
                              rejectListing(listing.id, rejectReasons[listing.id] ?? ""),
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-70"
                        >
                          Rədd et
                        </button>
                        <Link
                          href={`/admin/listings/${listing.id}`}
                          className="text-xs font-semibold text-brand-primary hover:underline"
                        >
                          Ətraflı bax
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/admin/listings/${listing.id}`}
                        className="text-sm font-semibold text-brand-primary hover:underline"
                      >
                        Ətraflı bax
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
