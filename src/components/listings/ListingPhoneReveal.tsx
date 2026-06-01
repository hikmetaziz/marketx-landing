"use client";

import { Phone } from "lucide-react";
import { useState } from "react";

import { revealListingPhone } from "@/app/listings/[slug]/actions";
import { CONTACT_PHONE_MASK_PREVIEW } from "@/lib/contact-phone";
import type { PublicListingStatus } from "@/types/live-listing";

const disabledButtonClass =
  "w-full cursor-not-allowed rounded-xl border border-brand-border bg-brand-surface px-4 py-3.5 text-sm font-semibold text-brand-muted";

type ListingPhoneRevealProps = {
  slug: string;
  status: PublicListingStatus;
  hasContactPhone: boolean;
};

export function ListingPhoneReveal({ slug, status, hasContactPhone }: ListingPhoneRevealProps) {
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [telHref, setTelHref] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  if (status === "sold") {
    return (
      <button type="button" disabled className={disabledButtonClass}>
        Bu elan satılıb
      </button>
    );
  }

  if (status !== "active") {
    return (
      <button type="button" disabled className={disabledButtonClass}>
        Əlaqə məlumatı mövcud deyil
      </button>
    );
  }

  if (!hasContactPhone || unavailable) {
    return (
      <button type="button" disabled className={disabledButtonClass}>
        {rateLimited
          ? "Çox tez-tez cəhd etdiniz. Bir az sonra yenidən yoxlayın."
          : unavailable
            ? "Əlaqə məlumatı mövcud deyil"
            : "Telefon nömrəsi yoxdur"}
      </button>
    );
  }

  if (revealedPhone && telHref) {
    return (
      <a
        href={telHref}
        className="btn-primary-premium flex w-full flex-col items-center justify-center gap-1 rounded-xl px-4 py-3.5 text-sm font-bold text-white"
      >
        <span className="inline-flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Zəng et
        </span>
        <span className="text-base font-extrabold tracking-wide">{revealedPhone}</span>
      </a>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={async () => {
          setLoading(true);
          try {
            const result = await revealListingPhone(slug);
            if (result.ok) {
              setRevealedPhone(result.phone);
              setTelHref(result.tel);
            } else if (result.reason === "rate_limited") {
              setRateLimited(true);
            } else {
              setUnavailable(true);
            }
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        className="btn-primary-premium flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white disabled:opacity-70"
      >
        <Phone className="h-4 w-4" />
        {loading ? "Yüklənir…" : "Nömrəni göstər"}
      </button>
      <p className="text-center text-xs tracking-wide text-brand-muted">{CONTACT_PHONE_MASK_PREVIEW}</p>
    </div>
  );
}
