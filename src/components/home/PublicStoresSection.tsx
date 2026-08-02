import { ArrowRight, Store as StoreIcon } from "lucide-react";
import Link from "next/link";

import { PublicStoreCard } from "@/components/store/PublicStoreCard";
import { getPublicStores } from "@/lib/stores/stores";

export async function PublicStoresSection() {
  const stores = await getPublicStores(3);

  return (
    <section className="pb-7 sm:pb-8" aria-labelledby="public-stores-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-primary">
              <StoreIcon className="h-3.5 w-3.5" aria-hidden />
              Mağazalar
            </div>
            <h2
              id="public-stores-heading"
              className="section-title-premium text-2xl font-extrabold tracking-tight text-brand-text"
            >
              Rəsmi mağazalar
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-brand-muted">
              Moderator tərəfindən yaradılmış mağazalara baxın və onların aktiv elanlarını eyni yerdə görün.
            </p>
          </div>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary-light/50 hover:text-brand-primary-dark"
          >
            Bütün mağazalar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {stores.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <PublicStoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-brand-border/90 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-brand-muted">Mağazalar hazır olduqda burada görünəcək.</p>
              <Link
                href="/stores"
                className="inline-flex items-center justify-center rounded-xl border border-brand-primary/30 bg-brand-primary-light px-4 py-2 text-sm font-semibold text-brand-primary-dark transition-colors hover:border-brand-primary/50"
              >
                Mağazalara keç
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
