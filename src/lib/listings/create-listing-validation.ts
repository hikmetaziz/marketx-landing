import { CITY_OPTIONS, LISTING_CATEGORIES, MAX_LISTING_IMAGES } from "@/constants/listings";
import { isValidContactPhone, normalizeContactPhone } from "@/lib/contact-phone";

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 5000;
const PRICE_MIN = 1;
const PRICE_MAX = 9_999_999;

export type CreateListingInput = {
  title: string;
  price: number;
  category: string;
  city: string;
  condition: "Yeni" | "İşlənmiş";
  description: string | null;
  contactPhone: string | null;
  deliveryAvailable: boolean;
};

export type ParsedCreateListingInput = CreateListingInput;

type ParseResult =
  | { ok: true; data: ParsedCreateListingInput }
  | { ok: false; error: string };

function isListingCategory(value: string): value is (typeof LISTING_CATEGORIES)[number] {
  return (LISTING_CATEGORIES as readonly string[]).includes(value);
}

function isCityOption(value: string): value is (typeof CITY_OPTIONS)[number] {
  return (CITY_OPTIONS as readonly string[]).includes(value);
}

export function parseCreateListingInput(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Form məlumatları yanlışdır." };
  }

  const input = raw as Record<string, unknown>;

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

  const category = typeof input.category === "string" ? input.category : "";
  if (!isListingCategory(category)) {
    return { ok: false, error: "Kateqoriya seçin." };
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
    return { ok: false, error: "Telefon düzgün deyil. Nümunə: 050 123 45 67" };
  }
  const contactPhone = contactPhoneRaw.trim() ? normalizeContactPhone(contactPhoneRaw) : null;

  const deliveryAvailable = input.deliveryAvailable === true;

  return {
    ok: true,
    data: {
      title,
      price: Math.round(price),
      category,
      city,
      condition,
      description,
      contactPhone,
      deliveryAvailable,
    },
  };
}

export function validateListingImageCount(count: number): string | null {
  if (count > MAX_LISTING_IMAGES) {
    return `Maksimum ${MAX_LISTING_IMAGES} şəkil əlavə edə bilərsiniz.`;
  }
  return null;
}

export { MAX_LISTING_IMAGES };
