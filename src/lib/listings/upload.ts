import { createClient } from "@/lib/supabase/client";

type UploadResult = { publicUrl: string | null; error: string | null };

export async function compressImageFile(
  file: File,
  maxWidth = 1200,
): Promise<{ blob: Blob; contentType: "image/jpeg"; ext: "jpg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas yaradılmadı");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Şəkil sıxılmadı"))),
      "image/jpeg",
      0.85,
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
): Promise<{ urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const { blob, contentType, ext } = await compressImageFile(files[i]);
      const upload = await uploadListingImage(userId, listingId, blob, i, contentType, ext);
      if (upload.publicUrl) {
        urls.push(upload.publicUrl);
      } else {
        errors.push(upload.error ?? `Şəkil ${i + 1} yüklənmədi`);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Şəkil ${i + 1} yüklənmədi`);
    }
  }

  return { urls, errors };
}
