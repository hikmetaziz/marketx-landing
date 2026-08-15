import { createClient } from "@/lib/supabase/client";

type UploadResult = { publicUrl: string | null; error: string | null };

export const LISTING_IMAGE_MAX_WIDTH = 1600;
export const LISTING_IMAGE_QUALITY = 0.84;
export const SUPPORTED_LISTING_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const LISTING_IMAGE_ACCEPT = SUPPORTED_LISTING_IMAGE_TYPES.join(",");

type SupportedListingImageType = (typeof SUPPORTED_LISTING_IMAGE_TYPES)[number];

export type ListingImageUploadStage = "compressing" | "uploading" | "uploaded" | "error";

export type ListingImageUploadProgress = {
  index: number;
  fileName: string;
  stage: ListingImageUploadStage;
  completed: number;
  total: number;
  percent: number;
  originalBytes?: number;
  compressedBytes?: number;
  error?: string;
};

export type ListingImageUploadProgressHandler = (progress: ListingImageUploadProgress) => void;

function getSupportedListingImageType(file: File): SupportedListingImageType | null {
  if (SUPPORTED_LISTING_IMAGE_TYPES.includes(file.type as SupportedListingImageType)) {
    return file.type as SupportedListingImageType;
  }

  if (file.type) {
    return null;
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";

  return null;
}

export function isSupportedListingImageFile(file: File): boolean {
  return getSupportedListingImageType(file) !== null;
}

export async function compressImageFile(
  file: File,
  maxWidth = LISTING_IMAGE_MAX_WIDTH,
): Promise<{ blob: Blob; contentType: "image/jpeg"; ext: "jpg" }> {
  if (!getSupportedListingImageType(file)) {
    throw new Error("Dəstəklənməyən şəkil formatı. JPG, PNG və ya WebP seçin.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas yaradılmadı");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Şəkil sıxılmadı"))),
      "image/jpeg",
      LISTING_IMAGE_QUALITY,
    );
  });

  return { blob, contentType: "image/jpeg", ext: "jpg" };
}

export async function uploadListingImage(
  userId: string,
  listingId: string,
  fileBody: Blob,
  index: number,
  contentType: "image/jpeg" | "image/webp" = "image/jpeg",
  ext: "jpg" | "webp" = "jpg",
): Promise<UploadResult> {
  const supabase = createClient();
  const suffix = index === 0 ? "" : `-${index}`;
  const path = `${userId}/${listingId}${suffix}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("listing-images")
    .upload(path, fileBody, { contentType, upsert: true });

  if (uploadError) {
    return { publicUrl: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return { publicUrl: data.publicUrl, error: null };
}

export async function uploadListingImages(
  userId: string,
  listingId: string,
  files: File[],
  startIndex = 0,
  onProgress?: ListingImageUploadProgressHandler,
): Promise<{ urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];
  const total = files.length;

  const notify = (
    index: number,
    stage: ListingImageUploadStage,
    completed: number,
    extra?: Pick<ListingImageUploadProgress, "originalBytes" | "compressedBytes" | "error">,
  ) => {
    onProgress?.({
      index,
      fileName: files[index]?.name ?? `Şəkil ${index + 1}`,
      stage,
      completed,
      total,
      percent: total === 0 ? 100 : Math.round((completed / total) * 100),
      ...extra,
    });
  };

  for (let i = 0; i < files.length; i++) {
    try {
      notify(i, "compressing", i, { originalBytes: files[i].size });
      const { blob, contentType, ext } = await compressImageFile(files[i]);
      notify(i, "uploading", i, { originalBytes: files[i].size, compressedBytes: blob.size });
      const upload = await uploadListingImage(userId, listingId, blob, startIndex + i, contentType, ext);
      if (upload.publicUrl) {
        urls.push(upload.publicUrl);
        notify(i, "uploaded", i + 1, { originalBytes: files[i].size, compressedBytes: blob.size });
      } else {
        const error = upload.error ?? `Şəkil ${i + 1} yüklənmədi`;
        errors.push(error);
        notify(i, "error", i + 1, { originalBytes: files[i].size, compressedBytes: blob.size, error });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : `Şəkil ${i + 1} yüklənmədi`;
      errors.push(error);
      notify(i, "error", i + 1, { originalBytes: files[i].size, error });
    }
  }

  return { urls, errors };
}
