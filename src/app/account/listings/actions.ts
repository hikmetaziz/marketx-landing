"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUser } from "@/lib/supabase/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type MarkSoldResult = { ok: true } | { ok: false; error: string };

export async function markMyListingSold(listingId: string): Promise<MarkSoldResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamısınız." };
  }

  const supabase = await createClient();
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("id, user_id, status, slug")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError || !listing) {
    return { ok: false, error: "Elan tapılmadı." };
  }

  if (listing.user_id !== user.id) {
    return { ok: false, error: "Bu elan sizə aid deyil." };
  }

  if (listing.status !== "active") {
    return { ok: false, error: "Yalnız aktiv elanı satıldı edə bilərsiniz." };
  }

  const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", listingId);

  if (error) {
    return { ok: false, error: "Status yenilənmədi." };
  }

  revalidatePath("/account/listings");
  revalidatePath("/listings");
  if (listing.slug) {
    revalidatePath(`/listings/${listing.slug}`);
  }

  return { ok: true };
}

type RenewResult = { ok: true } | { ok: false; error: string };

export async function renewMyListing(listingId: string): Promise<RenewResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamısınız." };
  }

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("slug")
    .eq("id", listingId)
    .maybeSingle();

  const { error } = await supabase.rpc("renew_listing", { p_listing_id: listingId });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/account/listings");
  revalidatePath("/listings");
  revalidatePath("/");

  if (listing?.slug) {
    revalidatePath(`/listings/${listing.slug}`);
  }

  return { ok: true };
}
