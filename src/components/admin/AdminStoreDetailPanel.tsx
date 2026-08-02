"use client";

import { Archive, Check, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  adminAssignStoreOwner,
  adminApproveClaimRequest,
  adminArchiveStore,
  adminAttachListingToStore,
  adminDetachListingFromStore,
  adminFindStoreOwnerCandidateByPhone,
  adminGenerateClaimCode,
  adminRejectClaimRequest,
  adminRevokeStoreOwner,
  adminTransferStoreOwner,
  adminUpdateStore,
} from "@/app/admin/stores/actions";
import { StoreStatusBadge } from "@/components/admin/AdminStoresPanel";
import { buildStoreOwnerMessage, CLAIM_REQUEST_STATUS_SHORT } from "@/lib/stores/store-copy";
import type { AdminClaimRequest, AdminStoreOwnerSummary } from "@/lib/stores/stores";
import { readStoreMapFieldsFromForm } from "@/lib/stores/store-map-fields";
import type { LiveListing } from "@/types/live-listing";
import type { Store } from "@/types/store";

const inputClass =
  "w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/70 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20";

const sectionClass = "space-y-4 rounded-2xl border border-brand-border/90 bg-white p-5 sm:p-6";

type OwnerCandidate = {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Kopyalandı" : label}
    </button>
  );
}

type AdminStoreDetailPanelProps = {
  store: Store;
  claimRequests: AdminClaimRequest[];
  storeListings: LiveListing[];
  currentOwner: AdminStoreOwnerSummary | null;
};

export function AdminStoreDetailPanel({
  store,
  claimRequests,
  storeListings,
  currentOwner,
}: AdminStoreDetailPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [claimCode, setClaimCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [attachListingId, setAttachListingId] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerCandidate, setOwnerCandidate] = useState<OwnerCandidate | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [isEditingStoreInfo, setIsEditingStoreInfo] = useState(false);

  const run = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    successText?: string,
    onSuccess?: () => void,
  ) => {
    setErrorMessage("");
    setSuccessMessage("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setErrorMessage(result.error ?? "Əməliyyat uğursuz oldu.");
        return;
      }
      if (successText) setSuccessMessage(successText);
      onSuccess?.();
      router.refresh();
    });
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      setErrorMessage("Mağaza adı boş ola bilməz.");
      return;
    }

    run(
      () =>
        adminUpdateStore(store.id, {
          name,
          category: String(data.get("category") ?? "").trim(),
          city: String(data.get("city") ?? "").trim(),
          contactPhone: String(data.get("contactPhone") ?? "").trim(),
          whatsappPhone: String(data.get("whatsappPhone") ?? "").trim(),
          description: String(data.get("description") ?? "").trim(),
          ...readStoreMapFieldsFromForm(data),
      }),
      "Mağaza yeniləndi.",
      () => setIsEditingStoreInfo(false),
    );
  };

  const handleGenerateCode = () => {
    setErrorMessage("");
    setSuccessMessage("");
    startTransition(async () => {
      const result = await adminGenerateClaimCode(store.id, 14);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      setClaimCode({ code: result.claimCode, expiresAt: result.expiresAt });
    });
  };

  const handleAttach = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = attachListingId.trim();
    if (!id) return;
    run(() => adminAttachListingToStore(store.id, id), "Elan mağazaya bağlandı.");
    setAttachListingId("");
  };

  const handleFindOwner = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setOwnerCandidate(null);
    startTransition(async () => {
      const result = await adminFindStoreOwnerCandidateByPhone(ownerPhone);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      setOwnerCandidate(result.user);
    });
  };

  const handleAssignOwner = () => {
    if (!ownerCandidate) return;
    if (currentOwner) {
      if (
        !confirm(
          `Sahibliyi ötürmək istədiyinizə əminsiniz?\n\nKöhnə owner: ${currentOwner.user_id}\nYeni owner: ${ownerCandidate.id}\nStore: ${store.id}`,
        )
      ) {
        return;
      }
      run(
        () => adminTransferStoreOwner(store.id, ownerCandidate.id),
        "Mağaza sahibliyi ötürüldü.",
      );
      setOwnerCandidate(null);
      return;
    }

    run(
      () => adminAssignStoreOwner(store.id, ownerCandidate.id),
      "Mağaza sahibi əlavə edildi.",
    );
    setOwnerCandidate(null);
  };

  const handleArchiveStore = () => {
    if (
      !confirm(
        `Mağaza arxivlənsin? ${storeListings.length} bağlı elan deaktiv ediləcək. Yazışma və audit tarixçəsi qorunacaq.`,
      )
    ) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    startTransition(async () => {
      const result = await adminArchiveStore(store.id);
      if (!result.ok) {
        setErrorMessage(result.error ?? "Mağaza arxivlənmədi.");
        return;
      }
      router.replace("/admin/stores?status=suspended");
      router.refresh();
    });
  };

  const pendingRequests = claimRequests.filter((r) => r.status === "pending");
  const otherRequests = claimRequests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
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

      {/* Kod / status paneli */}
      <div className={sectionClass}>
        <div className="flex flex-wrap items-center gap-3">
          <StoreStatusBadge status={store.status} />
          <span className="font-mono text-sm font-bold text-brand-text">{store.store_code}</span>
          <CopyButton value={store.store_code} label="Kodu kopyala" />
          <CopyButton value={buildStoreOwnerMessage(store.store_code)} label="Sahib mesajını kopyala" />
          <Link
            href={`/stores/${store.slug}`}
            className="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
          >
            Public səhifə
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-brand-border/70 pt-4">
          <button
            type="button"
            disabled={isPending || store.status === "suspended"}
            onClick={handleGenerateCode}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/30 bg-brand-primary-light px-4 py-2 text-sm font-semibold text-brand-primary-dark transition-colors hover:border-brand-primary/50 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Claim kodu yarat (14 gün)
          </button>

          {store.owner_id || currentOwner ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (confirm("Sahiblik geri alınsın? Mağaza 'Sahibsiz' statusuna qayıdacaq.")) {
                  run(() => adminRevokeStoreOwner(store.id, undefined, "unclaimed"), "Sahiblik geri alındı.");
                }
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 disabled:opacity-60"
            >
              Sahibliyi geri al
            </button>
          ) : null}

          {store.status !== "suspended" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleArchiveStore}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Mağazanı arxivlə
            </button>
          ) : null}
        </div>

        {claimCode ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-brand-text">
              Claim kodu (yalnız BİR DƏFƏ göstərilir):{" "}
              <span className="font-mono text-base">{claimCode.code}</span>
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              Bitmə tarixi: {new Date(claimCode.expiresAt).toLocaleDateString("az-Latn-AZ")}
            </p>
            <div className="mt-2">
              <CopyButton value={claimCode.code} label="Claim kodunu kopyala" />
            </div>
          </div>
        ) : null}
      </div>

      {/* Admin owner assignment */}
      <div className={sectionClass}>
        <div>
          <h2 className="text-lg font-bold text-brand-text">Mağaza sahibi</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Birinci mağaza claim flow ilə bağlanır. İkinci və sonrakı mağazalar yalnız admin tərəfindən mövcud
            istifadəçi ID-sinə bağlanır.
          </p>
        </div>

        <div className="rounded-xl border border-brand-border bg-brand-surface/40 p-4">
          <p className="text-xs font-semibold uppercase text-brand-muted">Cari owner</p>
          {currentOwner ? (
            <div className="mt-1 space-y-1 text-sm">
              <p className="font-semibold text-brand-text">
                {currentOwner.display_name || currentOwner.email || currentOwner.phone || "Adsız istifadəçi"}
              </p>
              <p className="font-mono text-xs text-brand-muted">{currentOwner.user_id}</p>
            </div>
          ) : (
            <p className="mt-1 text-sm font-semibold text-brand-muted">Owner yoxdur.</p>
          )}
        </div>

        <form onSubmit={handleFindOwner} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">İstifadəçi telefonu</span>
            <input
              value={ownerPhone}
              onChange={(event) => setOwnerPhone(event.target.value)}
              placeholder="051 471 11 18"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={isPending || !ownerPhone.trim()}
            className="self-end rounded-xl border border-brand-primary/30 bg-brand-primary-light px-4 py-2.5 text-sm font-semibold text-brand-primary-dark transition-colors hover:border-brand-primary/50 disabled:opacity-60"
          >
            Tap
          </button>
        </form>

        {ownerCandidate ? (
          <div className="rounded-xl border border-brand-border bg-brand-surface/50 p-4">
            <p className="text-sm font-semibold text-brand-text">Təsdiq ediləcək rol: Mağaza sahibi</p>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-brand-muted">User ID</dt>
                <dd className="font-mono text-xs text-brand-text">{ownerCandidate.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-brand-muted">Store ID</dt>
                <dd className="font-mono text-xs text-brand-text">{store.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-brand-muted">Telefon</dt>
                <dd className="font-semibold text-brand-text">{ownerCandidate.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-brand-muted">İstifadəçi</dt>
                <dd className="font-semibold text-brand-text">
                  {ownerCandidate.displayName || ownerCandidate.email || "Adsız istifadəçi"}
                </dd>
              </div>
            </dl>
            {currentOwner ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                Bu əməliyyat mövcud owner access-i yeni istifadəçiyə ötürəcək. Elanlar store_id ilə qalacaq.
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleAssignOwner}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  currentOwner
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-brand-primary hover:bg-brand-primary-dark"
                }`}
              >
                {currentOwner ? "Sahibliyi ötür" : "Mağaza sahibi kimi əlavə et"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setOwnerCandidate(null)}
                className="rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-60"
              >
                Ləğv et
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Müraciətlər */}
      <div className={sectionClass}>
        <h2 className="text-lg font-bold text-brand-text">Sahiblik müraciətləri</h2>

        {claimRequests.length === 0 ? (
          <p className="text-sm text-brand-muted">Müraciət yoxdur.</p>
        ) : (
          <div className="space-y-3">
            {[...pendingRequests, ...otherRequests].map((request) => (
              <div key={request.id} className="rounded-xl border border-brand-border/80 bg-brand-surface/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-brand-text">
                      {request.requester_name || request.requester_email || request.requested_by}
                    </p>
                    <p className="mt-0.5 text-xs text-brand-muted">
                      {new Date(request.created_at).toLocaleString("az-Latn-AZ")}
                      {request.submitted_phone ? ` · ${request.submitted_phone}` : ""}
                      {request.claim_code_id ? " · Claim kodu ilə" : " · Kodsuz"}
                    </p>
                  </div>
                  <span className="rounded-full border border-brand-border bg-white px-2.5 py-0.5 text-xs font-semibold text-brand-muted">
                    {CLAIM_REQUEST_STATUS_SHORT[request.status] ?? request.status}
                  </span>
                </div>

                {request.submitted_note ? (
                  <p className="mt-2 text-sm text-brand-muted">Qeyd: {request.submitted_note}</p>
                ) : null}
                {request.evidence_url ? (
                  <p className="mt-1 text-sm">
                    <a
                      href={request.evidence_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-semibold text-brand-primary hover:text-brand-primary-dark"
                    >
                      Sübut linki
                    </a>
                  </p>
                ) : null}
                {request.admin_note ? (
                  <p className="mt-1 text-xs text-brand-muted">Admin qeydi: {request.admin_note}</p>
                ) : null}

                {request.status === "pending" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        run(() => adminApproveClaimRequest(request.id), "Müraciət təsdiqləndi.")
                      }
                      className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-60"
                    >
                      Təsdiqlə
                    </button>
                    <input
                      value={rejectNotes[request.id] ?? ""}
                      onChange={(e) =>
                        setRejectNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                      }
                      placeholder="Rədd səbəbi (istəyə görə)"
                      className="w-56 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        run(
                          () => adminRejectClaimRequest(request.id, rejectNotes[request.id]),
                          "Müraciət rədd edildi.",
                        )
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 disabled:opacity-60"
                    >
                      Rədd et
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mağaza elanları */}
      <div className={sectionClass}>
        <h2 className="text-lg font-bold text-brand-text">Mağaza elanları ({storeListings.length})</h2>

        <form onSubmit={handleAttach} className="flex flex-wrap items-center gap-2">
          <input
            value={attachListingId}
            onChange={(e) => setAttachListingId(e.target.value)}
            placeholder="Elan ID (uuid)"
            className="w-72 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={isPending || !attachListingId.trim()}
            className="rounded-xl border border-brand-primary/30 bg-brand-primary-light px-4 py-2 text-sm font-semibold text-brand-primary-dark transition-colors hover:border-brand-primary/50 disabled:opacity-60"
          >
            Elanı bağla
          </button>
        </form>

        {storeListings.length === 0 ? (
          <p className="text-sm text-brand-muted">Bu mağazaya bağlı elan yoxdur.</p>
        ) : (
          <ul className="divide-y divide-brand-border/70 rounded-xl border border-brand-border/80">
            {storeListings.map((listing) => (
              <li key={listing.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/listings/${listing.id}`}
                    className="text-sm font-semibold text-brand-text hover:text-brand-primary"
                  >
                    {listing.title}
                  </Link>
                  <p className="text-xs text-brand-muted">
                    {listing.status} · {listing.city}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(() => adminDetachListingFromStore(store.id, listing.id), "Elan ayrıldı.")
                  }
                  className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  Ayır
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Redaktə */}
      <section className={sectionClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-text">Mağaza məlumatları</h2>
          {!isEditingStoreInfo ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsEditingStoreInfo(true)}
              className="rounded-xl border border-brand-primary/30 bg-brand-primary-light px-4 py-2 text-sm font-semibold text-brand-primary-dark transition-colors hover:border-brand-primary/50 disabled:opacity-60"
            >
              Düzəlt
            </button>
          ) : null}
        </div>

        {!isEditingStoreInfo ? (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div className="border-b border-brand-border/70 pb-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-brand-muted">Mağaza adı</dt>
              <dd className="mt-1 font-semibold text-brand-text">{store.name}</dd>
            </div>
            <div className="border-b border-brand-border/70 pb-3">
              <dt className="text-xs font-semibold uppercase text-brand-muted">Kateqoriya</dt>
              <dd className="mt-1 font-semibold text-brand-text">{store.category || "-"}</dd>
            </div>
            <div className="border-b border-brand-border/70 pb-3">
              <dt className="text-xs font-semibold uppercase text-brand-muted">Şəhər</dt>
              <dd className="mt-1 font-semibold text-brand-text">{store.city || "-"}</dd>
            </div>
            <div className="border-b border-brand-border/70 pb-3">
              <dt className="text-xs font-semibold uppercase text-brand-muted">Əlaqə telefonu</dt>
              <dd className="mt-1 font-semibold text-brand-text">{store.contact_phone || "-"}</dd>
            </div>
            <div className="border-b border-brand-border/70 pb-3">
              <dt className="text-xs font-semibold uppercase text-brand-muted">WhatsApp</dt>
              <dd className="mt-1 font-semibold text-brand-text">{store.whatsapp_phone || "-"}</dd>
            </div>
            <div className="border-b border-brand-border/70 pb-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-brand-muted">Ünvan</dt>
              <dd className="mt-1 font-semibold text-brand-text">{store.address || "-"}</dd>
            </div>
            <div className="border-b border-brand-border/70 pb-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-brand-muted">Xəritə linki</dt>
              <dd className="mt-1 break-all font-semibold text-brand-text">{store.map_url || "-"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-brand-muted">Təsvir</dt>
              <dd className="mt-1 whitespace-pre-wrap font-semibold text-brand-text">{store.description || "-"}</dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-brand-text">Mağaza adı *</span>
                <input name="name" required maxLength={120} defaultValue={store.name} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-brand-text">Kateqoriya</span>
                <input name="category" maxLength={80} defaultValue={store.category ?? ""} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-brand-text">Şəhər</span>
                <input name="city" maxLength={80} defaultValue={store.city ?? ""} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-brand-text">Əlaqə telefonu</span>
                <input name="contactPhone" maxLength={30} defaultValue={store.contact_phone ?? ""} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-brand-text">WhatsApp</span>
                <input name="whatsappPhone" maxLength={30} defaultValue={store.whatsapp_phone ?? ""} className={inputClass} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-brand-text">Ünvan</span>
                <input name="address" maxLength={200} defaultValue={store.address ?? ""} className={inputClass} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                  Xəritə linki{" "}
                  <span className="font-normal text-brand-muted">(istəyə görə — boşdursa, xəritə ünvandan qurulur)</span>
                </span>
                <input
                  name="mapUrl"
                  type="url"
                  maxLength={500}
                  defaultValue={store.map_url ?? ""}
                  className={inputClass}
                  placeholder="https://maps.google.com/..."
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-brand-text">Təsvir</span>
                <textarea
                  name="description"
                  rows={3}
                  maxLength={2000}
                  defaultValue={store.description ?? ""}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-70"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Yadda saxla
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsEditingStoreInfo(false)}
                className="rounded-xl border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-muted transition-colors hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-60"
              >
                Ləğv et
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
