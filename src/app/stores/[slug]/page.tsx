import { MapPin, Store as StoreIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/PageShell";
import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { ListingPagination } from "@/components/listings/ListingPagination";
import { OpenInAppLink } from "@/components/listings/OpenInAppLink";
import { StoreMessageButton } from "@/components/messaging/StoreMessageButton";
import { StoreMapEmbed } from "@/components/store/StoreMapEmbed";
import { StorePhoneReveal } from "@/components/store/StorePhoneReveal";
import type { ListingSearchFilters } from "@/lib/listings/search";
import { getPublicStoreBySlug, getStoreActiveListingsPage } from "@/lib/stores/stores";
import { createPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePageParam(value: string | string[] | undefined): number {
  const page = Number(firstParam(value).trim());
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.max(1, Math.round(page));
}

function storePaginationFilters(page: number, limit: number): ListingSearchFilters {
  return {
    q: "",
    category: "",
    subcategory: "",
    city: "",
    condition: "",
    minPrice: null,
    maxPrice: null,
    sort: "newest",
    page,
    limit,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    return createPageMetadata({
      title: "Mağaza tapılmadı",
      description: "MarktX mağaza səhifəsi.",
      path: `/stores/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: store.name,
    description: store.description ?? `${store.name} — MarktX mağaza səhifəsi.`,
    path: `/stores/${store.slug}`,
  });
}

function normalizePhoneForLink(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export default async function PublicStorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  const listingPage = await getStoreActiveListingsPage(store.id, { page });
  const listings = listingPage.listings;

  const whatsappPhone = store.whatsapp_phone
    ? normalizePhoneForLink(store.whatsapp_phone).replace(/^\+/, "")
    : null;

  return (
    <PageShell wide title={store.name} subtitle="Mağaza səhifəsi">
      <div className="space-y-4 md:space-y-6">
        <section className="overflow-hidden rounded-xl border border-brand-border/90 bg-white md:rounded-2xl">
          {store.cover_url ? (
            <div className="relative h-32 border-b border-brand-border/80 bg-brand-surface sm:h-40 md:h-56">
              <Image
                src={store.cover_url}
                alt={`${store.name} örtük şəkli`}
                fill
                sizes="(max-width: 768px) 100vw, 896px"
                className="object-cover"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-4 p-4 md:p-6">
            <div className="flex min-w-0 gap-3 md:gap-4">
              <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-primary/20 bg-brand-primary-light text-brand-primary md:h-16 md:w-16 md:rounded-2xl">
                {store.logo_url ? (
                  <Image
                    src={store.logo_url}
                    alt={`${store.name} logo`}
                    fill
                    sizes="64px"
                    className="bg-white object-contain"
                  />
                ) : (
                  <StoreIcon className="h-6 w-6" aria-hidden />
                )}
              </span>

              <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-sm text-brand-muted">
                <StoreIcon className="h-4 w-4 shrink-0" aria-hidden />
                {store.category ? <span>{store.category}</span> : <span>Mağaza</span>}
              </div>

              {store.city || store.address ? (
                <p className="flex items-start gap-2 text-sm text-brand-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{[store.address, store.city].filter(Boolean).join(", ")}</span>
                </p>
              ) : null}

              {store.description ? (
                <p className="max-w-2xl text-sm leading-relaxed text-brand-text">{store.description}</p>
              ) : null}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2.5 sm:flex-row md:w-auto">
              <OpenInAppLink type="store" slug={store.slug} />
              <StoreMessageButton storeId={store.id} storeName={store.name} />
              {store.contact_phone ? (
                <StorePhoneReveal
                  phone={store.contact_phone}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark md:w-auto"
                />
              ) : null}
              {whatsappPhone ? (
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-400 md:w-auto"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <StoreMapEmbed
          name={store.name}
          address={store.address}
          city={store.city}
          mapUrl={store.map_url}
        />

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-brand-text">Elanlar ({listingPage.total})</h2>
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-center">
              <p className="text-sm text-brand-muted">Hazırda aktiv elan yoxdur.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {listings.map((listing) => (
                  <LiveListingCard key={listing.id} listing={listing} mobileCompact />
                ))}
              </div>
              <ListingPagination
                filters={storePaginationFilters(listingPage.page, listingPage.limit)}
                total={listingPage.total}
                totalPages={listingPage.totalPages}
                basePath={`/stores/${store.slug}`}
              />
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
