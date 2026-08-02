import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { applyCategoryFilterToQuery, resolveCategoryFilter } from "@/lib/taxonomy/category-filter";
import {
  filterListingsWithReachableImages,
  listingHasReachableImage,
} from "@/lib/listings/image-reachability";
import {
  formatListingDate,
  formatListingPrice,
  formatListingRelativeDate,
} from "@/lib/listings/format";
import {
  getListingImages,
  getPrimaryListingImage,
  listingHasImages,
} from "@/lib/listings/listing-images";
import { DEFAULT_LISTING_LIMIT, type ListingSearchFilters } from "@/lib/listings/search";
import { getSubcategoryBySlug } from "@/lib/taxonomy/fetch-subcategories";
import { isSyntheticCanonicalSubcategoryId } from "@/lib/taxonomy/marktx-taxonomy";
import { listingLookupField } from "@/lib/listings/listing-url";
import type { ListingAttributeValues } from "@/lib/taxonomy/listing-taxonomy-types";
import type { ListingRow, LiveListing, LiveListingDetailView, ListingStatus, PublicListingStatus } from "@/types/live-listing";

export { formatListingDate, formatListingPrice, formatListingRelativeDate };
export { getListingImages, getPrimaryListingImage, listingHasImages };

/** @deprecated Use getPrimaryListingImage */
export function getListingPrimaryImage(listing: LiveListing): string | null {
  return getPrimaryListingImage(listing);
}

/** @deprecated Use getListingImages */
export function getListingGalleryImages(listing: LiveListing): string[] {
  return getListingImages(listing);
}

const PUBLIC_STATUSES: PublicListingStatus[] = ["active", "sold"];

type ListingPaginationOptions = {
  page?: number;
  limit?: number;
};

export type PaginatedListings = {
  listings: LiveListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function getPaginationRange(options: ListingPaginationOptions = {}) {
  const page = Math.max(1, Math.round(options.page ?? 1));
  const limit = Math.max(1, Math.round(options.limit ?? DEFAULT_LISTING_LIMIT));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return { page, limit, from, to };
}

function emptyPaginatedListings(options: ListingPaginationOptions = {}): PaginatedListings {
  const { page, limit } = getPaginationRange(options);
  return { listings: [], total: 0, page, limit, totalPages: 1 };
}

function createPaginatedListings(
  listings: LiveListing[],
  total: number,
  page: number,
  limit: number,
): PaginatedListings {
  return {
    listings,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

const LISTING_SELECT =
  "id, user_id, slug, title, description, price, category, city, condition, status, image_url, image_urls, delivery_available, view_count, created_at, updated_at, store_id";

const LISTING_DETAIL_EXTRA =
  "listing_number, category_id, subcategory_id, attributes, expires_at";

const LISTING_DETAIL_SELECT = `${LISTING_SELECT}, ${LISTING_DETAIL_EXTRA}`;

function parseListingAttributes(raw: unknown): ListingAttributeValues {
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
  if (!row.slug || !listingHasImages(row)) {
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
  if (!row.slug || !isPublicStatus(row.status) || !listingHasImages(row)) {
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
    listing_number:
      row.listing_number != null && row.listing_number !== undefined
        ? Number(row.listing_number)
        : null,
    category_id: row.category_id ?? null,
    subcategory_id: row.subcategory_id ?? null,
    attributes: parseListingAttributes(row.attributes),
    expires_at: row.expires_at ?? null,
    store_id: row.store_id ?? null,
  };
}

function mapPublicRows(data: ListingRow[]): LiveListing[] {
  return data.map(mapRow).filter((row): row is LiveListing => row !== null);
}

async function toPublicListings(data: ListingRow[] | null): Promise<LiveListing[]> {
  if (!data) {
    return [];
  }

  return filterListingsWithReachableImages(mapPublicRows(data));
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
  const supabase = await getSupabaseClient();
  const [hasContactPhone, storeRes] = await Promise.all([
    listingHasContactPhone(listing.id),
    listing.store_id && supabase
      ? supabase
          .from("public_store_profiles")
          .select("id, name, slug, logo_url, contact_phone, whatsapp_phone")
          .eq("id", listing.store_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const store = storeRes.data
    ? (storeRes.data as {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
        contact_phone: string | null;
        whatsapp_phone: string | null;
      })
    : null;

  return {
    listing: {
      ...listing,
      business_contact_phone: null,
      store,
    },
    hasContactPhone: listing.store_id
      ? Boolean(store?.contact_phone || store?.whatsapp_phone)
      : hasContactPhone,
  };
}

export async function getActiveListingsPage(
  options: ListingPaginationOptions = {},
): Promise<PaginatedListings> {
  const pagination = getPaginationRange(options);
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return emptyPaginatedListings(pagination);
  }

  const { data, error, count } = await supabase
    .from("listings")
    .select(LISTING_SELECT, { count: "exact" })
    .in("status", PUBLIC_STATUSES)
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error || !data) {
    return emptyPaginatedListings(pagination);
  }

  const listings = await toPublicListings(data as ListingRow[]);
  return createPaginatedListings(listings, count ?? listings.length, pagination.page, pagination.limit);
}

export async function getActiveListings(limit?: number): Promise<LiveListing[]> {
  const page = await getActiveListingsPage({ page: 1, limit: limit ?? DEFAULT_LISTING_LIMIT });
  return page.listings;
}

export async function getFavoriteListings(userId: string): Promise<LiveListing[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data: favorites, error: favoritesError } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId);

  if (favoritesError || !favorites?.length) {
    return [];
  }

  const listingIds = favorites.map((favorite) => favorite.listing_id);
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .in("id", listingIds)
    .in("status", PUBLIC_STATUSES)
    .not("slug", "is", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return toPublicListings(data as ListingRow[]);
}

export async function searchListingsPage(filters: ListingSearchFilters): Promise<PaginatedListings> {
  const pagination = getPaginationRange({ page: filters.page, limit: filters.limit });
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return emptyPaginatedListings(pagination);
  }

  let query = supabase
    .from("listings")
    .select(LISTING_SELECT, { count: "exact" })
    .in("status", PUBLIC_STATUSES)
    .not("slug", "is", null);

  if (filters.q.length >= 2) {
    const pattern = `%${filters.q}%`;
    query = query.or(
      `title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern},city.ilike.${pattern}`,
    );
  }

  if (filters.category) {
    const categoryFilter = await resolveCategoryFilter(filters.category);
    if (!categoryFilter) {
      return emptyPaginatedListings(pagination);
    }
    query = applyCategoryFilterToQuery(query, categoryFilter);

    if (filters.subcategory) {
      const subcategory = await getSubcategoryBySlug(filters.category, filters.subcategory);
      if (!subcategory || isSyntheticCanonicalSubcategoryId(subcategory.id)) {
        return emptyPaginatedListings(pagination);
      }
      query = query.eq("subcategory_id", subcategory.id);
    }
  }

  if (filters.city) {
    query = query.eq("city", filters.city);
  }

  if (filters.condition) {
    query = query.eq("condition", filters.condition);
  }

  if (filters.minPrice !== null) {
    query = query.gte("price", filters.minPrice);
  }

  if (filters.maxPrice !== null) {
    query = query.lte("price", filters.maxPrice);
  }

  if (filters.sort === "price_asc") {
    query = query.order("price", { ascending: true }).order("created_at", { ascending: false });
  } else if (filters.sort === "price_desc") {
    query = query.order("price", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(pagination.from, pagination.to);

  if (error || !data) {
    return emptyPaginatedListings(pagination);
  }

  const listings = await toPublicListings(data as ListingRow[]);
  return createPaginatedListings(listings, count ?? listings.length, pagination.page, pagination.limit);
}

export async function searchListings(
  filters: ListingSearchFilters,
  limit?: number,
): Promise<LiveListing[]> {
  const page = await searchListingsPage({
    ...filters,
    page: 1,
    limit: limit ?? filters.limit,
  });
  return page.listings;
}

export const getListingByIdOrSlug = cache(async (idOrSlug: string): Promise<LiveListing | null> => {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const lookupField = listingLookupField(idOrSlug);

  let { data, error } = await supabase
    .from("listings")
    .select(LISTING_DETAIL_SELECT)
    .eq(lookupField, idOrSlug)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle();

  if (error) {
    ({ data, error } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq(lookupField, idOrSlug)
      .in("status", PUBLIC_STATUSES)
      .maybeSingle());
  }

  if (error || !data) {
    return null;
  }

  const listing = mapRow(data as ListingRow);
  if (!listing) {
    return null;
  }

  if (!(await listingHasReachableImage(listing))) {
    return null;
  }

  return listing;
});

export const getListingBySlug = cache(async (slug: string): Promise<LiveListing | null> => {
  return getListingByIdOrSlug(slug);
});

export const getListingForSeoByIdOrSlug = cache(async (idOrSlug: string): Promise<ListingSeoRecord | null> => {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const lookupField = listingLookupField(idOrSlug);
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SEO_SELECT)
    .eq(lookupField, idOrSlug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const seo = mapSeoRow(data as ListingRow);
  if (!seo || !(await listingHasReachableImage(seo))) {
    return null;
  }

  return seo;
});

export const getListingForSeo = cache(async (slug: string): Promise<ListingSeoRecord | null> => {
  return getListingForSeoByIdOrSlug(slug);
});

export async function getListingsByCategorySlug(
  categorySlug: string,
  options?: { limit?: number; subcategoryId?: string; subcategorySlug?: string },
): Promise<LiveListing[]> {
  const categoryFilter = await resolveCategoryFilter(categorySlug);
  if (!categoryFilter) {
    return [];
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return [];
  }

  let query = applyCategoryFilterToQuery(
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .in("status", PUBLIC_STATUSES)
      .not("slug", "is", null),
    categoryFilter,
  );

  let subcategoryId = options?.subcategoryId ?? "";
  if (!subcategoryId && options?.subcategorySlug) {
    const subcategory = await getSubcategoryBySlug(categorySlug, options.subcategorySlug);
    subcategoryId = subcategory?.id ?? "";
  }

  if (subcategoryId) {
    if (isSyntheticCanonicalSubcategoryId(subcategoryId)) {
      return [];
    }
    query = query.eq("subcategory_id", subcategoryId);
  }

  query = query.order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return toPublicListings(data as ListingRow[]);
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

  return toPublicListings(data as ListingRow[]);
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
    .select("slug, updated_at, image_url, image_urls")
    .in("status", PUBLIC_STATUSES)
    .not("slug", "is", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rows = data.filter(
    (row): row is { slug: string; updated_at: string | null; image_url: string | null; image_urls: string[] | null } =>
      Boolean(row.slug) && listingHasImages(row),
  );

  const visible = await filterListingsWithReachableImages(rows);
  return visible.map((row) => ({ slug: row.slug, updated_at: row.updated_at }));
}
