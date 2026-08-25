import { ArrowRight, MapPin, Package, Store as StoreIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { PublicStoreSummary } from "@/lib/stores/stores";

type PublicStoreCardProps = {
  store: PublicStoreSummary;
};

function formatStoreLocation(store: PublicStoreSummary): string | null {
  return store.city?.trim() || store.address?.trim() || null;
}

export function PublicStoreCard({ store }: PublicStoreCardProps) {
  const location = formatStoreLocation(store);

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-brand-border/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-primary/20 bg-brand-primary-light text-brand-primary">
          {store.logo_url ? (
            <Image
              src={store.logo_url}
              alt={`${store.name} logo`}
              fill
              sizes="48px"
              className="bg-white object-contain"
            />
          ) : (
            <StoreIcon className="h-5 w-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-extrabold leading-snug text-brand-text">
            <Link href={`/stores/${store.slug}`} className="hover:text-brand-primary">
              {store.name}
            </Link>
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            {store.category || "Mağaza"}
          </p>
        </div>
      </div>

      {store.description ? (
        <p className="mt-4 line-clamp-2 text-sm font-semibold leading-relaxed text-brand-text">
          {store.description}
        </p>
      ) : null}

      <div className="mt-4 space-y-2 text-sm text-brand-muted">
        {location ? (
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="line-clamp-2">{location}</span>
          </p>
        ) : null}
        <p className="flex items-center gap-2">
          <Package className="h-4 w-4 shrink-0" aria-hidden />
          <span>{store.active_listing_count} aktiv elan</span>
        </p>
      </div>

      <div className="mt-auto pt-5">
        <Link
          href={`/stores/${store.slug}`}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-primary-dark"
        >
          Mağazaya bax
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
