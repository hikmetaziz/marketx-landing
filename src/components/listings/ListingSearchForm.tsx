"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { LISTING_CONDITIONS } from "@/constants/listings";
import { AZERBAIJAN_CITY_OPTIONS, CITY_FILTER_ALL_OPTION, cityToSlug } from "@/lib/constants/cities";
import { categoryToSlug } from "@/lib/categories";
const LISTING_SORT_OPTIONS = [
  { value: "newest", label: "Yeni elanlar" },
  { value: "price_asc", label: "Ucuzdan bahaya" },
  { value: "price_desc", label: "Bahadan ucuza" },
] as const;

type ListingSort = (typeof LISTING_SORT_OPTIONS)[number]["value"];

type ListingSearchFilters = {
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

function hasListingSearchFilters(filters: ListingSearchFilters): boolean {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.subcategory ||
      filters.city ||
      filters.condition ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.sort !== "newest",
  );
}

type CategorySearchOption = {
  label: string;
  value: string;
};

type ListingSearchFormProps = {
  filters: ListingSearchFilters;
  categoryOptions: CategorySearchOption[];
  subcategoryOptions: CategorySearchOption[];
};

type FilterFormState = {
  query: string;
  category: string;
  subcategory: string;
  city: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  sort: ListingSearchFilters["sort"];
};

const fieldClass =
  "h-11 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition-colors focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15";

function filtersToFormState(filters: ListingSearchFilters): FilterFormState {
  return {
    query: filters.q,
    category: filters.category,
    subcategory: filters.subcategory,
    city: filters.city,
    condition: filters.condition,
    minPrice: filters.minPrice !== null ? String(filters.minPrice) : "",
    maxPrice: filters.maxPrice !== null ? String(filters.maxPrice) : "",
    sort: filters.sort,
  };
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  const normalized = value.trim();
  if (normalized) {
    params.set(key, normalized);
  } else {
    params.delete(key);
  }
}

export function ListingSearchForm({ filters, categoryOptions, subcategoryOptions }: ListingSearchFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<FilterFormState>(() => filtersToFormState(filters));
  const debounceReadyRef = useRef(false);
  const hasFilters = hasListingSearchFilters(filters);

  const currentSearch = searchParams.toString();
  const formStateRef = useRef(formState);

  const buildUrl = useCallback((nextState: FilterFormState): string => {
    const params = new URLSearchParams(currentSearch);

    params.delete("q");
    params.delete("min_price");
    params.delete("max_price");
    params.delete("sub");
    params.delete("page");

    setOrDelete(params, "query", nextState.query);
    setOrDelete(params, "category", nextState.category);
    if (nextState.category) {
      setOrDelete(params, "subcategory", nextState.subcategory);
    } else {
      params.delete("subcategory");
    }
    setOrDelete(params, "city", nextState.city ? cityToSlug(nextState.city) : "");
    setOrDelete(params, "condition", nextState.condition ? categoryToSlug(nextState.condition) : "");
    setOrDelete(params, "minPrice", nextState.minPrice);
    setOrDelete(params, "maxPrice", nextState.maxPrice);

    if (nextState.sort && nextState.sort !== "newest") {
      params.set("sort", nextState.sort);
    } else {
      params.delete("sort");
    }

    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [currentSearch, pathname]);

  const updateUrl = useCallback((nextState: FilterFormState) => {
    startTransition(() => {
      router.replace(buildUrl(nextState), { scroll: false });
    });
  }, [buildUrl, router, startTransition]);

  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  function updateImmediate(patch: Partial<FilterFormState>) {
    const nextState = { ...formStateRef.current, ...patch };
    setFormState(nextState);
    updateUrl(nextState);
  }

  useEffect(() => {
    if (!debounceReadyRef.current) {
      debounceReadyRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      updateUrl(formStateRef.current);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [formState.query, formState.minPrice, formState.maxPrice, updateUrl]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl(formState);
  }

  function clearFilters() {
    const emptyState: FilterFormState = {
      query: "",
      category: "",
      subcategory: "",
      city: "",
      condition: "",
      minPrice: "",
      maxPrice: "",
      sort: "newest",
    };
    setFormState(emptyState);
    updateUrl(emptyState);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-brand-border/90 bg-brand-surface/55 p-3 sm:p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-text">
        <SlidersHorizontal className="h-4 w-4 text-brand-primary" />
        Axtarış və filtrlər
      </div>

      <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-[minmax(220px,1.6fr)_1fr_1fr_0.9fr_0.8fr_0.8fr_0.9fr_auto]">
        <label className="relative block md:col-span-2 lg:col-span-1">
          <span className="sr-only">Axtarış sözü</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            name="query"
            type="search"
            value={formState.query}
            onChange={(event) => setFormState((current) => ({ ...current, query: event.target.value }))}
            placeholder="Məhsul, kateqoriya və ya açar söz"
            className={`${fieldClass} pl-9`}
            autoComplete="off"
          />
        </label>

        <label>
          <span className="sr-only">Kateqoriya</span>
          <select
            name="category"
            value={formState.category}
            onChange={(event) => updateImmediate({ category: event.target.value, subcategory: "" })}
            className={fieldClass}
          >
            <option value="">Bütün kateqoriyalar</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Alt kateqoriya</span>
          <select
            name="subcategory"
            value={formState.subcategory}
            onChange={(event) => updateImmediate({ subcategory: event.target.value })}
            className={fieldClass}
            disabled={!formState.category || subcategoryOptions.length === 0}
          >
            <option value="">Bütün alt kateqoriyalar</option>
            {subcategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Şəhər</span>
          <select
            name="city"
            value={formState.city}
            onChange={(event) => updateImmediate({ city: event.target.value })}
            className={fieldClass}
          >
            <option value={CITY_FILTER_ALL_OPTION.value}>{CITY_FILTER_ALL_OPTION.label}</option>
            {AZERBAIJAN_CITY_OPTIONS.map((city) => (
              <option key={city.slug} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Vəziyyət</span>
          <select
            name="condition"
            value={formState.condition}
            onChange={(event) => updateImmediate({ condition: event.target.value })}
            className={fieldClass}
          >
            <option value="">Hər vəziyyət</option>
            {LISTING_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Minimum qiymət</span>
          <input
            name="minPrice"
            type="number"
            min="0"
            inputMode="numeric"
            value={formState.minPrice}
            onChange={(event) => setFormState((current) => ({ ...current, minPrice: event.target.value }))}
            placeholder="Min AZN"
            className={fieldClass}
          />
        </label>

        <label>
          <span className="sr-only">Maksimum qiymət</span>
          <input
            name="maxPrice"
            type="number"
            min="0"
            inputMode="numeric"
            value={formState.maxPrice}
            onChange={(event) => setFormState((current) => ({ ...current, maxPrice: event.target.value }))}
            placeholder="Max AZN"
            className={fieldClass}
          />
        </label>

        <label>
          <span className="sr-only">Sıralama</span>
          <select
            name="sort"
            value={formState.sort}
            onChange={(event) => updateImmediate({ sort: event.target.value as ListingSearchFilters["sort"] })}
            className={fieldClass}
          >
            {LISTING_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-bold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-70 lg:flex-none"
          >
            <Search className="h-4 w-4" />
            Axtar
          </button>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              aria-label="Filtrləri təmizlə"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-muted transition-colors hover:border-brand-primary/40 hover:text-brand-text"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
