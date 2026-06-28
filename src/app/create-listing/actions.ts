"use server";

import { revalidatePath } from "next/cache";

import { verifyTurnstileToken } from "@/lib/captcha/turnstile";
import {
  parseCreateListingInput,
  validateListingImageCount,
} from "@/lib/listings/create-listing-validation";
import { translateSupabaseError } from "@/lib/listings/errors";
import { sanitizeImageUrl } from "@/lib/images/validate-image-url";
import { getAuthenticatedUser } from "@/lib/supabase/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type CreateListingResult =
  | { ok: true; listingId: string }
  | { ok: false; error: string };

export type AttachListingImagesResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createListing(
  input: unknown,
  captchaToken?: string | null,
): Promise<CreateListingResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamısınız." };
  }

  const captcha = await verifyTurnstileToken(captchaToken);
  if (!captcha.ok) {
    return { ok: false, error: captcha.error };
  }

  const parsed = parseCreateListingInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createClient();
  const payload = {
    user_id: user.id,
    title: parsed.data.title,
    price: parsed.data.price,
    category: parsed.data.category,
    city: parsed.data.city,
    condition: parsed.data.condition,
    description: parsed.data.description,
    delivery_available: parsed.data.deliveryAvailable,
  };

  let { data: inserted, error } = await supabase.from("listings").insert(payload).select("id").single();

  if (error?.message?.includes("delivery_available")) {
    const withoutDelivery = {
      user_id: payload.user_id,
      title: payload.title,
      price: payload.price,
      category: payload.category,
      city: payload.city,
      condition: payload.condition,
      description: payload.description,
    };
    const retry = await supabase.from("listings").insert(withoutDelivery).select("id").single();
    inserted = retry.data;
    error = retry.error;
  }

  if (error || !inserted) {
    return { ok: false, error: translateSupabaseError(error?.message ?? "Elan yaradılmadı") };
  }

  if (parsed.data.contactPhone) {
    const { error: contactError } = await supabase.from("listing_contacts").insert({
      listing_id: inserted.id,
      contact_phone: parsed.data.contactPhone,
    });

    if (contactError) {
      await supabase.from("listings").delete().eq("id", inserted.id);
      return { ok: false, error: translateSupabaseError(contactError.message) };
    }
  }

  revalidatePath("/listings");
  revalidatePath("/create-listing");

  return { ok: true, listingId: inserted.id };
}

export async function attachListingImages(
  listingId: string,
  imageUrls: string[],
): Promise<AttachListingImagesResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamısınız." };
  }

  const countError = validateListingImageCount(imageUrls.length);
  if (countError) {
    return { ok: false, error: countError };
  }

  const urls = imageUrls.map(sanitizeImageUrl).filter((url): url is string => url !== null);
  if (urls.length === 0) {
    return { ok: false, error: "Etibarlı şəkil URL-i tapılmadı." };
  }

  const supabase = await createClient();

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, user_id")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return { ok: false, error: "Elan tapılmadı." };
  }

  if (listing.user_id !== user.id) {
    return { ok: false, error: "Bu elana şəkil əlavə etmək icazəniz yoxdur." };
  }

  let { error: updateError } = await supabase
    .from("listings")
    .update({ image_url: urls[0], image_urls: urls })
    .eq("id", listingId);

  if (updateError?.message?.includes("image_urls")) {
    const fallback = await supabase.from("listings").update({ image_url: urls[0] }).eq("id", listingId);
    updateError = fallback.error;
  }

  if (updateError) {
    return { ok: false, error: translateSupabaseError(updateError.message) };
  }

  revalidatePath("/listings");
  revalidatePath("/admin/listings");

  return { ok: true };
}
