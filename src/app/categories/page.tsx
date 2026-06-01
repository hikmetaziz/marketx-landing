import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { ALL_CATEGORIES, SITE } from "@/constants/data";
import { categoryToSlug } from "@/lib/categories";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Kateqoriyalar",
  description: `MarktX-də elanları əsas kateqoriyalar üzrə araşdırın — ${SITE.domain}`,
  path: "/categories",
});

export default function CategoriesPage() {
  return (
    <PageShell
      wide
      title="Kateqoriyalar"
      subtitle="Kateqoriya üzrə canlı elan siyahısı tezliklə aktiv olacaq."
    >
      <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {ALL_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/categories/${categoryToSlug(category)}`}
            className="card-premium flex min-h-[112px] flex-col items-center justify-center gap-3 rounded-2xl px-3 py-4 text-center"
          >
            <span className="icon-well inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-primary/20 text-brand-primary">
              <LayoutGrid className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold leading-snug text-brand-text">{category}</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
