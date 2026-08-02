import { LISTING_CONDITIONS } from "@/constants/listings";
import { cityFromParam, cityToSlug } from "@/lib/constants/cities";
import { categoryToSlug, slugToCategory } from "@/lib/categories";
import type { CategoryCatalogueEntry } from "@/lib/taxonomy/catalogue-types";
import { getCatalogue } from "@/lib/taxonomy/fetch-catalogue";
import { normalizeCategorySlug } from "@/lib/taxonomy/category-filter";
import {
  getCanonicalLeafBySlugOrAlias,
  getCanonicalSearchSubcategoryOptions,
  isCanonicalParentSlug,
} from "@/lib/taxonomy/marktx-taxonomy";

export const LISTING_SORT_OPTIONS = [
  { value: "newest", label: "Yeni elanlar" },
  { value: "price_asc", label: "Ucuzdan bahaya" },
  { value: "price_desc", label: "Bahadan ucuza" },
] as const;

export type ListingSort = (typeof LISTING_SORT_OPTIONS)[number]["value"];

export const DEFAULT_LISTING_LIMIT = 24;

export type ListingSearchFilters = {
  q: string;
  category: string;
  subcategory: string;
  city: string;
  condition: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: ListingSort;
  page: number;
  limit: number;
};

export type ListingSearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_FILTERS: ListingSearchFilters = {
  q: "",
  category: "",
  subcategory: "",
  city: "",
  condition: "",
  minPrice: null,
  maxPrice: null,
  sort: "newest",
  page: 1,
  limit: DEFAULT_LISTING_LIMIT,
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

function parsePositiveInteger(value: string, fallback: number, options?: { min?: number; max?: number }): number {
  const number = Number(value.trim());
  if (!Number.isFinite(number)) {
    return fallback;
  }

  const min = options?.min ?? 1;
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(Math.round(number), min), max);
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

function optionFromParam(value: string, options: readonly string[]): string {
  const normalized = value.trim();
  const slug = categoryToSlug(normalized);
  return options.find((option) => option === normalized || categoryToSlug(option) === slug) ?? "";
}

function conditionFromParam(value: string): string {
  return optionFromParam(value, LISTING_CONDITIONS);
}

function isSort(value: string): value is ListingSort {
  return LISTING_SORT_OPTIONS.some((option) => option.value === value);
}

export function parseListingSearchParams(params: ListingSearchParams = {}): ListingSearchFilters {
  const q = normalizeSearchText(firstParam(params.query) || firstParam(params.q));
  const category = firstParam(params.category).trim();
  const subcategory = firstParam(params.subcategory).trim() || firstParam(params.sub).trim();
  const city = firstParam(params.city).trim();
  const condition = firstParam(params.condition).trim();
  const minPrice = parsePrice(firstParam(params.minPrice) || firstParam(params.min_price));
  const maxPrice = parsePrice(firstParam(params.maxPrice) || firstParam(params.max_price));
  const sort = firstParam(params.sort).trim();
  const page = parsePositiveInteger(firstParam(params.page), DEFAULT_FILTERS.page, { min: 1 });

  const normalizedCategory = category ? normalizeCategorySlug(category) : "";
  const safeCategory =
    normalizedCategory &&
    (slugToCategory(normalizedCategory) || isLegacyCategorySlug(category) || isCanonicalParentSlug(normalizedCategory))
      ? normalizedCategory
      : "";
  const normalizedSubcategory = subcategory ? normalizeCategorySlug(subcategory) : "";
  const canonicalSubcategory =
    safeCategory && normalizedSubcategory
      ? getCanonicalLeafBySlugOrAlias(safeCategory, normalizedSubcategory)
      : null;
  const safeSubcategory = canonicalSubcategory?.slug ?? "";
  const safeCity = cityFromParam(city);
  const safeCondition = conditionFromParam(condition);
  const safeSort = isSort(sort) ? sort : DEFAULT_FILTERS.sort;

  const prices =
    minPrice !== null && maxPrice !== null && minPrice > maxPrice
      ? { minPrice: maxPrice, maxPrice: minPrice }
      : { minPrice, maxPrice };

  return {
    q,
    category: safeCategory,
    subcategory: safeSubcategory,
    city: safeCity,
    condition: safeCondition,
    ...prices,
    sort: safeSort,
    page,
    limit: DEFAULT_FILTERS.limit,
  };
}

export function hasListingSearchFilters(filters: ListingSearchFilters): boolean {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.subcategory ||
      filters.city ||
      filters.condition ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.sort !== DEFAULT_FILTERS.sort,
  );
}

const LEGACY_CATEGORY_SLUGS = new Set(["neqliyyat", "usaq-alemi", "geyim"]);

function isLegacyCategorySlug(slug: string): boolean {
  return LEGACY_CATEGORY_SLUGS.has(slug.trim().toLowerCase());
}

export function getListingSearchCategoryOptionsFromCatalogue(catalogue: CategoryCatalogueEntry[]) {
  return catalogue.map((entry) => ({
    label: entry.title,
    value: entry.slug,
  }));
}

export async function getListingSearchCategoryOptions() {
  const catalogue = await getCatalogue();
  return getListingSearchCategoryOptionsFromCatalogue(catalogue);
}

export function getListingSearchSubcategoryOptions(categorySlug: string) {
  return getCanonicalSearchSubcategoryOptions(categorySlug);
}

export function buildListingSearchQuery(filters: ListingSearchFilters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("query", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.category && filters.subcategory) params.set("subcategory", filters.subcategory);
  if (filters.city) params.set("city", cityToSlug(filters.city));
  if (filters.condition) params.set("condition", categoryToSlug(filters.condition));
  if (filters.minPrice !== null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.page > DEFAULT_FILTERS.page) params.set("page", String(filters.page));

  return params.toString();
}
