import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { PublicStoreCard } from "@/components/store/PublicStoreCard";
import { SITE } from "@/constants/data";
import { createPageMetadata } from "@/lib/seo";
import { getPublicStores } from "@/lib/stores/stores";

export const metadata: Metadata = createPageMetadata({
  title: "Mağazalar",
  description: `MarktX-də təsdiqlənmiş mağazaları və onların aktiv elanlarını kəşf edin — ${SITE.domain}`,
  path: "/stores",
});

export default async function PublicStoresPage() {
  const stores = await getPublicStores();

  return (
    <PageShell
      wide
      title="Mağazalar"
      subtitle="Moderator tərəfindən yaradılmış mağazalar və onların aktiv elanları."
    >
      {stores.length === 0 ? (
        <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-center">
          <p className="text-sm text-brand-muted">Hazırda public mağaza yoxdur.</p>
          <Link
            href="/elanlar"
            className="mt-4 inline-flex rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
          >
            Elanlara bax
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <PublicStoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
