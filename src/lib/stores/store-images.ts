import {
  isSupportedListingImageFile,
  LISTING_IMAGE_ACCEPT,
} from "@/lib/listings/upload";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseUrl } from "@/lib/supabase/env";

export const STORE_IMAGE_ACCEPT = LISTING_IMAGE_ACCEPT;
export const STORE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export type StoreImageKind = "logo" | "cover";

const STORE_IMAGE_REQUIREMENTS: Record<
  StoreImageKind,
  { width: number; height: number; label: string }
> = {
  logo: {
    width: 500,
    height: 500,
    label: "Logo 500×500 px olmalıdır.",
  },
  cover: {
    width: 1600,
    height: 320,
    label: "Örtük 1600×320 px olmalıdır.",
  },
};

export function validateStoreImageSource(file: File): void {
  if (!isSupportedListingImageFile(file)) {
    throw new Error("Dəstəklənməyən şəkil formatıdır. JPG, PNG və ya WebP seçin.");
  }

  if (file.size <= 0 || file.size > STORE_IMAGE_MAX_BYTES) {
    throw new Error("Şəkil 10 MB-dan böyük olmamalıdır.");
  }
}

export async function validateStoreImage(
  kind: StoreImageKind,
  file: File,
): Promise<void> {
  validateStoreImageSource(file);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Şəkil oxunmadı. Başqa fayl seçin.");
  }

  try {
    const requirement = STORE_IMAGE_REQUIREMENTS[kind];
    if (
      bitmap.width !== requirement.width ||
      bitmap.height !== requirement.height
    ) {
      throw new Error(requirement.label);
    }
  } finally {
    bitmap.close();
  }
}

export function getManagedStoreImagePath(
  value: string | null,
  userId: string,
  storeId: string,
  kind: StoreImageKind,
): string | null {
  if (!value) return null;

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  try {
    const parsed = new URL(value);
    const expectedOrigin = new URL(supabaseUrl).origin;
    const storagePrefix = "/storage/v1/object/public/listing-images/";
    const managedPrefix = `${userId}/stores/${storeId}/${kind}-`;

    if (
      parsed.origin !== expectedOrigin ||
      !parsed.pathname.startsWith(storagePrefix) ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    const path = decodeURIComponent(parsed.pathname.slice(storagePrefix.length));
    const fileName = path.slice(managedPrefix.length);

    if (
      !path.startsWith(managedPrefix) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/i.test(
        fileName,
      )
    ) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

export async function uploadStoreImage(
  storeId: string,
  kind: StoreImageKind,
  file: File,
): Promise<{ publicUrl: string; path: string; userId: string }> {
  await validateStoreImage(kind, file);

  if (file.type !== "image/jpeg") {
    throw new Error("Hazırlanmış mağaza şəkli JPG formatında olmalıdır.");
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Şəkil yükləmək üçün yenidən daxil olun.");
  }

  const path = `${user.id}/stores/${storeId}/${kind}-${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("listing-images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error("Şəkil yüklənmədi. Yenidən cəhd edin.");
  }

  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return { publicUrl: data.publicUrl, path, userId: user.id };
}

export async function removeUploadedStoreImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase.storage.from("listing-images").remove(paths);

  if (error) {
    throw new Error("Mağaza şəkli silinmədi.");
  }
}
