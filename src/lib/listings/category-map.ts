import { ALL_CATEGORIES } from "@/constants/data";
import { LISTING_CATEGORIES } from "@/constants/listings";
import { categoryToSlug, slugToCategory } from "@/lib/categories";

/** DB category (create-listing / mobile app) → display category (ALL_CATEGORIES) */
const DB_CATEGORY_TO_DISPLAY: Record<string, (typeof ALL_CATEGORIES)[number]> = {
  Avto: "Avtomobil və nəqliyyat",
  "Ehtiyat hissələri": "Avto ehtiyat hissələri və avadanlıq",
  "Avto ehtiyat hissələri": "Avto ehtiyat hissələri və avadanlıq",
  "Avto avadanlıq": "Avto ehtiyat hissələri və avadanlıq",
  "Avto aksesuarlar": "Avto ehtiyat hissələri və avadanlıq",
  Telefon: "Telefon",
  Elektronika: "Elektronika",
  "Daşınmaz əmlak": "Daşınmaz əmlak",
  "Ev və bağ": "Ev və bağ",
  Geyim: "Geyim və aksesuar",
  "Uşaq aləmi": "Uşaq məhsulları",
  Xidmətlər: "Xidmətlər",
  Digər: "Digər",
};

/** Resolve display category label from a DB listings.category value */
export function dbCategoryToDisplay(dbCategory: string): string {
  if (DB_CATEGORY_TO_DISPLAY[dbCategory]) {
    return DB_CATEGORY_TO_DISPLAY[dbCategory];
  }

  const direct = ALL_CATEGORIES.find((cat) => cat === dbCategory);
  if (direct) {
    return direct;
  }

  return dbCategory;
}

/** DB category values that belong to a /categories/[slug] display category */
export function getDbCategoriesForSlug(categorySlug: string): string[] {
  const displayCategory = slugToCategory(categorySlug);
  if (!displayCategory) {
    return [];
  }

  const fromDbMap = LISTING_CATEGORIES.filter(
    (dbCat) => DB_CATEGORY_TO_DISPLAY[dbCat] === displayCategory,
  );

  const values = new Set<string>(fromDbMap);

  if ((ALL_CATEGORIES as readonly string[]).includes(displayCategory)) {
    values.add(displayCategory);
  }

  return [...values];
}

export function displayCategoryToSlug(displayCategory: string): string {
  return categoryToSlug(displayCategory);
}

export function dbCategoryToSlug(dbCategory: string): string {
  return displayCategoryToSlug(dbCategoryToDisplay(dbCategory));
}
