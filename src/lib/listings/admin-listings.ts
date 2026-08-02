import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ListingStatus } from "@/types/live-listing";

export type AdminListing = {
  id: string;
  user_id: string;
  slug: string | null;
  title: string;
  description: string | null;
  price: number;
  category: string;
  city: string;
  condition: string | null;
  status: ListingStatus;
  image_url: string | null;
  image_urls: string[] | null;
  contact_phone: string | null;
  delivery_available: boolean | null;
  rejected_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string | null;
};

const ADMIN_SELECT =
  "id, user_id, slug, title, description, price, category, city, condition, status, image_url, image_urls, delivery_available, rejected_reason, reviewed_at, reviewed_by, created_at, updated_at";

function mapAdminRow(row: Record<string, unknown>): AdminListing {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    slug: (row.slug as string | null) ?? null,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    price: Number(row.price),
    category: row.category as string,
    city: row.city as string,
    condition: (row.condition as string | null) ?? null,
    status: row.status as ListingStatus,
    image_url: (row.image_url as string | null) ?? null,
    image_urls: (row.image_urls as string[] | null) ?? null,
    contact_phone: null,
    delivery_available: (row.delivery_available as boolean | null) ?? null,
    rejected_reason: (row.rejected_reason as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

async function getAdminClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    return await createClient();
  } catch {
    return null;
  }
}

async function attachContactPhones(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminClient>>>,
  listings: AdminListing[],
): Promise<AdminListing[]> {
  if (listings.length === 0) {
    return listings;
  }

  const ids = listings.map((listing) => listing.id);
  const { data } = await supabase
    .from("listing_contacts")
    .select("listing_id, contact_phone")
    .in("listing_id", ids);

  const phoneByListingId = new Map(
    (data ?? []).map((row) => [row.listing_id as string, row.contact_phone as string]),
  );

  return listings.map((listing) => ({
    ...listing,
    contact_phone: phoneByListingId.get(listing.id) ?? null,
  }));
}

export async function getPendingListings(): Promise<AdminListing[]> {
  return getAdminListingsByStatus("pending");
}

export type AdminListingStatusFilter = ListingStatus | "all";

const ADMIN_STATUS_FILTERS: AdminListingStatusFilter[] = [
  "pending",
  "active",
  "sold",
  "rejected",
  "archived",
  "deleted",
  "all",
];

export function isAdminListingStatusFilter(value: string | undefined): value is AdminListingStatusFilter {
  return ADMIN_STATUS_FILTERS.includes(value as AdminListingStatusFilter);
}

export async function getAdminListingsByStatus(
  status: AdminListingStatusFilter = "pending",
): Promise<AdminListing[]> {
  const supabase = await getAdminClient();
  if (!supabase) {
    return [];
  }

  let query = supabase.from("listings").select(ADMIN_SELECT).order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return attachContactPhones(supabase, data.map((row) => mapAdminRow(row as Record<string, unknown>)));
}

export async function getAdminListingById(id: string): Promise<AdminListing | null> {
  const supabase = await getAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("listings").select(ADMIN_SELECT).eq("id", id).maybeSingle();

  if (error || !data) {
    return null;
  }

  const listing = mapAdminRow(data as Record<string, unknown>);
  const [withContact] = await attachContactPhones(supabase, [listing]);
  return withContact ?? null;
}
