import { Search } from "lucide-react";

import { AZERBAIJAN_CITY_OPTIONS, CITY_FILTER_ALL_OPTION } from "@/lib/constants/cities";
import { getListingSearchCategoryOptions } from "@/lib/listings/search";

const glassField =
  "h-12 min-w-0 w-full rounded-lg border border-[#d9e0e9] bg-white px-3.5 text-[15px] text-[#0b1f3a] outline-none transition-colors placeholder:text-brand-muted/70 hover:border-[#aebbc9] focus:border-[#173b69] focus:ring-2 focus:ring-[#173b69]/10";

export async function SearchBarSection() {
  const categoryOptions = await getListingSearchCategoryOptions();

  return (
    <section className="relative z-20 pb-11 pt-7 sm:pb-12" aria-labelledby="search-heading">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-0">
        <form
          action="/elanlar"
          method="get"
          className="rounded-lg border border-[#d9e0e9] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.10)] sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="search-heading" className="text-base font-bold text-brand-text sm:text-lg">
              Elanlarda axtar
            </h2>
            <span className="hidden text-sm text-brand-muted sm:inline">Sürətli və dəqiq axtarış</span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(280px,2fr)_minmax(180px,1fr)_minmax(170px,1fr)_auto] lg:items-stretch">
            <label className="relative block min-w-0">
              <span className="sr-only">Məhsul, kateqoriya və ya açar söz</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-brand-muted" />
              <input
                name="query"
                type="search"
                placeholder="Məhsul, kateqoriya və ya açar söz"
                className={`${glassField} pl-10`}
                autoComplete="off"
              />
            </label>

            <select name="category" aria-label="Kateqoriya" defaultValue="" className={glassField}>
              <option value="">Bütün kateqoriyalar</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select name="city" aria-label="Şəhər" defaultValue="" className={glassField}>
              <option value={CITY_FILTER_ALL_OPTION.value}>{CITY_FILTER_ALL_OPTION.label}</option>
              {AZERBAIJAN_CITY_OPTIONS.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-primary px-7 text-[15px] font-bold text-white transition-colors hover:bg-brand-primary-dark lg:min-w-[120px]"
            >
              <Search className="h-[18px] w-[18px]" />
              Axtar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
