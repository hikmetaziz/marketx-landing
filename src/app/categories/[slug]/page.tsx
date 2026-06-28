import type { Metadata } from "next";
import Link from "next/link";

import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { SampleListingCard } from "@/components/listings/SampleListingCard";
import { PageShell } from "@/components/layout/PageShell";
import { POPULAR_LISTINGS } from "@/constants/data";
import { slugToCategory, CATEGORY_SLUGS } from "@/lib/categories";
import { getListingsByCategorySlug } from "@/lib/listings/live-listings";
import { createPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const label = slugToCategory(slug);

  if (!label) {
    return createPageMetadata({
      title: "Kateqoriya tapılmadı",
      description: "MarktX kateqoriya səhifəsi tapılmadı.",
      path: `/categories/${slug}`,
      noIndex: true,
    });
  }

  const liveListings = await getListingsByCategorySlug(slug, 1);

  return createPageMetadata({
    title: label,
    description: `${label} kateqoriyası üzrə elanlar — marketx.az`,
    path: `/categories/${slug}`,
    noIndex: liveListings.length === 0,
  });
}

export default async function CategorySlugPage({ params }: Props) {
  const { slug } = await params;
  const label = slugToCategory(slug);

  if (!label) {
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

  const liveListings = await getListingsByCategorySlug(slug);

  if (liveListings.length > 0) {
    return (
      <PageShell wide title={label} subtitle={`${label} kateqoriyası üzrə elanlar.`}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {liveListings.map((listing) => (
            <LiveListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell wide title={label} subtitle={`${label} kateqoriyasında hələ canlı elan yoxdur.`}>
      <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-center">
        <p className="text-sm leading-relaxed text-brand-muted">
          Bu kateqoriyada aktiv elan hələ yoxdur. Tezliklə yeni elanlar əlavə olunacaq.
        </p>
        <Link
          href="/listings"
          className="btn-primary-premium mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        >
          Bütün elanlara bax
        </Link>
      </div>

      <section className="mt-10" aria-labelledby="category-sample-fallback-heading">
        <h2
          id="category-sample-fallback-heading"
          className="mb-4 text-lg font-bold text-brand-text"
        >
          Nümunə elanlar (satılıb)
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {POPULAR_LISTINGS.slice(0, 4).map((listing) => (
            <SampleListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
