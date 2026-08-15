import Link from "next/link";

import type { SubcategoryEntry } from "@/lib/taxonomy/catalogue-types";

type SubcategoryChipsProps = {
  categorySlug: string;
  subcategories: SubcategoryEntry[];
  activeSubSlug?: string;
};

function chipClass(active: boolean): string {
  return [
    "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
    active
      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
      : "border-brand-border bg-white text-brand-text hover:border-brand-primary/40 hover:text-brand-primary",
  ].join(" ");
}

export function SubcategoryChips({
  categorySlug,
  subcategories,
  activeSubSlug,
}: SubcategoryChipsProps) {
  if (subcategories.length === 0) {
    return null;
  }

  const basePath = `/categories/${categorySlug}`;

  return (
    <nav aria-label="Alt kateqoriyalar" className="mb-6">
      <div className="flex flex-wrap gap-2">
        <Link href={basePath} className={chipClass(!activeSubSlug)}>
          Hamısı
        </Link>
        {subcategories.map((subcategory) => (
          <Link
            key={subcategory.id}
            href={`${basePath}?sub=${subcategory.slug}`}
            className={chipClass(activeSubSlug === subcategory.slug)}
            aria-current={activeSubSlug === subcategory.slug ? "page" : undefined}
          >
            {subcategory.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
