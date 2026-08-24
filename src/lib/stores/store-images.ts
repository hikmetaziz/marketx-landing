import {
  compressImageFile,
  isSupportedListingImageFile,
  LISTING_IMAGE_ACCEPT,
} from "@/lib/listings/upload";
import { createClient } from "@/lib/supabase/client";

export const STORE_IMAGE_ACCEPT = LISTING_IMAGE_ACCEPT;
export const STORE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export type StoreImageKind = "logo" | "cover";

function validateStoreImage(file: File): void {
  if (!isSupportedListingImageFile(file)) {
    throw new Error("Dəstəklənməyən şəkil formatıdır. JPG, PNG və ya WebP seçin.");
  }

  if (file.size <= 0 || file.size > STORE_IMAGE_MAX_BYTES) {
    throw new Error("Şəkil 10 MB-dan böyük olmamalıdır.");
  }
}

export async function uploadStoreImage(
  storeId: string,
  kind: StoreImageKind,
  file: File,
): Promise<{ publicUrl: string; path: string }> {
  validateStoreImage(file);

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Şəkil yükləmək üçün yenidən daxil olun.");
  }

  const maxWidth = kind === "logo" ? 800 : 1600;
  const { blob, contentType, ext } = await compressImageFile(file, maxWidth);
  const path = `${user.id}/stores/${storeId}/${kind}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("listing-images")
    .upload(path, blob, { contentType, upsert: false });

  if (uploadError) {
    throw new Error("Şəkil yüklənmədi. Yenidən cəhd edin.");
  }

  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function removeUploadedStoreImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const supabase = createClient();
  await supabase.storage.from("listing-images").remove(paths);
}
