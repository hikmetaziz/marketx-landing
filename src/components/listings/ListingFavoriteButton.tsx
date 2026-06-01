"use client";

import { Heart } from "lucide-react";

import { useLocalFavorites } from "@/hooks/use-local-favorites";

type ListingFavoriteButtonProps = {
  listingId: string;
  title: string;
  className?: string;
};

export function ListingFavoriteButton({ listingId, title, className = "" }: ListingFavoriteButtonProps) {
  const { isFavorited, toggleFavorite, ready } = useLocalFavorites();
  const active = ready && isFavorited(listingId);

  return (
    <button
      type="button"
      aria-label={active ? `${title} favoritdən çıxar` : `${title} favoritə əlavə et`}
      aria-pressed={active}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/90 bg-white/95 shadow-sm backdrop-blur-sm transition-all hover:scale-105 ${className}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(listingId);
      }}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${
          active ? "fill-brand-primary text-brand-primary" : "text-brand-muted hover:text-brand-primary"
        }`}
      />
    </button>
  );
}
