import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeImageUrl } from "@/lib/images/validate-image-url";
import { getListingImages, type ListingImageSource } from "@/lib/listings/listing-images";

const LISTING_IMAGES_BUCKET = "listing-images";

/** Public URL-dən storage object path-i çıxarır: `{userId}/{file}.jpg` */
export function listingImageStoragePathFromUrl(url: string): string | null {
  const sanitized = sanitizeImageUrl(url);
  if (!sanitized) {
    return null;
  }

  try {
    const parsed = new URL(sanitized);
    const marker = `/${LISTING_IMAGES_BUCKET}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) {
      return null;
    }

    const path = decodeURIComponent(parsed.pathname.slice(idx + marker.length));
    return path.length > 0 ? path : null;
  } catch {
    return null;
  }
}

function collectStoragePathsFromListing(
  listing: ListingImageSource & { user_id: string; id: string },
): Set<string> {
  const paths = new Set<string>();

  for (const url of getListingImages(listing)) {
    const path = listingImageStoragePathFromUrl(url);
    if (path) {
      paths.add(path);
    }
  }

  return paths;
}

async function collectStoragePathsFromFolder(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
): Promise<string[]> {
  const { data: files, error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).list(userId, {
    limit: 100,
  });

  if (error || !files) {
    return [];
  }

  return files
    .filter((file) => file.name.startsWith(listingId))
    .map((file) => `${userId}/${file.name}`);
}

export async function deleteListingRelatedReports(
  supabase: SupabaseClient,
  listingId: string,
): Promise<void> {
  const { error } = await supabase.from("reports").delete().eq("listing_id", listingId);

  if (!error) {
    return;
  }

  const message = error.message.toLowerCase();
  const missingTable =
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("reports") && message.includes("does not exist"));

  if (!missingTable) {
    throw new Error(error.message);
  }
}

export async function deleteListingStorageImages(
  supabase: SupabaseClient,
  listing: ListingImageSource & { user_id: string; id: string },
): Promise<void> {
  const paths = collectStoragePathsFromListing(listing);

  for (const path of await collectStoragePathsFromFolder(supabase, listing.user_id, listing.id)) {
    paths.add(path);
  }

  if (paths.size === 0) {
    return;
  }

  const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([...paths]);

  if (error) {
    throw new Error(error.message);
  }
}
