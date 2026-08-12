"use client";

import { Archive, Copy, ExternalLink, Flag, Loader2, MessageCircle, Pencil, Phone, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  archiveMyListing,
  deleteMyListing,
  duplicateMyListing,
} from "@/app/account/listings/actions";
import { LiveListingFavoriteButton } from "@/components/listings/LiveListingFavoriteButton";
import { ListingPhoneReveal } from "@/components/listings/ListingPhoneReveal";
import { ListingReportButton } from "@/components/listings/ListingReportButton";
import { ListingShareButton } from "@/components/listings/ListingShareButton";
import { OpenInAppLink } from "@/components/listings/OpenInAppLink";
import { ListingMessageButton } from "@/components/messaging/ListingMessageButton";
import { getContactPhoneTelHref, normalizeContactPhone } from "@/lib/contact-phone";
import type { LiveListingDetailView } from "@/types/live-listing";

type ListingActionBarProps = {
  listing: LiveListingDetailView;
  isOwner: boolean;
  isAuthenticated: boolean;
  hasContactPhone: boolean;
  shareUrl: string;
};

const ownerButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-70";

const dangerButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 disabled:opacity-70";

const disabledContactButtonClass =
  "w-full cursor-not-allowed rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-sm font-semibold text-brand-muted";

export function ListingActionBar({
  listing,
  isOwner,
  isAuthenticated,
  hasContactPhone,
  shareUrl,
}: ListingActionBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<"archive" | "duplicate" | "delete" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const runOwnerAction = (
    action: "archive" | "duplicate" | "delete",
    callback: () => Promise<{ ok: true; listingId?: string } | { ok: false; error: string }>,
  ) => {
    setErrorMessage("");
    setActiveAction(action);
    startTransition(async () => {
      const result = await callback();
      setActiveAction(null);

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      if (action === "duplicate" && result.listingId) {
        router.push(`/account/listings/${result.listingId}/edit`);
        router.refresh();
        return;
      }

      router.push("/account/listings");
      router.refresh();
    });
  };

  const runArchive = () => {
    const confirmed = window.confirm(`"${listing.title}" elanı arxivlənsin?`);
    if (!confirmed) return;
    runOwnerAction("archive", () => archiveMyListing(listing.id));
  };

  const runDuplicate = () => {
    runOwnerAction("duplicate", () => duplicateMyListing(listing.id));
  };

  const runDelete = () => {
    const confirmed = window.confirm(`"${listing.title}" elanı silinsin? Elan ictimai səhifələrdən gizlənəcək.`);
    if (!confirmed) return;
    runOwnerAction("delete", () => deleteMyListing(listing.id));
  };

  if (isOwner) {
    return (
      <section className="space-y-3 rounded-2xl border border-brand-border/80 bg-brand-surface/50 p-4">
        {errorMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2">
          <Link href={`/account/listings/${listing.id}/edit`} className={ownerButtonClass}>
            <Pencil className="h-4 w-4" />
            Düzəliş et
          </Link>
          <ListingShareButton
            title={listing.title}
            price={listing.price}
            slug={listing.slug}
            shareUrl={shareUrl}
            variant="tertiary"
          />
          <button type="button" onClick={runDuplicate} disabled={isPending} className={ownerButtonClass}>
            {activeAction === "duplicate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Kopyala
          </button>
          <button type="button" onClick={runArchive} disabled={isPending} className={ownerButtonClass}>
            {activeAction === "archive" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Arxivlə
          </button>
          <button type="button" onClick={runDelete} disabled={isPending} className={dangerButtonClass}>
            {activeAction === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Elanı sil
          </button>
        </div>
      </section>
    );
  }

  const returnTo = pathname || `/elanlar/${listing.slug}`;
  const storePhone = listing.business_contact_phone ?? listing.store?.contact_phone ?? null;
  const storeWhatsApp =
    listing.business_contact_phone ?? listing.store?.whatsapp_phone ?? listing.store?.contact_phone ?? null;
  const storeWhatsAppHref = storeWhatsApp
    ? `https://wa.me/${normalizeContactPhone(storeWhatsApp)?.replace(/^\+/, "") ?? storeWhatsApp.replace(/\D/g, "")}`
    : null;

  return (
    <section className="space-y-3">
      <div className="space-y-3">
        <LiveListingFavoriteButton key={listing.id} listingId={listing.id} />
        <OpenInAppLink slug={listing.slug} />
        <div className="grid gap-2.5 md:grid-cols-2">
          <ListingMessageButton
            listingId={listing.id}
            storeId={listing.store_id ?? null}
            slug={listing.slug}
            status={listing.status}
            subject={listing.title}
          />
          {listing.store ? (
            <>
              {storePhone ? (
                <a
                  href={getContactPhoneTelHref(storePhone)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  <Phone className="h-4 w-4" />
                  Zəng et
                </a>
              ) : null}
              {storeWhatsAppHref ? (
                <a
                  href={storeWhatsAppHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              ) : null}
              {!storePhone && !storeWhatsAppHref ? (
                <button type="button" disabled className={disabledContactButtonClass}>
                  Əlaqə məlumatı mövcud deyil
                </button>
              ) : null}
              <Link
                href={`/stores/${listing.store.slug}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
              >
                <ExternalLink className="h-4 w-4" />
                Mağazaya bax
              </Link>
            </>
          ) : (
            <ListingPhoneReveal slug={listing.slug} status={listing.status} hasContactPhone={hasContactPhone} />
          )}
        </div>
        <ListingShareButton
          title={listing.title}
          price={listing.price}
          slug={listing.slug}
          shareUrl={shareUrl}
          variant="tertiary"
        />
      </div>

      {isAuthenticated ? (
        <ListingReportButton listingId={listing.id} />
      ) : (
        <Link
          href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-brand-muted transition-colors hover:text-brand-primary"
        >
          <Flag className="h-4 w-4" />
          Şikayət üçün daxil olun
        </Link>
      )}
    </section>
  );
}
