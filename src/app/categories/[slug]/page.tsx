import type { Metadata } from "next";
import Link from "next/link";

import { GroupedSubcategoryGrid } from "@/components/categories/GroupedSubcategoryGrid";
import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { getListingsByCategorySlug, getListingsByCategorySlugPage } from "@/lib/listings/live-listings";
import { createPageMetadata } from "@/lib/seo";
import { getBreadcrumbJsonLd } from "@/lib/seo-assets";
import { getCatalogueEntryBySlug, getCatalogueSlugs } from "@/lib/taxonomy/fetch-catalogue";
import { getSubcategoriesByCategorySlug, getSubcategoryBySlug } from "@/lib/taxonomy/fetch-subcategories";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string | string[]; page?: string | string[] }>;
};

export async function generateStaticParams() {
  const slugs = await getCatalogueSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const dynamicParams = true;

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePageParam(value: string | string[] | undefined): number {
  const page = Number(firstParam(value).trim());
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.max(1, Math.round(page));
}

function categoryPageHref(categorySlug: string, subcategorySlug: string | null | undefined, page: number): string {
  const params = new URLSearchParams();
  if (subcategorySlug) {
    params.set("sub", subcategorySlug);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/categories/${categorySlug}?${query}` : `/categories/${categorySlug}`;
}

function CategoryPagination({
  categorySlug,
  subcategorySlug,
  page,
  limit,
  total,
  totalPages,
}: {
  categorySlug: string;
  subcategorySlug?: string | null;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const currentPage = Math.min(page, totalPages);
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);
  const linkClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary";
  const activeClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-brand-primary px-3 text-sm font-bold text-white";
  const disabledClass =
    "inline-flex h-10 min-w-10 cursor-not-allowed items-center justify-center rounded-lg border border-brand-border bg-brand-surface px-3 text-sm font-semibold text-brand-muted";

  return (
    <nav
      className="flex flex-col gap-3 border-t border-brand-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Kateqoriya elan səhifələri"
    >
      <p className="text-sm text-brand-muted">
        {from}-{to} / {total} elan
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {currentPage > 1 ? (
          <Link href={categoryPageHref(categorySlug, subcategorySlug, currentPage - 1)} className={linkClass}>
            Əvvəlki
          </Link>
        ) : (
          <span className={disabledClass}>Əvvəlki</span>
        )}

        {pages[0] > 1 ? (
          <>
            <Link href={categoryPageHref(categorySlug, subcategorySlug, 1)} className={linkClass}>
              1
            </Link>
            {pages[0] > 2 ? <span className="px-1 text-sm text-brand-muted">...</span> : null}
          </>
        ) : null}

        {pages.map((item) =>
          item === currentPage ? (
            <span key={item} className={activeClass} aria-current="page">
              {item}
            </span>
          ) : (
            <Link key={item} href={categoryPageHref(categorySlug, subcategorySlug, item)} className={linkClass}>
              {item}
            </Link>
          ),
        )}

        {pages[pages.length - 1] < totalPages ? (
          <>
            {pages[pages.length - 1] < totalPages - 1 ? (
              <span className="px-1 text-sm text-brand-muted">...</span>
            ) : null}
            <Link href={categoryPageHref(categorySlug, subcategorySlug, totalPages)} className={linkClass}>
              {totalPages}
            </Link>
          </>
        ) : null}

        {currentPage < totalPages ? (
          <Link href={categoryPageHref(categorySlug, subcategorySlug, currentPage + 1)} className={linkClass}>
            Növbəti
          </Link>
        ) : (
          <span className={disabledClass}>Növbəti</span>
        )}
      </div>
    </nav>
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const search = await searchParams;
  const sub = firstParam(search.sub).trim();
  const entry = await getCatalogueEntryBySlug(slug);

  if (!entry) {
    return createPageMetadata({
      title: "Kateqoriya tapılmadı",
      description: "MarktX kateqoriya səhifəsi tapılmadı.",
      path: `/categories/${slug}`,
      noIndex: true,
    });
  }

  const subcategory = sub ? await getSubcategoryBySlug(slug, sub) : null;
  const pageTitle = subcategory ? `${entry.title} — ${subcategory.name}` : entry.title;
  const path = subcategory ? `/categories/${slug}?sub=${subcategory.slug}` : `/categories/${slug}`;

  const liveListings = await getListingsByCategorySlug(slug, {
    limit: 1,
    subcategorySlug: subcategory?.slug,
  });

  return createPageMetadata({
    title: pageTitle,
    description: `${pageTitle} kateqoriyası üzrə elanlar — marketx.az`,
    path,
    noIndex: liveListings.length === 0,
  });
}

function CategoryListingsSection({
  listingPage,
  categorySlug,
  subcategorySlug,
  emptyMessage,
}: {
  listingPage: Awaited<ReturnType<typeof getListingsByCategorySlugPage>>;
  categorySlug: string;
  subcategorySlug?: string | null;
  emptyMessage: string;
}) {
  if (listingPage.listings.length > 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4">
          {listingPage.listings.map((listing) => (
            <LiveListingCard key={listing.id} listing={listing} mobileCompact />
          ))}
        </div>
        <CategoryPagination
          categorySlug={categorySlug}
          subcategorySlug={subcategorySlug}
          page={listingPage.page}
          limit={listingPage.limit}
          total={listingPage.total}
          totalPages={listingPage.totalPages}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-center">
      <p className="text-sm leading-relaxed text-brand-muted">{emptyMessage}</p>
      <Link
        href="/elanlar"
        className="btn-primary-premium mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
      >
        Bütün elanlara bax
      </Link>
    </div>
  );
}

export default async function CategorySlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const search = await searchParams;
  const sub = firstParam(search.sub).trim();
  const page = parsePageParam(search.page);
  const entry = await getCatalogueEntryBySlug(slug);

  if (!entry) {
    return (
      <PageShell
        title="Səhifə tapılmadı"
        subtitle="Axtardığınız kateqoriya tapılmadı."
      >
        <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-center">
          <p className="text-sm leading-relaxed text-brand-muted">
            Link səhv ola bilər və ya kateqoriya artıq mövcud deyil.
          </p>
          <Link
            href="/categories"
            className="btn-primary-premium mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          >
            Kateqoriyalara qayıt
          </Link>
        </div>
      </PageShell>
    );
  }

  const subcategory = sub ? await getSubcategoryBySlug(slug, sub) : null;
  const [subcategories, listingPage] = await Promise.all([
    getSubcategoriesByCategorySlug(slug),
    getListingsByCategorySlugPage(slug, {
      page,
      subcategorySlug: subcategory?.slug,
    }),
  ]);

  const pageTitle = subcategory ? `${entry.title} — ${subcategory.name}` : entry.title;
  const subtitle = subcategory
    ? `${subcategory.name} alt kateqoriyası üzrə elanlar.`
    : `${entry.title} kateqoriyası üzrə elanlar.`;
  const emptyMessage = subcategory
    ? "Bu alt kateqoriyada aktiv elan hələ yoxdur."
    : "Bu kateqoriyada aktiv elan hələ yoxdur. Tezliklə yeni elanlar əlavə olunacaq.";
  const breadcrumbItems = [
    { name: "Ana səhifə", path: "/" },
    { name: "Kateqoriyalar", path: "/categories" },
    { name: entry.title, path: `/categories/${slug}` },
    ...(subcategory
      ? [{ name: subcategory.name, path: `/categories/${slug}?sub=${subcategory.slug}` }]
      : []),
  ];

  return (
    <PageShell wide title={pageTitle} subtitle={subtitle}>
      <JsonLd data={getBreadcrumbJsonLd(breadcrumbItems)} />
      <GroupedSubcategoryGrid
        categorySlug={slug}
        subcategories={subcategories}
        activeSubSlug={subcategory?.slug}
      />
      <CategoryListingsSection
        listingPage={listingPage}
        categorySlug={slug}
        subcategorySlug={subcategory?.slug}
        emptyMessage={emptyMessage}
      />
    </PageShell>
  );
}
