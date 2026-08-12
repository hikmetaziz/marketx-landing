import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CategoryCatalogueTile } from "@/components/home/CategoryCatalogueTile";
import { getCatalogue } from "@/lib/taxonomy/fetch-catalogue";

export async function CategoryCardsSection() {
  const catalogue = await getCatalogue();

  return (
    <section
      id="catalogue-section"
      className="pb-7 md:pb-12"
      aria-labelledby="categories-heading"
    >
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-0">
        <div className="mb-4 flex items-center justify-between gap-3 md:mb-5 md:items-end md:gap-4">
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
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3 md:mx-0 md:grid md:grid-cols-3 md:px-0 md:pb-0 lg:grid-cols-4">
          {catalogue.map((entry) => (
            <div key={entry.slug} className="w-[158px] shrink-0 sm:w-[170px] md:w-auto">
              <CategoryCatalogueTile entry={entry} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
