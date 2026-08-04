"use server";

import { revalidatePath } from "next/cache";

import { verifyTurnstileToken } from "@/lib/captcha/turnstile";
import {
  parseCreateListingInput,
  validateListingImageCount,
} from "@/lib/listings/create-listing-validation";
import { translateSupabaseError } from "@/lib/listings/errors";
import { sanitizeImageUrl } from "@/lib/images/validate-image-url";
import { fetchCategorySchemaSnapshot } from "@/lib/category-schema/fetch-category-schemas";
import {
  getResolvedListingSchemaVersions,
  getResolvedPhotoLimit,
} from "@/lib/category-schema/resolve-category-schema";
import { fetchListingTaxonomy } from "@/lib/taxonomy/fetch-listing-taxonomy";
import {
  sanitizeAttributesForInsert,
  validateListingTaxonomyFields,
} from "@/lib/taxonomy/listing-taxonomy-utils";
import { getAuthenticatedUser } from "@/lib/supabase/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  canCreateListingForStore,
  LISTING_CREATION_PERMISSION_MESSAGE,
  LISTING_CREATION_STORE_PERMISSION_MESSAGE,
} from "@/lib/stores/membership";

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

  const parsed = parseCreateListingInput(input, { requireStoreId: true });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const targetStoreId = parsed.data.storeId;
  if (!targetStoreId) {
    return { ok: false, error: LISTING_CREATION_PERMISSION_MESSAGE };
  }

  const supabase = await createClient();
  const hasStoreAccess = await canCreateListingForStore(supabase, targetStoreId, user.id);
  if (!hasStoreAccess) {
    return { ok: false, error: LISTING_CREATION_STORE_PERMISSION_MESSAGE };
  }

  const captcha = await verifyTurnstileToken(captchaToken);
  if (!captcha.ok) {
    return { ok: false, error: captcha.error };
  }

  const [taxonomy, categorySchemaSnapshot] = await Promise.all([
    fetchListingTaxonomy(),
    fetchCategorySchemaSnapshot(),
  ]);
  const taxonomyCheck = validateListingTaxonomyFields(taxonomy, {
    categoryId: parsed.data.categoryId,
    subcategoryId: parsed.data.subcategoryId,
    attributes: parsed.data.attributes,
  }, categorySchemaSnapshot);

  if (!taxonomyCheck.ok) {
    return { ok: false, error: taxonomyCheck.error };
  }

  const sanitizedAttributes = sanitizeAttributesForInsert(
    taxonomy,
    parsed.data.categoryId,
    parsed.data.subcategoryId,
    parsed.data.attributes,
    categorySchemaSnapshot,
  );
  const schemaVersions = getResolvedListingSchemaVersions(
    taxonomy,
    parsed.data.categoryId,
    parsed.data.subcategoryId,
    categorySchemaSnapshot,
  );

  const basePayload = {
    user_id: user.id,
    store_id: targetStoreId,
    title: parsed.data.title,
    price: parsed.data.price,
    category: taxonomyCheck.categoryName,
    category_id: parsed.data.categoryId,
    subcategory_id: parsed.data.subcategoryId,
    attributes: sanitizedAttributes,
    city: parsed.data.city,
    condition: parsed.data.condition,
    condition_code: parsed.data.condition === "Yeni" ? "new" : "good",
    listing_type: "sell",
    price_type: "fixed",
    delivery_type: parsed.data.deliveryAvailable ? "both" : "pickup",
    description: parsed.data.description,
    delivery_available: parsed.data.deliveryAvailable,
    ...schemaVersions,
  };

  let schemaVersionColumnsAvailable = true;
  let { data: inserted, error } = await supabase.from("listings").insert(basePayload).select("id").single();

  if (error?.message?.includes("form_schema_version") || error?.message?.includes("photo_schema_version")) {
    schemaVersionColumnsAvailable = false;
    const withoutSchemaVersions = {
      ...basePayload,
      form_schema_version: undefined,
      photo_schema_version: undefined,
    };
    const retry = await supabase.from("listings").insert(withoutSchemaVersions).select("id").single();
    inserted = retry.data;
    error = retry.error;
  }

  if (error?.message?.includes("delivery_available")) {
    const withoutDelivery = {
      ...basePayload,
      delivery_available: undefined,
      ...(schemaVersionColumnsAvailable
        ? {}
        : { form_schema_version: undefined, photo_schema_version: undefined }),
    };
    const retry = await supabase.from("listings").insert(withoutDelivery).select("id").single();
    inserted = retry.data;
    error = retry.error;
  }

  if (error?.message?.includes("attributes") || error?.message?.includes("category_id")) {
    const legacyPayload = {
      user_id: basePayload.user_id,
      store_id: basePayload.store_id,
      title: basePayload.title,
      price: basePayload.price,
      category: basePayload.category,
      city: basePayload.city,
      condition: basePayload.condition,
      description: basePayload.description,
    };
    const retry = await supabase.from("listings").insert(legacyPayload).select("id").single();
    inserted = retry.data;
    error = retry.error;
  }

  if (error || !inserted) {
    console.error("Create listing insert failed", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    return { ok: false, error: translateSupabaseError(error?.message ?? "Elan yaradılmadı") };
  }

  if (parsed.data.contactPhone) {
    const { error: contactError } = await supabase.from("listing_contacts").insert({
      listing_id: inserted.id,
      contact_phone: parsed.data.contactPhone,
    });

    if (contactError) {
      await supabase.from("listings").delete().eq("id", inserted.id).eq("user_id", user.id);
      console.error("Create listing contact insert failed", {
        code: contactError.code,
        message: contactError.message,
        details: contactError.details,
        hint: contactError.hint,
      });
      return { ok: false, error: translateSupabaseError(contactError.message) };
    }
  }

  revalidatePath("/elanlar");
  revalidatePath("/elan-yarat");
  revalidatePath("/categories");

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

  const urls = imageUrls.map(sanitizeImageUrl).filter((url): url is string => url !== null);
  if (urls.length === 0) {
    return { ok: false, error: "Etibarlı şəkil URL-i tapılmadı." };
  }

  const supabase = await createClient();

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, user_id, category_id, subcategory_id")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return { ok: false, error: "Elan tapılmadı." };
  }

  if (listing.user_id !== user.id) {
    return { ok: false, error: "Bu elana şəkil əlavə etmək icazəniz yoxdur." };
  }

  const [taxonomy, categorySchemaSnapshot] = await Promise.all([
    fetchListingTaxonomy(),
    fetchCategorySchemaSnapshot(),
  ]);
  const maxPhotoCount = getResolvedPhotoLimit(
    taxonomy,
    (listing.category_id as string | null) ?? null,
    (listing.subcategory_id as string | null) ?? null,
    categorySchemaSnapshot,
  );
  const countError = validateListingImageCount(urls.length, maxPhotoCount);
  if (countError) {
    return { ok: false, error: countError };
  }

  let { error: updateError } = await supabase
    .from("listings")
    .update({ image_url: urls[0], image_urls: urls })
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (updateError?.message?.includes("image_urls")) {
    const fallback = await supabase
      .from("listings")
      .update({ image_url: urls[0] })
      .eq("id", listingId)
      .eq("user_id", user.id);
    updateError = fallback.error;
  }

  if (updateError) {
    return { ok: false, error: translateSupabaseError(updateError.message) };
  }

  revalidatePath("/elanlar");
  revalidatePath("/admin/listings");

  return { ok: true };
}
