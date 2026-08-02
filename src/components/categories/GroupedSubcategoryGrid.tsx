import Link from "next/link";

import type { SubcategoryEntry } from "@/lib/taxonomy/catalogue-types";
import { groupSubcategoriesForDisplay } from "@/lib/taxonomy/marktx-taxonomy";

type GroupedSubcategoryGridProps = {
  categorySlug: string;
  subcategories: SubcategoryEntry[];
  activeSubSlug?: string;
};

function linkClass(active: boolean): string {
  return [
    "block rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
    active
      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
      : "border-brand-border/80 bg-white text-brand-text hover:border-brand-primary/40 hover:text-brand-primary",
  ].join(" ");
}

export function GroupedSubcategoryGrid({
  categorySlug,
  subcategories,
  activeSubSlug,
}: GroupedSubcategoryGridProps) {
  const groups = groupSubcategoriesForDisplay(categorySlug, subcategories);
  if (groups.length === 0) {
    return null;
  }

  const basePath = `/categories/${categorySlug}`;

  return (
    <nav aria-label="Alt kateqoriyalar" className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href={basePath} className={linkClass(!activeSubSlug)}>
          Hamısı
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <section
            key={group.key}
            aria-labelledby={`${group.key}-title`}
            className="rounded-lg border border-brand-border/90 bg-brand-surface/55 p-3"
          >
            <h2 id={`${group.key}-title`} className="mb-2 text-sm font-bold text-brand-text">
              {group.label}
            </h2>
            <div className="grid gap-2">
              {group.subcategories.map((subcategory) => (
                <Link
                  key={`${group.key}:${subcategory.slug}`}
                  href={`${basePath}?sub=${subcategory.slug}`}
                  className={linkClass(activeSubSlug === subcategory.slug)}
                  aria-current={activeSubSlug === subcategory.slug ? "page" : undefined}
                >
                  {subcategory.name}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}
