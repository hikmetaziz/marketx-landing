"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getFavoriteListingIds,
  subscribeFavoriteListingIds,
  toggleFavoriteListingId,
} from "@/lib/listings/local-favorites";

export function useLocalFavorites() {
  const favoriteIds = useSyncExternalStore(
    subscribeFavoriteListingIds,
    getFavoriteListingIds,
    () => [] as string[],
  );

  const isFavorited = useCallback(
    (listingId: string) => favoriteIds.includes(listingId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback((listingId: string) => toggleFavoriteListingId(listingId), []);

  return { favoriteIds, isFavorited, toggleFavorite, ready: true };
}
