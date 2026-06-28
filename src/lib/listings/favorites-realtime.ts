import type { SupabaseClient } from "@supabase/supabase-js";

type FavoriteRow = {
  listing_id?: string;
};

export function subscribeToListingFavorite(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  onChange: (favorited: boolean) => void,
): () => void {
  const channel = supabase
    .channel(`favorite:${userId}:${listingId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "favorites",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as FavoriteRow;
        if (row.listing_id === listingId) {
          onChange(true);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "favorites",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.old as FavoriteRow;
        if (row.listing_id === listingId) {
          onChange(false);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
