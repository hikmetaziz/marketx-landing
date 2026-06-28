import type { SupabaseClient } from "@supabase/supabase-js";

export function subscribeToUserListings(
  supabase: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`listings:user:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "listings",
        filter: `user_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "listings",
        filter: `user_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToListing(
  supabase: SupabaseClient,
  listingId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`listing:${listingId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "listings",
        filter: `id=eq.${listingId}`,
      },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "listings",
        filter: `id=eq.${listingId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
