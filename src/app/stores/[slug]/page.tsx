import { MapPin, Store as StoreIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/PageShell";
import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { StoreMessageButton } from "@/components/messaging/StoreMessageButton";
import { StoreMapEmbed } from "@/components/store/StoreMapEmbed";
import { StorePhoneReveal } from "@/components/store/StorePhoneReveal";
import { getPublicStoreBySlug, getStoreActiveListings } from "@/lib/stores/stores";
import { createPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

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

export default async function PublicStorePage({ params }: Props) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  const listings = await getStoreActiveListings(store.id);

  const whatsappPhone = store.whatsapp_phone
    ? normalizePhoneForLink(store.whatsapp_phone).replace(/^\+/, "")
    : null;

  return (
    <PageShell wide title={store.name} subtitle="Mağaza səhifəsi">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-brand-border/90 bg-white">
          {store.cover_url ? (
            <div className="h-40 border-b border-brand-border/80 bg-brand-surface sm:h-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={store.cover_url} alt={`${store.name} örtük şəkli`} className="h-full w-full object-cover" />
            </div>
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
            <div className="flex min-w-0 gap-4">
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-primary/20 bg-brand-primary-light text-brand-primary">
                {store.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logo_url} alt={`${store.name} logo`} className="h-full w-full object-contain bg-white" />
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

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <StoreMessageButton storeId={store.id} storeName={store.name} />
              {store.contact_phone ? <StorePhoneReveal phone={store.contact_phone} /> : null}
              {whatsappPhone ? (
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-400"
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
          <h2 className="text-lg font-bold text-brand-text">Elanlar ({listings.length})</h2>
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-center">
              <p className="text-sm text-brand-muted">Hazırda aktiv elan yoxdur.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <LiveListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
