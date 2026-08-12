"use server";

import { revalidatePath } from "next/cache";

import { isCityValue } from "@/lib/constants/cities";
import { dbCategoryToSlug } from "@/lib/listings/category-map";
import { getAdminListingById } from "@/lib/listings/admin-listings";
import { requireAdmin } from "@/lib/supabase/admin-session";
import { createClient } from "@/lib/supabase/server";
import type { ListingStatus } from "@/types/live-listing";

type ActionResult = { ok: true } | { ok: false; error: string };

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 5000;
const PRICE_MIN = 1;
const PRICE_MAX = 9_999_999;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type PendingListingUpdateInput = {
  title: string;
  price: number | string;
  city: string;
  condition: string;
  description: string;
};

async function notifyListingWebPush(
  supabase: SupabaseServerClient,
  listingId: string,
  status: ListingStatus,
): Promise<void> {
  const event =
    status === "active"
      ? "listing_approved"
      : status === "rejected"
        ? "listing_rejected"
        : null;

  if (!event) {
    return;
  }

  try {
    const { error } = await supabase.functions.invoke("send-web-push", {
      body: {
        event,
        listing_id: listingId,
      },
    });

    if (error) {
      console.warn("Listing web push failed", {
        listingId,
        event,
        message: error.message,
      });
    }
  } catch (pushError) {
    console.warn("Listing web push failed", {
      listingId,
      event,
      error: pushError,
    });
  }
}

async function updateListingStatus(
  listingId: string,
  status: ListingStatus,
  extra: Record<string, unknown> = {},
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      ...extra,
    })
    .eq("id", listingId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const listing = await getAdminListingById(listingId);

  revalidatePath("/admin/listings");
  revalidatePath("/elanlar");
  revalidatePath("/");

  if (listing?.slug) {
    revalidatePath(`/elanlar/${listing.slug}`);
    revalidatePath(`/categories/${dbCategoryToSlug(listing.category)}`);
  }

  await notifyListingWebPush(supabase, listingId, status);

  return { ok: true };
}

export async function approveListing(listingId: string): Promise<ActionResult> {
  return updateListingStatus(listingId, "active", { rejected_reason: null });
}

export async function rejectListing(listingId: string, reason: string): Promise<ActionResult> {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { ok: false, error: "Rədd səbəbi daxil edin." };
  }

  return updateListingStatus(listingId, "rejected", { rejected_reason: trimmed });
}

export async function markListingSold(listingId: string): Promise<ActionResult> {
  return updateListingStatus(listingId, "sold");
}

export async function archiveListing(listingId: string): Promise<ActionResult> {
  return updateListingStatus(listingId, "archived");
}

export async function updatePendingListing(
  listingId: string,
  input: PendingListingUpdateInput,
): Promise<ActionResult> {
  await requireAdmin();

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length < TITLE_MIN) {
    return { ok: false, error: `Başlıq ən azı ${TITLE_MIN} simvol olmalıdır.` };
  }
  if (title.length > TITLE_MAX) {
    return { ok: false, error: `Başlıq maksimum ${TITLE_MAX} simvol ola bilər.` };
  }

  const price = typeof input.price === "number" ? input.price : Number(input.price);
  if (!Number.isFinite(price) || price < PRICE_MIN || price > PRICE_MAX) {
    return { ok: false, error: "Qiymət düzgün rəqəm olmalıdır." };
  }

  const city = typeof input.city === "string" ? input.city.trim() : "";
  if (!isCityValue(city)) {
    return { ok: false, error: "Şəhər seçimi düzgün deyil." };
  }

  const condition = input.condition === "Yeni" ? "Yeni" : "İşlənmiş";
  const descriptionRaw = typeof input.description === "string" ? input.description.trim() : "";
  const description = descriptionRaw.length > 0 ? descriptionRaw.slice(0, DESCRIPTION_MAX) : null;

  const supabase = await createClient();
  const { data: listing, error: readError } = await supabase
    .from("listings")
    .select("id, status, slug, category")
    .eq("id", listingId)
    .maybeSingle();

  if (readError || !listing) {
    return { ok: false, error: "Elan tapılmadı." };
  }

  if (listing.status !== "pending") {
    return { ok: false, error: "Yalnız pending statuslu elan redaktə edilə bilər." };
  }

  const { error } = await supabase
    .from("listings")
    .update({
      title,
      price: Math.round(price),
      city,
      condition,
      condition_code: condition === "Yeni" ? "new" : "good",
      description,
      rejected_reason: null,
      reviewed_at: null,
      reviewed_by: null,
    })
    .eq("id", listingId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath("/elanlar");

  if (typeof listing.slug === "string" && listing.slug) {
    revalidatePath(`/elanlar/${listing.slug}`);
  }
  if (typeof listing.category === "string" && listing.category) {
    revalidatePath(`/categories/${dbCategoryToSlug(listing.category)}`);
  }

  return { ok: true };
}
