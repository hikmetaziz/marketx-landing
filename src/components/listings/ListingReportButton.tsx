"use client";

import { Flag, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { reportListing } from "@/app/listings/[slug]/actions";

type ListingReportButtonProps = {
  listingId: string;
};

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "incorrect_information", label: "Yanlış məlumat" },
  { value: "fraud", label: "Dələduzluq və ya şübhəli elan" },
  { value: "prohibited", label: "Qadağan olunmuş məhsul" },
  { value: "other", label: "Digər" },
] as const;

export function ListingReportButton({ listingId }: ListingReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]["value"]>("spam");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const close = () => {
    if (isPending) return;
    setOpen(false);
    setMessage("");
  };

  const submitReport = () => {
    setMessage("");
    startTransition(async () => {
      const result = await reportListing(listingId, reason, details);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setSubmitted(true);
      setOpen(false);
      setDetails("");
      setMessage("Şikayət göndərildi. Moderator komandası yoxlayacaq.");
    });
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
        {message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-brand-muted transition-colors hover:text-brand-primary"
      >
        <Flag className="h-4 w-4" />
        Elanı şikayət et
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 py-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-brand-text">Report listing</h2>
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                aria-label="Bağla"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-surface hover:text-brand-text disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-brand-text">
                Səbəb
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value as typeof reason)}
                  disabled={isPending}
                  className="mt-1.5 w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
                >
                  {REPORT_REASONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-brand-text">
                Qeyd <span className="font-medium text-brand-muted">(istəyə bağlı)</span>
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  disabled={isPending}
                  maxLength={1000}
                  rows={4}
                  placeholder="Əlavə məlumat"
                  className="mt-1.5 w-full resize-y rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
                />
              </label>

              {message ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {message}
                </p>
              ) : null}

              <button
                type="button"
                onClick={submitReport}
                disabled={isPending}
                className="btn-primary-premium inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                Göndər
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
