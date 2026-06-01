import { ALL_CATEGORIES } from "@/constants/data";

/** Phase 2: /categories/[slug] üçün slug map */
export function categoryToSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugToCategory(slug: string): string | undefined {
  return ALL_CATEGORIES.find((cat) => categoryToSlug(cat) === slug);
}

export const CATEGORY_SLUGS = ALL_CATEGORIES.map((cat) => categoryToSlug(cat));
