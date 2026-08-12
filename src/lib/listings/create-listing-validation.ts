import { MAX_LISTING_IMAGES } from "@/constants/listings";
import { isCityValue } from "@/lib/constants/cities";
import { isValidContactPhone, normalizeContactPhone } from "@/lib/contact-phone";
import { isUuid } from "@/lib/taxonomy/listing-taxonomy-utils";
import type { ListingAttributeValues } from "@/lib/taxonomy/listing-taxonomy-types";

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 5000;
const PRICE_MIN = 1;
const PRICE_MAX = 9_999_999;

export type CreateListingInput = {
  storeId: string | null;
  title: string;
  price: number;
  categoryId: string;
  subcategoryId: string | null;
  attributes: ListingAttributeValues;
  city: string;
  condition: "Yeni" | "İşlənmiş";
  description: string | null;
  contactPhone: string | null;
  deliveryAvailable: boolean;
};

export type ParsedCreateListingInput = CreateListingInput & {
  category: string;
  conditionCode: "new" | "good";
  sanitizedAttributes: Record<string, string | number | boolean | string[]>;
};

type ParseResult =
  | { ok: true; data: Omit<ParsedCreateListingInput, "category" | "conditionCode" | "sanitizedAttributes"> }
  | { ok: false; error: string };

type ParseCreateListingOptions = {
  requireStoreId?: boolean;
};

function isCityOption(value: string): boolean {
  return isCityValue(value);
}

function parseAttributes(raw: unknown): ListingAttributeValues {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const result: ListingAttributeValues = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      (Array.isArray(value) && value.every((item) => typeof item === "string"))
    ) {
      result[key] = value as ListingAttributeValues[string];
    }
  }
  return result;
}

export function parseCreateListingInput(
  raw: unknown,
  options: ParseCreateListingOptions = {},
): ParseResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Form məlumatları yanlışdır." };
  }

  const input = raw as Record<string, unknown>;
  const storeIdRaw = typeof input.storeId === "string" ? input.storeId.trim() : "";
  const storeId = storeIdRaw || null;

  if (options.requireStoreId && !storeId) {
    return {
      ok: false,
      error: "Elan yerləşdirmək üçün mağaza girişiniz admin tərəfindən aktivləşdirilməlidir.",
    };
  }
  if (storeId && !isUuid(storeId)) {
    return { ok: false, error: "Mağaza seçimi yanlışdır." };
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length < TITLE_MIN) {
    return { ok: false, error: `Başlıq ən azı ${TITLE_MIN} simvol olmalıdır.` };
  }
  if (title.length > TITLE_MAX) {
    return { ok: false, error: `Başlıq maksimum ${TITLE_MAX} simvol ola bilər.` };
  }

  const priceRaw = input.price;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
        ? Number(priceRaw)
        : NaN;

  if (!Number.isFinite(price) || price < PRICE_MIN || price > PRICE_MAX) {
    return { ok: false, error: "Qiymət düzgün rəqəm olmalıdır." };
  }

  const categoryId = typeof input.categoryId === "string" ? input.categoryId.trim() : "";
  if (!isUuid(categoryId)) {
    return { ok: false, error: "Kateqoriya seçin." };
  }

  const subcategoryRaw = typeof input.subcategoryId === "string" ? input.subcategoryId.trim() : "";
  const subcategoryId = subcategoryRaw ? subcategoryRaw : null;
  if (subcategoryId && !isUuid(subcategoryId)) {
    return { ok: false, error: "Alt kateqoriya seçimi yanlışdır." };
  }

  const city = typeof input.city === "string" ? input.city : "";
  if (!isCityOption(city)) {
    return { ok: false, error: "Şəhər seçin." };
  }

  const isNew = input.isNew === true;
  const condition = isNew ? "Yeni" : "İşlənmiş";

  const descriptionRaw = typeof input.description === "string" ? input.description.trim() : "";
  const description = descriptionRaw.length > 0 ? descriptionRaw.slice(0, DESCRIPTION_MAX) : null;

  const contactPhoneRaw = typeof input.contactPhone === "string" ? input.contactPhone : "";
  if (!isValidContactPhone(contactPhoneRaw)) {
    return { ok: false, error: "Telefon düzgün deyil. Nümunə: 050 XXX XX XX" };
  }
  const contactPhone = contactPhoneRaw.trim() ? normalizeContactPhone(contactPhoneRaw) : null;

  const deliveryAvailable = input.deliveryAvailable === true;

  return {
    ok: true,
    data: {
      storeId,
      title,
      price: Math.round(price),
      categoryId,
      subcategoryId,
      attributes: parseAttributes(input.attributes),
      city,
      condition,
      description,
      contactPhone,
      deliveryAvailable,
    },
  };
}

export function validateListingImageCount(count: number, maxCount = MAX_LISTING_IMAGES): string | null {
  if (count > maxCount) {
    return `Maksimum ${maxCount} şəkil əlavə edə bilərsiniz.`;
  }
  return null;
}

export { MAX_LISTING_IMAGES };
