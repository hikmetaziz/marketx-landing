"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type StoreListingCategoryOption = {
  slug: string;
  name: string;
  count: number;
};

type StoreListingCategoryFilterProps = {
  basePath: string;
  total: number;
  categories: StoreListingCategoryOption[];
  selectedCategory: string;
};

const MOBILE_DROPDOWN_THRESHOLD = 5;

function categoryHref(basePath: string, category: string): string {
  return category ? `${basePath}?category=${encodeURIComponent(category)}` : basePath;
}

export function StoreListingCategoryFilter({
  basePath,
  total,
  categories,
  selectedCategory,
}: StoreListingCategoryFilterProps) {
  const router = useRouter();
  const options = [{ slug: "", name: "Hamısı", count: total }, ...categories];
  const useMobileDropdown = categories.length > MOBILE_DROPDOWN_THRESHOLD;

  return (
    <>
      <aside className="hidden min-w-0 md:block" aria-label="Mağaza elan kateqoriyaları">
        <h3 className="mb-3 text-sm font-bold text-brand-text">Kateqoriyalar</h3>
        <nav className="space-y-1.5">
          {options.map((option) => {
            const active = option.slug === selectedCategory;
            return (
              <Link
                key={option.slug || "all"}
                href={categoryHref(basePath, option.slug)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-primary-light font-bold text-brand-primary"
                    : "text-brand-muted hover:bg-brand-surface hover:text-brand-text"
                }`}
              >
                <span className="min-w-0 break-words">{option.name}</span>
                <span className="shrink-0 tabular-nums">{option.count}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 md:hidden">
        {useMobileDropdown ? (
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-brand-text">Kateqoriyalar</span>
            <select
              value={selectedCategory}
              onChange={(event) => router.push(categoryHref(basePath, event.target.value))}
              className="h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text outline-none focus:border-brand-primary"
            >
              {options.map((option) => (
                <option key={option.slug || "all"} value={option.slug}>
                  {option.name} ({option.count})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <nav
            className="flex max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Mağaza elan kateqoriyaları"
          >
            {options.map((option) => {
              const active = option.slug === selectedCategory;
              return (
                <Link
                  key={option.slug || "all"}
                  href={categoryHref(basePath, option.slug)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-semibold transition-colors ${
                    active
                      ? "border-brand-primary bg-brand-primary text-white"
                      : "border-brand-border bg-white text-brand-muted hover:border-brand-primary/40 hover:text-brand-primary"
                  }`}
                >
                  {option.name} ({option.count})
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
}
