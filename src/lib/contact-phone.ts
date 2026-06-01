export function normalizeContactPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("994")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length !== 9) return null;
  if (!/^[1-9]\d{8}$/.test(digits)) return null;

  return `+994${digits}`;
}

export function isValidContactPhone(raw: string): boolean {
  if (!raw.trim()) return true;
  return normalizeContactPhone(raw) !== null;
}

export const CONTACT_PHONE_MASK_PREVIEW = "+994 ** *** ** **";

/** Web display — formats AZ mobile numbers as +994 50 521 13 50. */
export function formatContactPhoneDisplay(raw: string): string {
  const normalized = normalizeContactPhone(raw);
  if (!normalized) {
    return raw.trim();
  }

  const local = normalized.slice(4);
  return `+994 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
}

export function getContactPhoneTelHref(raw: string): string {
  const normalized = normalizeContactPhone(raw);
  if (normalized) {
    return `tel:${normalized}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length > 0) {
    const e164 = digits.startsWith("994") ? `+${digits}` : `+${digits}`;
    return `tel:${e164}`;
  }

  return `tel:${raw.replace(/\s/g, "")}`;
}
