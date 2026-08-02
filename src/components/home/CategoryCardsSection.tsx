import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CategoryCatalogueTile } from "@/components/home/CategoryCatalogueTile";
import { getCatalogue } from "@/lib/taxonomy/fetch-catalogue";

export async function CategoryCardsSection() {
  const catalogue = await getCatalogue();

  return (
    <section
      id="catalogue-section"
      className="pb-10 sm:pb-12"
      aria-labelledby="categories-heading"
    >
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-0">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="categories-heading" className="text-2xl font-extrabold text-brand-text sm:text-3xl">
            Kateqoriyalar
          </h2>
          <Link
            href="/categories"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-primary-dark transition-colors hover:bg-brand-primary-light/40 hover:text-brand-primary"
          >
            Hamısına bax
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {catalogue.map((entry) => (
            <CategoryCatalogueTile key={entry.slug} entry={entry} />
          ))}
        </div>
      </div>
    </section>
  );
}
