import type { SupabaseClient } from "@supabase/supabase-js";

type FavoriteMutationResult = { ok: true } | { ok: false; reason: "self_favorite" | "failed" };

function getFavoriteErrorReason(error: { code?: string; message?: string }): "self_favorite" | "failed" {
  if (error.code === "23514" && error.message?.includes("owner_cannot_favorite_own_listing")) {
    return "self_favorite";
  }

  return "failed";
}

export async function isListingFavorited(
  supabase: SupabaseClient,
  listingId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data);
}

export async function addListingFavorite(
  supabase: SupabaseClient,
  listingId: string,
  userId: string,
): Promise<FavoriteMutationResult> {
  const { error } = await supabase.from("favorites").upsert(
    {
      user_id: userId,
      listing_id: listingId,
    },
    {
      onConflict: "user_id,listing_id",
      ignoreDuplicates: true,
    },
  );

  return error ? { ok: false, reason: getFavoriteErrorReason(error) } : { ok: true };
}

export async function removeListingFavorite(
  supabase: SupabaseClient,
  listingId: string,
  userId: string,
): Promise<FavoriteMutationResult> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  return error ? { ok: false, reason: "failed" } : { ok: true };
}
