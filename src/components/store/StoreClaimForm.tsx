"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  cancelMyClaimRequest,
  submitStoreClaimRequest,
} from "@/app/account/store/actions";
import type { StoreClaimRequest } from "@/types/store";

const inputClass =
  "w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/70 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20";

const STORE_CLAIM_DRAFT_STORAGE_KEY = "marktx_store_claim_draft";
const STORE_CLAIM_DRAFT_MAX_AGE_MS = 5 * 60 * 1000;

type StoreClaimFormProps = {
  myRequests: StoreClaimRequest[];
};

type StoreClaimDraft = {
  storeCode?: string;
  claimCode?: string;
  createdAt?: number;
};

type ClaimStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired";

function getClaimDisplay(status: ClaimStatus) {
  switch (status) {
    case "pending":
      return {
        label: "Gözləyir",
        description: "Müraciət admin yoxlamasındadır.",
        className: "bg-amber-50 text-amber-700",
      };

    case "approved":
      return {
        label: "Təsdiqlənib",
        description: "Müraciət təsdiqlənib.",
        className: "bg-emerald-50 text-emerald-700",
      };

    case "rejected":
      return {
        label: "Rədd edilib",
        description: "Müraciət təsdiqlənməyib.",
        className: "bg-red-50 text-red-700",
      };

    case "cancelled":
      return {
        label: "Ləğv edilib",
        description: "Müraciət ləğv edilib.",
        className: "bg-slate-100 text-slate-600",
      };

    case "expired":
      return {
        label: "Müddəti bitib",
        description: "Müraciətin təsdiq müddəti bitib.",
        className: "bg-slate-100 text-slate-600",
      };
  }
}

function formatClaimDate(value: string): string {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) {
    return datePart || value;
  }

  return `${day}.${month}.${year}`;
}

export function StoreClaimForm({ myRequests }: StoreClaimFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const storeCodeInputRef = useRef<HTMLInputElement>(null);
  const claimCodeInputRef = useRef<HTMLInputElement>(null);

  const hasPending = myRequests.some((request) => request.status === "pending");

  useEffect(() => {
    const raw = window.sessionStorage.getItem(
      STORE_CLAIM_DRAFT_STORAGE_KEY,
    );

    if (!raw) return;

    window.sessionStorage.removeItem(STORE_CLAIM_DRAFT_STORAGE_KEY);

    try {
      const draft = JSON.parse(raw) as StoreClaimDraft;
      const isFresh =
        typeof draft.createdAt === "number" &&
        Date.now() - draft.createdAt < STORE_CLAIM_DRAFT_MAX_AGE_MS;

      if (!isFresh) return;

      const storeCode =
        typeof draft.storeCode === "string" ? draft.storeCode.trim() : "";
      const claimCode =
        typeof draft.claimCode === "string" ? draft.claimCode.trim() : "";

      if (storeCodeInputRef.current && storeCode) {
        storeCodeInputRef.current.value = storeCode;
      }

      if (claimCodeInputRef.current && claimCode) {
        claimCodeInputRef.current.value = claimCode;
      }
    } catch {
      // Yanlış və ya köhnə məlumat nəzərə alınmır.
    }
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const storeCode = String(data.get("storeCode") ?? "").trim();
    const claimCode = String(data.get("claimCode") ?? "").trim();

    if (!storeCode) {
      setErrorMessage("Mağaza kodunu daxil edin.");
      return;
    }

    if (!claimCode) {
      setErrorMessage("Aktivasiya kodunu daxil edin.");
      return;
    }

    startTransition(async () => {
      const result = await submitStoreClaimRequest({
        storeCode,
        claimCode,
        phone: String(data.get("phone") ?? ""),
        note: String(data.get("note") ?? ""),
        evidenceUrl: String(data.get("evidenceUrl") ?? ""),
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage(result.message ?? "Mağaza hesabınıza bağlandı.");
      form.reset();
      window.location.replace("/account/store");
    });
  };

  const handleCancel = (requestId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await cancelMyClaimRequest(requestId);

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage("Müraciət ləğv edildi.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">
              Mağaza kodu *
            </span>
            <input
              ref={storeCodeInputRef}
              name="storeCode"
              required
              maxLength={30}
              placeholder="MX-STORE-000001"
              className={`${inputClass} font-mono uppercase`}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">
              Aktivasiya kodu *
            </span>
            <input
              ref={claimCodeInputRef}
              name="claimCode"
              type="password"
              autoComplete="one-time-code"
              required
              maxLength={30}
              className={`${inputClass} font-mono uppercase`}
            />
          </label>
        </div>

        <details className="mt-4 rounded-xl border border-brand-border/80 bg-slate-50/70">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-brand-text">
            Əlavə məlumat{" "}
            <span className="font-normal text-brand-muted">(istəyə görə)</span>
          </summary>

          <div className="space-y-4 border-t border-brand-border/80 p-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                Telefon
              </span>
              <input
                name="phone"
                maxLength={30}
                placeholder="+994 50 000 00 00"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                Qeyd
              </span>
              <textarea
                name="note"
                rows={3}
                maxLength={1000}
                placeholder="Mağazanın sizə aid olduğunu təsdiqləyən qısa məlumat"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                Sübut linki
              </span>
              <input
                name="evidenceUrl"
                type="url"
                maxLength={300}
                placeholder="https://"
                className={inputClass}
              />
            </label>
          </div>
        </details>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Mağazanı aktivləşdir
          </button>

          {hasPending ? (
            <p className="text-xs leading-relaxed text-brand-muted">
              Gözləyən müraciətiniz var. Aktivasiya kodu göndərilibsə, kodu
              daxil edib davam edin.
            </p>
          ) : null}
        </div>
      </form>

      {myRequests.length > 0 ? (
        <details
          open={hasPending}
          className="rounded-2xl border border-brand-border bg-white shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <span className="font-semibold text-brand-text">
              Müraciət tarixçəsi
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {myRequests.length}
            </span>
          </summary>

          <div className="space-y-3 border-t border-brand-border p-5 sm:p-6">
            {myRequests.map((request) => {
              const display = getClaimDisplay(
                request.status as ClaimStatus,
              );

              return (
                <article
                  key={request.id}
                  className="rounded-xl border border-brand-border bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-brand-text">
                        {request.submitted_store_code}
                      </p>
                      <p className="mt-1 text-xs text-brand-muted">
                        {formatClaimDate(request.created_at)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${display.className}`}
                    >
                      {display.label}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-brand-muted">
                    {display.description}
                  </p>

                  {request.admin_note ? (
                    <p className="mt-1 text-xs text-brand-muted">
                      Qeyd: {request.admin_note}
                    </p>
                  ) : null}

                  {request.status === "pending" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleCancel(request.id)}
                      className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 disabled:opacity-60"
                    >
                      Müraciəti ləğv et
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}