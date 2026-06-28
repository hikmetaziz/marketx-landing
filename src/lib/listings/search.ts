import { ALL_CATEGORIES } from "@/constants/data";
import { CITY_OPTIONS, LISTING_CONDITIONS } from "@/constants/listings";
import { categoryToSlug, slugToCategory } from "@/lib/categories";

export const LISTING_SORT_OPTIONS = [
  { value: "newest", label: "Yeni elanlar" },
  { value: "price_asc", label: "Ucuzdan bahaya" },
  { value: "price_desc", label: "Bahadan ucuza" },
] as const;

export type ListingSort = (typeof LISTING_SORT_OPTIONS)[number]["value"];

export type ListingSearchFilters = {
  q: string;
  category: string;
  city: string;
  condition: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: ListingSort;
};

export type ListingSearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_FILTERS: ListingSearchFilters = {
  q: "",
  category: "",
  city: "",
  condition: "",
  minPrice: null,
  maxPrice: null,
  sort: "newest",
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function parsePrice(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.min(Math.round(number), 9_999_999);
}

function isCity(value: string): boolean {
  return (CITY_OPTIONS as readonly string[]).includes(value);
}

function isCondition(value: string): boolean {
  return (LISTING_CONDITIONS as readonly string[]).includes(value);
}

function isSort(value: string): value is ListingSort {
  return LISTING_SORT_OPTIONS.some((option) => option.value === value);
}

export function parseListingSearchParams(params: ListingSearchParams = {}): ListingSearchFilters {
  const q = normalizeSearchText(firstParam(params.q));
  const category = firstParam(params.category).trim();
  const city = firstParam(params.city).trim();
  const condition = firstParam(params.condition).trim();
  const minPrice = parsePrice(firstParam(params.min_price));
  const maxPrice = parsePrice(firstParam(params.max_price));
  const sort = firstParam(params.sort).trim();

  const safeCategory = category && slugToCategory(category) ? category : "";
  const safeCity = isCity(city) ? city : "";
  const safeCondition = isCondition(condition) ? condition : "";
  const safeSort = isSort(sort) ? sort : DEFAULT_FILTERS.sort;

  const prices =
    minPrice !== null && maxPrice !== null && minPrice > maxPrice
      ? { minPrice: maxPrice, maxPrice: minPrice }
      : { minPrice, maxPrice };

  return {
    q,
    category: safeCategory,
    city: safeCity,
    condition: safeCondition,
    ...prices,
    sort: safeSort,
  };
}

export function hasListingSearchFilters(filters: ListingSearchFilters): boolean {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.city ||
      filters.condition ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.sort !== DEFAULT_FILTERS.sort,
  );
}

export function getListingSearchCategoryOptions() {
  return ALL_CATEGORIES.map((label) => ({
    label,
    value: categoryToSlug(label),
  }));
}

export function buildListingSearchQuery(filters: ListingSearchFilters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.city) params.set("city", filters.city);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.minPrice !== null) params.set("min_price", String(filters.minPrice));
  if (filters.maxPrice !== null) params.set("max_price", String(filters.maxPrice));
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);

  return params.toString();
}
