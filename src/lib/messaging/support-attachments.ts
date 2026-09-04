import { createClient } from "@/lib/supabase/client";
import { compressImageFile, LISTING_IMAGE_ACCEPT } from "@/lib/listings/upload";
import { mapMessagingError } from "@/lib/messaging/errors";
import {
  buildSupportAttachmentReference,
  isSupportAttachmentPath,
  SUPPORT_ATTACHMENTS_BUCKET,
} from "@/lib/messaging/support-attachment-references";

export const SUPPORT_ATTACHMENT_ACCEPT = LISTING_IMAGE_ACCEPT;
export const SUPPORT_ATTACHMENT_MAX_FILES = 3;

export type SupportAttachmentUploadResult = {
  references: string[];
  paths: string[];
  errors: string[];
};

function createAttachmentUuid(): string {
  return globalThis.crypto.randomUUID();
}

export function buildSupportInitialMessage(input: {
  topicLabel: string;
  subject: string;
  details: string;
  attachmentReferences?: string[];
  uploadErrors?: string[];
}): string {
  const lines = [
    `Mövzu: ${input.topicLabel}`,
    `Başlıq: ${input.subject.trim()}`,
    "",
    "Detallar:",
    input.details.trim(),
  ];

  if (input.attachmentReferences?.length) {
    lines.push("", "Şəkillər:");
    input.attachmentReferences.forEach((reference, index) => {
      lines.push(`${index + 1}. ${reference}`);
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
): Promise<SupportAttachmentUploadResult> {
  const supabase = createClient();
  const references: string[] = [];
  const paths: string[] = [];
  const errors: string[] = [];
  const selected = files.slice(0, SUPPORT_ATTACHMENT_MAX_FILES);

  for (let index = 0; index < selected.length; index += 1) {
    const file = selected[index];
    try {
      const { blob, contentType, ext } = await compressImageFile(file, 1280);
      const token = createAttachmentUuid();
      const path = `${conversationId}/${userId}/${token}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(SUPPORT_ATTACHMENTS_BUCKET)
        .upload(path, blob, { contentType, upsert: false });

      if (uploadError) {
        errors.push(mapMessagingError(uploadError, "upload_attachment").message);
        continue;
      }

      const reference = buildSupportAttachmentReference(path);
      if (!reference) {
        await supabase.storage.from(SUPPORT_ATTACHMENTS_BUCKET).remove([path]);
        errors.push("Şəkil yüklənmədi. Yenidən cəhd edin.");
        continue;
      }

      references.push(reference);
      paths.push(path);
    } catch (error) {
      errors.push(mapMessagingError(error, "upload_attachment").message);
    }
  }

  return { references, paths, errors };
}

export async function removeSupportAttachments(paths: string[]): Promise<void> {
  const uniquePaths = [...new Set(paths.filter(isSupportAttachmentPath))];
  if (uniquePaths.length === 0) return;

  const supabase = createClient();
  await supabase.storage.from(SUPPORT_ATTACHMENTS_BUCKET).remove(uniquePaths);
}
