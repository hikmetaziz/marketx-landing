"use client";

import { Phone } from "lucide-react";
import { useState } from "react";

import { formatContactPhoneDisplay, getContactPhoneTelHref } from "@/lib/contact-phone";

type StorePhoneRevealProps = {
  phone: string;
  className?: string;
};

export function StorePhoneReveal({ phone, className }: StorePhoneRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const displayPhone = formatContactPhoneDisplay(phone);
  const telHref = getContactPhoneTelHref(phone);

  if (revealed) {
    return (
      <a
        href={telHref}
        className={
          className ??
          "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
        }
      >
        <Phone className="h-4 w-4" aria-hidden />
        <span>{displayPhone}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
      }
    >
      <Phone className="h-4 w-4" aria-hidden />
      <span>Zəng et</span>
    </button>
  );
}
