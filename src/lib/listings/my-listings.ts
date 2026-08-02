import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getActiveStoreMembershipStoreIds } from "@/lib/listings/listing-management-access";
import type { ListingStatus } from "@/types/live-listing";

export type MyListing = {
  id: string;
  slug: string | null;
  title: string;
  price: number;
  category: string;
  city: string;
  status: ListingStatus;
  image_url: string | null;
  image_urls: string[] | null;
  rejected_reason: string | null;
  view_count: number;
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
  deleted_at: string | null;
  purge_after: string | null;
};

const MY_LISTING_SELECT =
  "id, slug, title, price, category, city, status, image_url, image_urls, rejected_reason, view_count, created_at, updated_at, expires_at, deleted_at, purge_after";

function mapMyListingRow(row: Record<string, unknown>): MyListing {
  return {
    id: row.id as string,
    slug: (row.slug as string | null) ?? null,
    title: row.title as string,
    price: Number(row.price),
    category: row.category as string,
    city: row.city as string,
    status: row.status as ListingStatus,
    image_url: (row.image_url as string | null) ?? null,
    image_urls: (row.image_urls as string[] | null) ?? null,
    rejected_reason: (row.rejected_reason as string | null) ?? null,
    view_count: Number(row.view_count ?? 0),
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    deleted_at: (row.deleted_at as string | null) ?? null,
    purge_after: (row.purge_after as string | null) ?? null,
  };
}

export async function getMyListings(userId: string): Promise<MyListing[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createClient();
    const storeIds = await getActiveStoreMembershipStoreIds(supabase, userId);
    let query = supabase
      .from("listings")
      .select(MY_LISTING_SELECT)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    query = storeIds.length > 0
      ? query.or(`user_id.eq.${userId},store_id.in.(${storeIds.join(",")})`)
      : query.eq("user_id", userId);

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((row) => mapMyListingRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
}
