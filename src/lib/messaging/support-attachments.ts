import { createClient } from "@/lib/supabase/client";
import { compressImageFile, LISTING_IMAGE_ACCEPT } from "@/lib/listings/upload";
import { mapMessagingError } from "@/lib/messaging/errors";

export const SUPPORT_ATTACHMENT_ACCEPT = LISTING_IMAGE_ACCEPT;
export const SUPPORT_ATTACHMENT_MAX_FILES = 3;

export function buildSupportInitialMessage(input: {
  topicLabel: string;
  subject: string;
  details: string;
  attachmentUrls?: string[];
  uploadErrors?: string[];
}): string {
  const lines = [
    `Mövzu: ${input.topicLabel}`,
    `Başlıq: ${input.subject.trim()}`,
    "",
    "Detallar:",
    input.details.trim(),
  ];

  if (input.attachmentUrls?.length) {
    lines.push("", "Şəkillər:");
    input.attachmentUrls.forEach((url, index) => {
      lines.push(`${index + 1}. ${url}`);
    });
  }

  if (input.uploadErrors?.length) {
    lines.push("", `Qeyd: ${input.uploadErrors.length} şəkil yüklənmədi.`);
  }

  return lines.join("\n");
}

export async function uploadSupportAttachments(
  userId: string,
  conversationId: string,
  files: File[],
): Promise<{ urls: string[]; errors: string[] }> {
  const supabase = createClient();
  const urls: string[] = [];
  const errors: string[] = [];
  const selected = files.slice(0, SUPPORT_ATTACHMENT_MAX_FILES);

  for (let index = 0; index < selected.length; index += 1) {
    const file = selected[index];
    try {
      const { blob, contentType, ext } = await compressImageFile(file, 1280);
      const token = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${index}`;
      const path = `${userId}/support/${conversationId}/${token}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, blob, { contentType, upsert: false });

      if (uploadError) {
        errors.push(mapMessagingError(uploadError, "upload_attachment").message);
        continue;
      }

      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    } catch (error) {
      errors.push(mapMessagingError(error, "upload_attachment").message);
    }
  }

  return { urls, errors };
}
