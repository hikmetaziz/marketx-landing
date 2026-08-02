import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getListingManagementAccess } from "@/lib/listings/listing-management-access";
import type { ListingAttributeValues } from "@/lib/taxonomy/listing-taxonomy-types";
import type { ListingStatus } from "@/types/live-listing";

export type EditableListing = {
  id: string;
  slug: string | null;
  title: string;
  price: number;
  category_id: string | null;
  subcategory_id: string | null;
  attributes: ListingAttributeValues;
  city: string;
  condition: string | null;
  description: string | null;
  delivery_available: boolean | null;
  contact_phone: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  status: ListingStatus;
};

const EDIT_SELECT =
  "id, slug, title, price, category_id, subcategory_id, attributes, city, condition, description, delivery_available, image_url, image_urls, status, user_id, store_id";

function parseAttributes(raw: unknown): ListingAttributeValues {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const result: ListingAttributeValues = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      (Array.isArray(value) && value.every((item) => typeof item === "string"))
    ) {
      result[key] = value as ListingAttributeValues[string];
    }
  }
  return result;
}

export async function getMyListingForEdit(
  listingId: string,
  userId: string,
): Promise<EditableListing | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data: listing, error } = await supabase
      .from("listings")
      .select(EDIT_SELECT)
      .eq("id", listingId)
      .maybeSingle();

    if (error || !listing) {
      return null;
    }

    const access = await getListingManagementAccess(supabase, {
      user_id: (listing.user_id as string | null) ?? null,
      store_id: (listing.store_id as string | null) ?? null,
    }, userId);
    if (!access.canEdit) {
      return null;
    }

    if (listing.status === "deleted") {
      return null;
    }

    const { data: contact } = await supabase
      .from("listing_contacts")
      .select("contact_phone")
      .eq("listing_id", listingId)
      .maybeSingle();

    return {
      id: listing.id as string,
      slug: (listing.slug as string | null) ?? null,
      title: listing.title as string,
      price: Number(listing.price),
      category_id: (listing.category_id as string | null) ?? null,
      subcategory_id: (listing.subcategory_id as string | null) ?? null,
      attributes: parseAttributes(listing.attributes),
      city: listing.city as string,
      condition: (listing.condition as string | null) ?? null,
      description: (listing.description as string | null) ?? null,
      delivery_available: (listing.delivery_available as boolean | null) ?? null,
      contact_phone: (contact?.contact_phone as string | null) ?? null,
      image_url: (listing.image_url as string | null) ?? null,
      image_urls: (listing.image_urls as string[] | null) ?? null,
      status: listing.status as ListingStatus,
    };
  } catch {
    return null;
  }
}
