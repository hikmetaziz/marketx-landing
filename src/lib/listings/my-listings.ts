import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
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
};

const MY_LISTING_SELECT =
  "id, slug, title, price, category, city, status, image_url, image_urls, rejected_reason, view_count, created_at, updated_at, expires_at";

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
  };
}

export async function getMyListings(userId: string): Promise<MyListing[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("listings")
      .select(MY_LISTING_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => mapMyListingRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
}
