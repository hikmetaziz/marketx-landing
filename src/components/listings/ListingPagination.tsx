import Link from "next/link";

import { buildListingSearchQuery, type ListingSearchFilters } from "@/lib/listings/search";

type ListingPaginationProps = {
  filters: ListingSearchFilters;
  total: number;
  totalPages: number;
  basePath?: string;
};

function pageHref(basePath: string, filters: ListingSearchFilters, page: number): string {
  const query = buildListingSearchQuery({ ...filters, page });
  return query ? `${basePath}?${query}` : basePath;
}

function pageNumbers(current: number, total: number): number[] {
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  const pages: number[] = [];

  for (let page = start; page <= end; page++) {
    pages.push(page);
  }

  return pages;
}

export function ListingPagination({ filters, total, totalPages, basePath = "/elanlar" }: ListingPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const currentPage = Math.min(filters.page, totalPages);
  const pages = pageNumbers(currentPage, totalPages);
  const from = (currentPage - 1) * filters.limit + 1;
  const to = Math.min(currentPage * filters.limit, total);

  const linkClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary";
  const activeClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-brand-primary px-3 text-sm font-bold text-white";
  const disabledClass =
    "inline-flex h-10 min-w-10 cursor-not-allowed items-center justify-center rounded-lg border border-brand-border bg-brand-surface px-3 text-sm font-semibold text-brand-muted";

  return (
    <nav
      className="flex flex-col gap-3 border-t border-brand-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Elan səhifələri"
    >
      <p className="text-sm text-brand-muted">
        {from}-{to} / {total} elan
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {currentPage > 1 ? (
          <Link href={pageHref(basePath, filters, currentPage - 1)} className={linkClass}>
            Əvvəlki
          </Link>
        ) : (
          <span className={disabledClass}>Əvvəlki</span>
        )}

        {pages[0] > 1 ? (
          <>
            <Link href={pageHref(basePath, filters, 1)} className={linkClass}>
              1
            </Link>
            {pages[0] > 2 ? <span className="px-1 text-sm text-brand-muted">...</span> : null}
          </>
        ) : null}

        {pages.map((page) =>
          page === currentPage ? (
            <span key={page} className={activeClass} aria-current="page">
              {page}
            </span>
          ) : (
            <Link key={page} href={pageHref(basePath, filters, page)} className={linkClass}>
              {page}
            </Link>
          ),
        )}

        {pages[pages.length - 1] < totalPages ? (
          <>
            {pages[pages.length - 1] < totalPages - 1 ? (
              <span className="px-1 text-sm text-brand-muted">...</span>
            ) : null}
            <Link href={pageHref(basePath, filters, totalPages)} className={linkClass}>
              {totalPages}
            </Link>
          </>
        ) : null}

        {currentPage < totalPages ? (
          <Link href={pageHref(basePath, filters, currentPage + 1)} className={linkClass}>
            Növbəti
          </Link>
        ) : (
          <span className={disabledClass}>Növbəti</span>
        )}
      </div>
    </nav>
  );
}