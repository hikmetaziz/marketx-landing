import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getDbCategoriesForSlug } from "@/lib/listings/category-map";
import {
  formatListingDate,
  formatListingPrice,
  formatListingRelativeDate,
} from "@/lib/listings/format";
import {
  getListingImages,
  getPrimaryListingImage,
} from "@/lib/listings/listing-images";
import type { ListingRow, LiveListing, LiveListingDetailView, ListingStatus, PublicListingStatus } from "@/types/live-listing";

export { formatListingDate, formatListingPrice, formatListingRelativeDate };
export { getListingImages, getPrimaryListingImage };

/** @deprecated Use getPrimaryListingImage */
export function getListingPrimaryImage(listing: LiveListing): string | null {
  return getPrimaryListingImage(listing);
}

/** @deprecated Use getListingImages */
export function getListingGalleryImages(listing: LiveListing): string[] {
  return getListingImages(listing);
}

const PUBLIC_STATUSES: PublicListingStatus[] = ["active", "sold"];

const LISTING_SELECT =
  "id, user_id, slug, title, description, price, category, city, condition, status, image_url, image_urls, delivery_available, view_count, created_at, updated_at";

const LISTING_SEO_SELECT = "slug, title, description, price, status, image_url, image_urls";

export type ListingSeoRecord = {
  slug: string;
  title: string;
  description: string | null;
  price: number;
  status: ListingStatus;
  image_url: string | null;
  image_urls: string[] | null;
};

function mapSeoRow(row: ListingRow): ListingSeoRecord | null {
  if (!row.slug) {
    return null;
  }

  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    status: row.status as ListingStatus,
    image_url: row.image_url,
    image_urls: row.image_urls,
  };
}

function isPublicStatus(status: string): status is PublicListingStatus {
  return status === "active" || status === "sold";
}

function mapRow(row: ListingRow): LiveListing | null {
  if (!row.slug || !isPublicStatus(row.status)) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    category: row.category,
    city: row.city,
    condition: row.condition,
    status: row.status,
    image_url: row.image_url,
    image_urls: row.image_urls,
    delivery_available: row.delivery_available,
    view_count: Number(row.view_count ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    return await createClient();
  } catch {
    return null;
  }
}

export const listingHasContactPhone = cache(async (listingId: string): Promise<boolean> => {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc("listing_has_contact_phone", {
    p_listing_id: listingId,
  });

  if (error) {
    return false;
  }

  return Boolean(data);
});

export async function toListingDetailView(listing: LiveListing): Promise<{
  listing: LiveListingDetailView;
  hasContactPhone: boolean;
}> {
  const hasContactPhone = await listingHasContactPhone(listing.id);
  return {
    listing,
    hasContactPhone,
  };
}

export async function getActiveListings(limit?: number): Promise<LiveListing[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .in("status", PUBLIC_STATUSES)
    .not("slug", "is", null)
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as ListingRow[]).map(mapRow).filter((row): row is LiveListing => row !== null);
}

export const getListingBySlug = cache(async (slug: string): Promise<LiveListing | null> => {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("slug", slug)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRow(data as ListingRow);
});

export const getListingForSeo = cache(async (slug: string): Promise<ListingSeoRecord | null> => {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SEO_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapSeoRow(data as ListingRow);
});

export async function getListingsByCategorySlug(
  categorySlug: string,
  limit?: number,
): Promise<LiveListing[]> {
  const dbCategories = getDbCategoriesForSlug(categorySlug);
  if (dbCategories.length === 0) {
    return [];
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .in("status", PUBLIC_STATUSES)
    .in("category", dbCategories)
    .not("slug", "is", null)
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as ListingRow[]).map(mapRow).filter((row): row is LiveListing => row !== null);
}

export async function getSimilarListings(
  category: string,
  excludeListingId: string,
  excludeSlug: string,
  limit = 4,
): Promise<LiveListing[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .in("status", PUBLIC_STATUSES)
    .eq("category", category)
    .neq("slug", excludeSlug)
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (excludeListingId) {
    query = query.neq("id", excludeListingId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as ListingRow[]).map(mapRow).filter((row): row is LiveListing => row !== null);
}

/** @deprecated Use getSimilarListings */
export async function getSimilarActiveListings(
  category: string,
  excludeSlug: string,
  limit = 4,
): Promise<LiveListing[]> {
  return getSimilarListings(category, "", excludeSlug, limit);
}

export async function getPublicListingSlugs(): Promise<Array<{ slug: string; updated_at: string | null }>> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("listings")
    .select("slug, updated_at")
    .in("status", PUBLIC_STATUSES)
    .not("slug", "is", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data
    .filter((row): row is { slug: string; updated_at: string | null } => Boolean(row.slug))
    .map((row) => ({ slug: row.slug, updated_at: row.updated_at }));
}
