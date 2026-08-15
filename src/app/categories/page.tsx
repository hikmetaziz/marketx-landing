import type { Metadata } from "next";

import { CategoryCatalogueTile } from "@/components/home/CategoryCatalogueTile";
import { PageShell } from "@/components/layout/PageShell";
import { SITE } from "@/constants/data";
import { createPageMetadata } from "@/lib/seo";
import { getCatalogue } from "@/lib/taxonomy/fetch-catalogue";

export const metadata: Metadata = createPageMetadata({
  title: "Kateqoriyalar",
  description: `MarktX-də elanları əsas kateqoriyalar üzrə araşdırın — ${SITE.domain}`,
  path: "/categories",
});

export default async function CategoriesPage() {
  const catalogue = await getCatalogue();

  return (
    <PageShell wide title="Kateqoriyalar" subtitle="Kateqoriya üzrə elanları kəşf edin.">
      <div className="grid grid-cols-3 gap-2.5 md:gap-3.5 lg:grid-cols-4 xl:grid-cols-5">
        {catalogue.map((entry) => (
          <CategoryCatalogueTile key={entry.slug} entry={entry} mobileCompact />
        ))}
      </div>
    </PageShell>
  );
}
