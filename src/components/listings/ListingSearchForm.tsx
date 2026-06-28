import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

import { CITY_OPTIONS, LISTING_CONDITIONS } from "@/constants/listings";
import {
  getListingSearchCategoryOptions,
  hasListingSearchFilters,
  LISTING_SORT_OPTIONS,
  type ListingSearchFilters,
} from "@/lib/listings/search";

type ListingSearchFormProps = {
  filters: ListingSearchFilters;
};

const fieldClass =
  "h-11 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition-colors focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15";

export function ListingSearchForm({ filters }: ListingSearchFormProps) {
  const categoryOptions = getListingSearchCategoryOptions();
  const hasFilters = hasListingSearchFilters(filters);

  return (
    <form
      action="/listings"
      className="rounded-xl border border-brand-border/90 bg-brand-surface/55 p-3 sm:p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-text">
        <SlidersHorizontal className="h-4 w-4 text-brand-primary" />
        Axtarış və filtrlər
      </div>

      <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-[minmax(220px,1.7fr)_1fr_0.9fr_0.9fr_0.8fr_0.8fr_0.95fr_auto]">
        <label className="relative block md:col-span-2 lg:col-span-1">
          <span className="sr-only">Axtarış sözü</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Məhsul, kateqoriya və ya açar söz"
            className={`${fieldClass} pl-9`}
          />
        </label>

        <label>
          <span className="sr-only">Kateqoriya</span>
          <select name="category" defaultValue={filters.category} className={fieldClass}>
            <option value="">Bütün kateqoriyalar</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Şəhər</span>
          <select name="city" defaultValue={filters.city} className={fieldClass}>
            <option value="">Bütün şəhərlər</option>
            {CITY_OPTIONS.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Vəziyyət</span>
          <select name="condition" defaultValue={filters.condition} className={fieldClass}>
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
            name="min_price"
            type="number"
            min="0"
            inputMode="numeric"
            defaultValue={filters.minPrice ?? ""}
            placeholder="Min AZN"
            className={fieldClass}
          />
        </label>

        <label>
          <span className="sr-only">Maksimum qiymət</span>
          <input
            name="max_price"
            type="number"
            min="0"
            inputMode="numeric"
            defaultValue={filters.maxPrice ?? ""}
            placeholder="Max AZN"
            className={fieldClass}
          />
        </label>

        <label>
          <span className="sr-only">Sıralama</span>
          <select name="sort" defaultValue={filters.sort} className={fieldClass}>
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
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-bold text-white transition-colors hover:bg-brand-primary-dark lg:flex-none"
          >
            <Search className="h-4 w-4" />
            Axtar
          </button>
          {hasFilters ? (
            <Link
              href="/listings"
              aria-label="Filtrləri təmizlə"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-muted transition-colors hover:border-brand-primary/40 hover:text-brand-text"
            >
              <X className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
