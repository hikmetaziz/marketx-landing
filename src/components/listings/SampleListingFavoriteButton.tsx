"use client";

import { Heart } from "lucide-react";

import { useLocalFavorites } from "@/hooks/use-local-favorites";

type SampleListingFavoriteButtonProps = {
  listingId: string;
};

export function SampleListingFavoriteButton({ listingId }: SampleListingFavoriteButtonProps) {
  const { isFavorited, toggleFavorite, ready } = useLocalFavorites();
  const active = ready && isFavorited(listingId);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(listingId)}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
    >
      <Heart
        className={`h-4 w-4 ${active ? "fill-brand-primary text-brand-primary" : "text-brand-muted"}`}
      />
      {active ? "Favoritdən çıxar" : "Favoritə əlavə et"}
    </button>
  );
}
