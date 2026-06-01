"use server";

import { revalidatePath } from "next/cache";

import { dbCategoryToSlug } from "@/lib/listings/category-map";
import { getAdminListingById } from "@/lib/listings/admin-listings";
import { requireAdmin } from "@/lib/supabase/admin-session";
import { createClient } from "@/lib/supabase/server";
import type { ListingStatus } from "@/types/live-listing";

type ActionResult = { ok: true } | { ok: false; error: string };

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
  revalidatePath("/listings");
  revalidatePath("/");

  if (listing?.slug) {
    revalidatePath(`/listings/${listing.slug}`);
    revalidatePath(`/categories/${dbCategoryToSlug(listing.category)}`);
  }

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
