"use server";

import { revalidatePath } from "next/cache";

import { parseCreateListingInput, validateListingImageCount } from "@/lib/listings/create-listing-validation";
import { translateSupabaseError } from "@/lib/listings/errors";
import { sanitizeImageUrl } from "@/lib/images/validate-image-url";
import { fetchCategorySchemaSnapshot } from "@/lib/category-schema/fetch-category-schemas";
import {
  getResolvedListingSchemaVersions,
  getResolvedPhotoLimit,
} from "@/lib/category-schema/resolve-category-schema";
import { fetchListingTaxonomy } from "@/lib/taxonomy/fetch-listing-taxonomy";
import {
  getAttributeDefinitions,
  sanitizeAttributesForInsert,
  validateListingTaxonomyFields,
} from "@/lib/taxonomy/listing-taxonomy-utils";
import { getAuthenticatedUser } from "@/lib/supabase/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getListingManagementAccess } from "@/lib/listings/listing-management-access";
import {
  canCreateListingForStore,
  LISTING_CREATION_PERMISSION_MESSAGE,
} from "@/lib/stores/membership";

type ActionResult = { ok: true } | { ok: false; error: string };
type UpdateListingResult = { ok: true; slug: string | null } | { ok: false; error: string };
type MarkSoldResult = ActionResult;
type DuplicateListingResult = { ok: true; listingId: string } | { ok: false; error: string };

function parseExistingAttributes(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function mergePreservedUnknownAttributes(
  existingAttributes: Record<string, unknown>,
  sanitizedAttributes: Record<string, string | number | boolean | string[]>,
  knownKeys: Set<string>,
): Record<string, unknown> {
  const preserved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(existingAttributes)) {
    if (!knownKeys.has(key)) {
      preserved[key] = value;
    }
  }
  return { ...preserved, ...sanitizedAttributes };
}

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
    .select("id, user_id, store_id, status, slug")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError || !listing) {
    return { ok: false, error: "Elan tapılmadı." };
  }

  const access = await getListingManagementAccess(supabase, {
    user_id: (listing.user_id as string | null) ?? null,
    store_id: (listing.store_id as string | null) ?? null,
  }, user.id);
  if (!access.canArchive) {
    return { ok: false, error: "Bu elan sizə aid deyil." };
  }

  if (listing.status !== "active") {
    return { ok: false, error: "Yalnız aktiv elanı satıldı edə bilərsiniz." };
  }

  const { data: updated, error } = await supabase
    .from("listings")
    .update({ status: "sold" })
    .eq("id", listingId)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Status yenilənmədi." };
  }
  if (!updated) {
    return { ok: false, error: "Status yenilənmədi. İcazənizi yoxlayın." };
  }

  revalidatePath("/account/listings");
  revalidatePath("/elanlar");
  if (listing.slug) {
    revalidatePath(`/elanlar/${listing.slug}`);
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
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.rpc("renew_listing", { p_listing_id: listingId });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/account/listings");
  revalidatePath("/elanlar");
  revalidatePath("/");

  if (listing?.slug) {
    revalidatePath(`/elanlar/${listing.slug}`);
  }

  return { ok: true };
}

export async function archiveMyListing(listingId: string): Promise<ActionResult> {
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
    .select("id, user_id, store_id, status, slug")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError || !listing) {
    return { ok: false, error: "Elan tapılmadı." };
  }

  const access = await getListingManagementAccess(supabase, {
    user_id: (listing.user_id as string | null) ?? null,
    store_id: (listing.store_id as string | null) ?? null,
  }, user.id);
  if (!access.canArchive) {
    return { ok: false, error: "Bu elanı arxivləmək üçün icazəniz yoxdur." };
  }

  if (listing.status === "deleted") {
    return { ok: true };
  }

  if (listing.status !== "active" && listing.status !== "sold" && listing.status !== "archived") {
    return { ok: false, error: "Yalnız aktiv və ya satılmış elan arxivlənə bilər." };
  }

  const deletedAt = new Date();

  const { data: updated, error } = await supabase
    .from("listings")
    .update({
      status: "deleted",
      deleted_at: deletedAt.toISOString(),
      purge_after: null,
    })
    .eq("id", listingId)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return { ok: false, error: translateSupabaseError(error.message) };
  }
  if (!updated) {
    return { ok: false, error: "Elan arxivlənmədi. İcazənizi yoxlayın." };
  }

  revalidatePath("/account/listings");
  revalidatePath("/account/messages");
  revalidatePath("/elanlar");
  revalidatePath("/");
  revalidatePath("/categories");
  if (listing.slug) {
    revalidatePath(`/elanlar/${listing.slug}`);
  }

  return { ok: true };
}

export async function duplicateMyListing(listingId: string): Promise<DuplicateListingResult> {
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
    .select(
      "id, user_id, store_id, title, price, category, category_id, subcategory_id, attributes, city, condition, description, delivery_available, image_url, image_urls",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError || !listing) {
    return { ok: false, error: "Elan tapılmadı və ya sizə aid deyil." };
  }

  // Security: ownership is enforced server-side before duplicating a listing.
  const access = await getListingManagementAccess(supabase, {
    user_id: (listing.user_id as string | null) ?? null,
    store_id: (listing.store_id as string | null) ?? null,
  }, user.id);
  if (!access.canEdit) {
    return { ok: false, error: "Bu elanı kopyalamaq üçün icazəniz yoxdur." };
  }

  const storeId = typeof listing.store_id === "string" ? listing.store_id : null;
  if (!storeId) {
    return { ok: false, error: LISTING_CREATION_PERMISSION_MESSAGE };
  }

  const hasStoreAccess = await canCreateListingForStore(supabase, storeId, user.id);
  if (!hasStoreAccess) {
    return { ok: false, error: LISTING_CREATION_PERMISSION_MESSAGE };
  }

  const { data: contact } = await supabase
    .from("listing_contacts")
    .select("contact_phone")
    .eq("listing_id", listingId)
    .maybeSingle();

  const duplicatePayload = {
    user_id: user.id,
    store_id: storeId,
    status: "pending",
    title: `${listing.title} (kopya)`,
    price: Number(listing.price),
    category: listing.category,
    category_id: listing.category_id,
    subcategory_id: listing.subcategory_id,
    attributes: listing.attributes,
    city: listing.city,
    condition: listing.condition,
    condition_code: listing.condition === "Yeni" ? "new" : "good",
    listing_type: "sell",
    price_type: "fixed",
    delivery_type: listing.delivery_available ? "both" : "pickup",
    description: listing.description,
    delivery_available: listing.delivery_available,
    image_url: listing.image_url,
    image_urls: listing.image_urls,
  };

  let { data: inserted, error } = await supabase
    .from("listings")
    .insert(duplicatePayload)
    .select("id")
    .single();

  if (error?.message?.includes("delivery_available")) {
    const withoutDelivery = {
      ...duplicatePayload,
      delivery_available: undefined,
    };
    const retry = await supabase.from("listings").insert(withoutDelivery).select("id").single();
    inserted = retry.data;
    error = retry.error;
  }

  if (error?.message?.includes("attributes") || error?.message?.includes("category_id")) {
    const legacyPayload = {
      user_id: duplicatePayload.user_id,
      store_id: duplicatePayload.store_id,
      status: duplicatePayload.status,
      title: duplicatePayload.title,
      price: duplicatePayload.price,
      category: duplicatePayload.category,
      city: duplicatePayload.city,
      condition: duplicatePayload.condition,
      description: duplicatePayload.description,
      image_url: duplicatePayload.image_url,
      image_urls: duplicatePayload.image_urls,
    };
    const retry = await supabase.from("listings").insert(legacyPayload).select("id").single();
    inserted = retry.data;
    error = retry.error;
  }

  if (error || !inserted) {
    return { ok: false, error: translateSupabaseError(error?.message ?? "Elan kopyalanmadı.") };
  }

  const contactPhone = typeof contact?.contact_phone === "string" ? contact.contact_phone.trim() : "";
  if (contactPhone) {
    await supabase.from("listing_contacts").upsert(
      {
        listing_id: inserted.id as string,
        contact_phone: contactPhone,
      },
      { onConflict: "listing_id" },
    );
  }

  revalidatePath("/account/listings");
  return { ok: true, listingId: inserted.id as string };
}

export async function deleteMyListing(listingId: string): Promise<ActionResult> {
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
    .select("id, user_id, store_id, status, slug")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError || !listing) {
    return { ok: false, error: "Elan tapılmadı." };
  }

  const access = await getListingManagementAccess(supabase, {
    user_id: (listing.user_id as string | null) ?? null,
    store_id: (listing.store_id as string | null) ?? null,
  }, user.id);
  if (!access.canArchive) {
    return { ok: false, error: "Bu elanı silmək üçün icazəniz yoxdur." };
  }

  if (listing.status === "deleted") {
    return { ok: true };
  }

  const deletedAt = new Date();

  const { data: updated, error } = await supabase
    .from("listings")
    .update({
      status: "deleted",
      deleted_at: deletedAt.toISOString(),
      purge_after: null,
    })
    .eq("id", listingId)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return { ok: false, error: translateSupabaseError(error.message) };
  }
  if (!updated) {
    return { ok: false, error: "Elan silinmədi. İcazənizi yoxlayın." };
  }

  revalidatePath("/account/listings");
  revalidatePath("/account/messages");
  revalidatePath("/elanlar");
  revalidatePath("/");
  revalidatePath("/categories");
  if (listing.slug) {
    revalidatePath(`/elanlar/${listing.slug}`);
  }

  return { ok: true };
}

export async function restoreMyListing(listingId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyasÄ± tapÄ±lmadÄ±." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamÄ±sÄ±nÄ±z." };
  }

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("slug")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.rpc("restore_my_listing", { p_listing_id: listingId });

  if (error) {
    return { ok: false, error: translateSupabaseError(error.message) };
  }

  revalidatePath("/account/listings");
  revalidatePath("/admin/listings");
  revalidatePath("/elanlar");
  revalidatePath("/");
  revalidatePath("/categories");
  if (listing?.slug) {
    revalidatePath(`/elanlar/${listing.slug}`);
  }

  return { ok: true };
}

export async function updateMyListing(
  listingId: string,
  input: unknown,
  imageUrls: string[],
): Promise<UpdateListingResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamısınız." };
  }

  const parsed = parseCreateListingInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
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

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("listings")
    .select("id, user_id, store_id, slug, status, attributes")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: "Elan tapılmadı." };
  }

  const access = await getListingManagementAccess(supabase, {
    user_id: (existing.user_id as string | null) ?? null,
    store_id: (existing.store_id as string | null) ?? null,
  }, user.id);
  if (!access.canEdit) {
    return { ok: false, error: "Bu elanı dəyişmək üçün icazəniz yoxdur." };
  }

  if (existing.status === "deleted") {
    return { ok: false, error: "Silinmiş elan redaktə edilə bilməz. Əvvəlcə bərpa edin." };
  }

  const knownAttributeKeys = new Set(
    getAttributeDefinitions(
      taxonomy,
      parsed.data.categoryId,
      parsed.data.subcategoryId,
      categorySchemaSnapshot,
      parsed.data.attributes,
    ).map((definition) => definition.key),
  );
  const mergedAttributes = mergePreservedUnknownAttributes(
    parseExistingAttributes(existing.attributes),
    sanitizedAttributes,
    knownAttributeKeys,
  );

  const urls = imageUrls.map(sanitizeImageUrl).filter((url): url is string => url !== null);
  const maxPhotoCount = getResolvedPhotoLimit(
    taxonomy,
    parsed.data.categoryId,
    parsed.data.subcategoryId,
    categorySchemaSnapshot,
  );
  const countError = validateListingImageCount(urls.length, maxPhotoCount);
  if (countError) {
    return { ok: false, error: countError };
  }

  const basePayload = {
    title: parsed.data.title,
    price: parsed.data.price,
    category: taxonomyCheck.categoryName,
    category_id: parsed.data.categoryId,
    subcategory_id: parsed.data.subcategoryId,
    attributes: mergedAttributes,
    city: parsed.data.city,
    condition: parsed.data.condition,
    condition_code: parsed.data.condition === "Yeni" ? "new" : "good",
    listing_type: "sell",
    price_type: "fixed",
    delivery_type: parsed.data.deliveryAvailable ? "both" : "pickup",
    description: parsed.data.description,
    delivery_available: parsed.data.deliveryAvailable,
    image_url: urls[0] ?? null,
    image_urls: urls.length > 0 ? urls : null,
    ...schemaVersions,
  };

  let schemaVersionColumnsAvailable = true;
  let { data: updated, error } = await supabase
    .from("listings")
    .update(basePayload)
    .eq("id", listingId)
    .select("id, status")
    .maybeSingle();

  if (error?.message?.includes("form_schema_version") || error?.message?.includes("photo_schema_version")) {
    schemaVersionColumnsAvailable = false;
    const withoutSchemaVersions = {
      ...basePayload,
      form_schema_version: undefined,
      photo_schema_version: undefined,
    };
    const retry = await supabase
      .from("listings")
      .update(withoutSchemaVersions)
      .eq("id", listingId)
      .select("id, status")
      .maybeSingle();
    updated = retry.data;
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
    const retry = await supabase
      .from("listings")
      .update(withoutDelivery)
      .eq("id", listingId)
      .select("id, status")
      .maybeSingle();
    updated = retry.data;
    error = retry.error;
  }

  if (error?.message?.includes("attributes") || error?.message?.includes("category_id")) {
    const legacyPayload = {
      title: basePayload.title,
      price: basePayload.price,
      category: basePayload.category,
      city: basePayload.city,
      condition: basePayload.condition,
      description: basePayload.description,
      image_url: basePayload.image_url,
      image_urls: basePayload.image_urls,
    };
    const retry = await supabase
      .from("listings")
      .update(legacyPayload)
      .eq("id", listingId)
      .select("id, status")
      .maybeSingle();
    updated = retry.data;
    error = retry.error;
  }

  if (error?.message?.includes("image_urls")) {
    const retry = await supabase
      .from("listings")
      .update({
        ...basePayload,
        image_urls: undefined,
        ...(schemaVersionColumnsAvailable
          ? {}
          : { form_schema_version: undefined, photo_schema_version: undefined }),
      })
      .eq("id", listingId)
      .select("id, status")
      .maybeSingle();
    updated = retry.data;
    error = retry.error;
  }

  if (error) {
    return { ok: false, error: translateSupabaseError(error.message) };
  }
  if (!updated) {
    return { ok: false, error: "Elan dəyişdirilmədi. İcazənizi yoxlayın." };
  }

  if (parsed.data.contactPhone) {
    const { error: contactError } = await supabase.from("listing_contacts").upsert(
      {
        listing_id: listingId,
        contact_phone: parsed.data.contactPhone,
      },
      { onConflict: "listing_id" },
    );

    if (contactError) {
      return { ok: false, error: translateSupabaseError(contactError.message) };
    }
  }

  revalidatePath("/account/listings");
  revalidatePath("/elanlar");
  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath(`/account/listings/${listingId}/edit`);
  if (existing.slug) {
    revalidatePath(`/elanlar/${existing.slug}`);
  }

  return { ok: true, slug: (existing.slug as string | null) ?? null };
}
