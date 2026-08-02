"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  approveListing,
  archiveListing,
  markListingSold,
  rejectListing,
  updatePendingListing,
} from "@/app/admin/listings/actions";
import { ListingImage } from "@/components/ui/ListingImage";
import { AZERBAIJAN_CITY_OPTIONS } from "@/lib/constants/cities";
import { dbCategoryToDisplay } from "@/lib/listings/category-map";
import type { AdminListing } from "@/lib/listings/admin-listings";
import { formatListingPrice } from "@/lib/listings/format";
import { getListingImages, LISTING_IMAGE_FALLBACK_CLASS } from "@/lib/listings/listing-images";

type AdminListingDetailPanelProps = {
  listing: AdminListing;
  createdAtLabel: string;
};

export function AdminListingDetailPanel({ listing, createdAtLabel }: AdminListingDetailPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(listing.title);
  const [draftPrice, setDraftPrice] = useState(String(listing.price));
  const [draftCity, setDraftCity] = useState(listing.city);
  const [draftCondition, setDraftCondition] = useState(listing.condition === "Yeni" ? "Yeni" : "İşlənmiş");
  const [draftDescription, setDraftDescription] = useState(listing.description ?? "");

  const images = getListingImages(listing);

  const runAction = (action: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) => {
    setErrorMessage("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setErrorMessage(result.error ?? "Əməliyyat uğursuz oldu.");
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  };

  const resetDraft = () => {
    setDraftTitle(listing.title);
    setDraftPrice(String(listing.price));
    setDraftCity(listing.city);
    setDraftCondition(listing.condition === "Yeni" ? "Yeni" : "İşlənmiş");
    setDraftDescription(listing.description ?? "");
  };

  const saveDraft = () => {
    runAction(
      () =>
        updatePendingListing(listing.id, {
          title: draftTitle,
          price: draftPrice,
          city: draftCity,
          condition: draftCondition,
          description: draftDescription,
        }),
      () => setEditOpen(false),
    );
  };

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          {images.length > 0 ? (
            images.slice(0, 4).map((image, index) => (
              <div key={`${image}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <ListingImage
                  src={image}
                  alt={`${listing.title} ${index + 1}`}
                  fallbackClass={LISTING_IMAGE_FALLBACK_CLASS}
                  fit="contain"
                />
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-6 text-sm text-brand-muted">
              Şəkil yoxdur
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Status: {listing.status}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-brand-text">{listing.title}</h2>
            <p className="mt-2 text-xl font-bold text-brand-primary">{formatListingPrice(listing.price)}</p>
          </div>

          {listing.status === "pending" ? (
            <div className="rounded-xl border border-brand-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-brand-text">Pending redaktə</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (editOpen) resetDraft();
                    setEditOpen((value) => !value);
                  }}
                  className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-semibold text-brand-primary"
                >
                  {editOpen ? "Bağla" : "Redaktə et"}
                </button>
              </div>

              {editOpen ? (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveDraft();
                  }}
                >
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-text" htmlFor="admin-title">
                      Başlıq
                    </label>
                    <input
                      id="admin-title"
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-text" htmlFor="admin-price">
                        Qiymət
                      </label>
                      <input
                        id="admin-price"
                        type="number"
                        min="1"
                        value={draftPrice}
                        onChange={(event) => setDraftPrice(event.target.value)}
                        className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-text" htmlFor="admin-city">
                        Şəhər
                      </label>
                      <select
                        id="admin-city"
                        value={draftCity}
                        onChange={(event) => setDraftCity(event.target.value)}
                        className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
                      >
                        {AZERBAIJAN_CITY_OPTIONS.map((city) => (
                          <option key={city.slug} value={city.value}>
                            {city.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-text" htmlFor="admin-condition">
                        Vəziyyət
                      </label>
                      <select
                        id="admin-condition"
                        value={draftCondition}
                        onChange={(event) => setDraftCondition(event.target.value)}
                        className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
                      >
                        <option value="Yeni">Yeni</option>
                        <option value="İşlənmiş">İşlənmiş</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-text" htmlFor="admin-description">
                      Təsvir
                    </label>
                    <textarea
                      id="admin-description"
                      value={draftDescription}
                      onChange={(event) => setDraftDescription(event.target.value)}
                      rows={9}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Yadda saxla
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={resetDraft}
                      className="rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text disabled:opacity-70"
                    >
                      Sıfırla
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}

          <dl className="grid gap-2 text-sm text-brand-muted">
            <div>
              <dt className="font-semibold text-brand-text">Kateqoriya</dt>
              <dd>{dbCategoryToDisplay(listing.category)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-brand-text">Şəhər</dt>
              <dd>{listing.city}</dd>
            </div>
            {listing.condition ? (
              <div>
                <dt className="font-semibold text-brand-text">Vəziyyət</dt>
                <dd>{listing.condition}</dd>
              </div>
            ) : null}
            {listing.contact_phone ? (
              <div>
                <dt className="font-semibold text-brand-text">Telefon</dt>
                <dd>{listing.contact_phone}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-semibold text-brand-text">Yaradılma</dt>
              <dd>{createdAtLabel}</dd>
            </div>
          </dl>

          {listing.description ? (
            <div className="rounded-xl border border-brand-border bg-brand-surface/70 p-4">
              <h3 className="text-sm font-bold text-brand-text">Təsvir</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">
                {listing.description}
              </p>
            </div>
          ) : null}

          {listing.rejected_reason ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Rədd səbəbi:</strong> {listing.rejected_reason}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {listing.status === "pending" ? (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => approveListing(listing.id))}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Təsdiqlə
                </button>
                <input
                  type="text"
                  placeholder="Rədd səbəbi"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="min-w-[200px] flex-1 rounded-xl border border-brand-border px-3 py-2.5 text-sm"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => rejectListing(listing.id, rejectReason))}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-70"
                >
                  Rədd et
                </button>
              </>
            ) : null}

            {listing.status === "active" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction(() => markListingSold(listing.id))}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-border px-4 py-2.5 text-sm font-semibold disabled:opacity-70"
              >
                Satıldı et
              </button>
            ) : null}

            {listing.status !== "archived" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction(() => archiveListing(listing.id))}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-border px-4 py-2.5 text-sm font-semibold disabled:opacity-70"
              >
                Arxivlə
              </button>
            ) : null}

            {listing.slug && (listing.status === "active" || listing.status === "sold") ? (
              <Link
                href={`/elanlar/${listing.slug}`}
                className="inline-flex items-center justify-center rounded-xl border border-brand-border px-4 py-2.5 text-sm font-semibold text-brand-primary"
              >
                İctimai səhifəyə bax
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
