import type { SupabaseClient } from "@supabase/supabase-js";

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
): Promise<{ ok: true } | { ok: false }> {
  const { error } = await supabase.from("favorites").insert({
    user_id: userId,
    listing_id: listingId,
  });

  return error ? { ok: false } : { ok: true };
}

export async function removeListingFavorite(
  supabase: SupabaseClient,
  listingId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false }> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  return error ? { ok: false } : { ok: true };
}
