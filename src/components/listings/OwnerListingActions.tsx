"use client";

import { Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteMyListing, restoreMyListing } from "@/app/account/listings/actions";
import type { ListingStatus } from "@/types/live-listing";

type OwnerListingActionsProps = {
  listingId: string;
  listingTitle: string;
  status: ListingStatus;
  redirectTo?: string;
};

export function OwnerListingActions({
  listingId,
  listingTitle,
  status,
  redirectTo = "/account/listings",
}: OwnerListingActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  const runDelete = () => {
    const confirmed = window.confirm(`"${listingTitle}" elanı silinsin? Elan ictimai səhifələrdən gizlənəcək.`);
    if (!confirmed) return;

    setErrorMessage("");
    startTransition(async () => {
      const result = await deleteMyListing(listingId);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  };

  const runRestore = () => {
    setErrorMessage("");
    startTransition(async () => {
      const result = await restoreMyListing(listingId);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {status === "deleted" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={runRestore}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/30 bg-brand-primary-light px-4 py-2.5 text-sm font-semibold text-brand-primary-dark transition-colors hover:border-brand-primary/50 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Bərpa et
          </button>
        ) : (
          <>
        <Link
          href={`/account/listings/${listingId}/edit`}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/30 bg-brand-primary-light px-4 py-2.5 text-sm font-semibold text-brand-primary-dark transition-colors hover:border-brand-primary/50"
        >
          <Pencil className="h-4 w-4" />
          Düzəliş et
        </Link>
        <button
          type="button"
          disabled={isPending}
          onClick={runDelete}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Elanı sil
        </button>
          </>
        )}
      </div>
    </div>
  );
}
