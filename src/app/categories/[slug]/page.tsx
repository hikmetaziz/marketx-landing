import type { Metadata } from "next";
import Link from "next/link";

import { GroupedSubcategoryGrid } from "@/components/categories/GroupedSubcategoryGrid";
import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { getListingsByCategorySlug } from "@/lib/listings/live-listings";
import { createPageMetadata } from "@/lib/seo";
import { getBreadcrumbJsonLd } from "@/lib/seo-assets";
import { getCatalogueEntryBySlug, getCatalogueSlugs } from "@/lib/taxonomy/fetch-catalogue";
import { getSubcategoriesByCategorySlug, getSubcategoryBySlug } from "@/lib/taxonomy/fetch-subcategories";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string }>;
};

export async function generateStaticParams() {
  const slugs = await getCatalogueSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const dynamicParams = true;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { sub } = await searchParams;
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
  listings,
  emptyMessage,
}: {
  listings: Awaited<ReturnType<typeof getListingsByCategorySlug>>;
  emptyMessage: string;
}) {
  if (listings.length > 0) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {listings.map((listing) => (
          <LiveListingCard key={listing.id} listing={listing} />
        ))}
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
  const { sub } = await searchParams;
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
  const subcategories = await getSubcategoriesByCategorySlug(slug);
  const liveListings = await getListingsByCategorySlug(slug, {
    subcategorySlug: subcategory?.slug,
  });

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
      <CategoryListingsSection listings={liveListings} emptyMessage={emptyMessage} />
    </PageShell>
  );
}
