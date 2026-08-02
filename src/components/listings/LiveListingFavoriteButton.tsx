"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLiveListingFavorite } from "@/hooks/use-live-listing-favorite";

type LiveListingFavoriteButtonProps = {
  listingId: string;
};

export function LiveListingFavoriteButton({ listingId }: LiveListingFavoriteButtonProps) {
  const pathname = usePathname();
  const { favorited, toggleFavorite, loading, actionLoading, errorMessage, needsLogin, favoritesAvailable } =
    useLiveListingFavorite(listingId);

  if (!favoritesAvailable) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-sm font-semibold text-brand-muted"
      >
        Favorit tezliklə
      </button>
    );
  }

  if (needsLogin) {
    const returnTo = pathname || "/elanlar";
    return (
      <Link
        href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
      >
        <Heart className="h-4 w-4 text-brand-muted" />
        Daxil olun
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void toggleFavorite()}
        disabled={loading || actionLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-70"
      >
        <Heart
          className={`h-4 w-4 ${favorited ? "fill-brand-primary text-brand-primary" : "text-brand-muted"}`}
        />
        {favorited ? "Favoritdən çıxar" : "Favoritə əlavə et"}
      </button>
      {errorMessage ? <p className="text-center text-xs font-medium text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
