export const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";
export const SUPPORT_ATTACHMENT_REFERENCE_PREFIX = "support-attachment:";
export const SUPPORT_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 300;

const UUID_PATTERN =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const SUPPORT_ATTACHMENT_PATH_PATTERN = new RegExp(
  `^${UUID_PATTERN}/${UUID_PATTERN}/${UUID_PATTERN}\\.(?:jpg|jpeg|png|webp)$`,
);
const SUPPORT_ATTACHMENT_REFERENCE_PATTERN = new RegExp(
  `${SUPPORT_ATTACHMENT_REFERENCE_PREFIX}(${UUID_PATTERN}/${UUID_PATTERN}/${UUID_PATTERN}\\.(?:jpg|jpeg|png|webp))`,
  "g",
);

export function isSupportAttachmentPath(path: string): boolean {
  return SUPPORT_ATTACHMENT_PATH_PATTERN.test(path);
}

export function buildSupportAttachmentReference(path: string): string | null {
  return isSupportAttachmentPath(path)
    ? `${SUPPORT_ATTACHMENT_REFERENCE_PREFIX}${path}`
    : null;
}

export function supportAttachmentReferenceToPath(reference: string): string | null {
  if (!reference.startsWith(SUPPORT_ATTACHMENT_REFERENCE_PREFIX)) return null;
  const path = reference.slice(SUPPORT_ATTACHMENT_REFERENCE_PREFIX.length);
  return isSupportAttachmentPath(path) ? path : null;
}

export function extractSupportAttachmentReferences(body: string): string[] {
  return [...new Set(Array.from(body.matchAll(SUPPORT_ATTACHMENT_REFERENCE_PATTERN), (match) => match[0]))];
}

export function stripSupportAttachmentReferences(body: string): string {
  return body
    .replace(SUPPORT_ATTACHMENT_REFERENCE_PATTERN, "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:\d+\.|Logo:|Örtük şəkli:)\s*$/.test(line))
    .join("\n")
    .trim();
}
