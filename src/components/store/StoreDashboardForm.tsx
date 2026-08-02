"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useTransition,
} from "react";

import { deleteMyStore, updateMyStore } from "@/app/account/store/actions";
import { readStoreMapFieldsFromForm } from "@/lib/stores/store-map-fields";
import type { Store } from "@/types/store";

const inputClass =
  "w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/70 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20";

type StoreFormValues = {
  name: string;
  city: string;
  contactPhone: string;
  whatsappPhone: string;
  address: string;
  mapUrl: string;
  description: string;
};

function getInitialValues(store: Store): StoreFormValues {
  return {
    name: store.name,
    city: store.city ?? "",
    contactPhone: store.contact_phone ?? "",
    whatsappPhone: store.whatsapp_phone ?? "",
    address: store.address ?? "",
    mapUrl: store.map_url ?? "",
    description: store.description ?? "",
  };
}

function ReadonlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  const normalizedValue = value?.trim() || "—";

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-brand-muted">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-brand-text">
        {normalizedValue}
      </p>
    </div>
  );
}

export function StoreDashboardForm({
  store,
}: {
  store: Store;
}) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [values, setValues] = useState<StoreFormValues>(() =>
    getInitialValues(store),
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isEditing) {
      setValues(getInitialValues(store));
    }
  }, [isEditing, store]);


  useEffect(() => {
    if (!isDeleteModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) {
        setIsDeleteModalOpen(false);
        setDeleteError("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleteModalOpen, isDeleting]);

  const updateField = <K extends keyof StoreFormValues>(
    field: K,
    value: StoreFormValues[K],
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEdit = () => {
    setValues(getInitialValues(store));
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (isPending) return;

    setValues(getInitialValues(store));
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(false);
  };


  const openDeleteModal = () => {
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;

    setIsDeleteModalOpen(false);
    setDeleteError("");
  };

  const handleDeleteStore = () => {
    if (isDeleting) return;

    setDeleteError("");

    startDeleteTransition(async () => {
      try {
        const result = await deleteMyStore(store.id);

        if (!result.ok) {
          setDeleteError(result.error);
          return;
        }

        setIsDeleteModalOpen(false);
        window.location.replace("/account/store");
      } catch (error) {
        console.error("Store deletion failed", error);
        setDeleteError(
          "Mağaza silinmədi. Yenidən cəhd edin.",
        );
      }
    });
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!isEditing || isPending) return;

    setErrorMessage("");
    setSuccessMessage("");

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();

    if (!name) {
      setErrorMessage("Mağaza adı boş ola bilməz.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateMyStore(store.id, {
          name,
          description: String(
            data.get("description") ?? "",
          ),
          contactPhone: String(
            data.get("contactPhone") ?? "",
          ),
          whatsappPhone: String(
            data.get("whatsappPhone") ?? "",
          ),
          city: String(data.get("city") ?? ""),
          ...readStoreMapFieldsFromForm(data),
        });

        if (!result.ok) {
          setErrorMessage(result.error);
          return;
        }

        setSuccessMessage(
          "Mağaza məlumatları yeniləndi.",
        );
        setIsEditing(false);
        router.refresh();
      } catch (error) {
        console.error("Store update failed", error);

        setErrorMessage(
          "Mağaza məlumatları yenilənmədi. Yenidən cəhd edin.",
        );
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-brand-border/90 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-brand-text">
          Mağaza məlumatları
        </h2>

        {!isEditing ? (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:border-brand-primary/40 hover:bg-brand-primary-light/30"
          >
            <Pencil className="h-4 w-4" />
            Redaktə et
          </button>
        ) : null}
      </div>

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

      {!isEditing ? (
        <div className="grid gap-x-6 gap-y-5 rounded-xl border border-brand-border/70 bg-brand-surface/30 p-4 sm:grid-cols-2">
          <ReadonlyField
            label="Mağaza adı"
            value={values.name}
            className="sm:col-span-2"
          />

          <ReadonlyField
            label="Şəhər"
            value={values.city}
          />

          <ReadonlyField
            label="Əlaqə telefonu"
            value={values.contactPhone}
          />

          <ReadonlyField
            label="WhatsApp"
            value={values.whatsappPhone}
          />

          <ReadonlyField
            label="Ünvan"
            value={values.address}
          />

          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-brand-muted">
              Xəritə linki
            </p>

            {values.mapUrl.trim() ? (
              <a
                href={values.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all text-sm font-semibold text-brand-primary hover:underline"
              >
                {values.mapUrl}
              </a>
            ) : (
              <p className="mt-1 text-sm font-medium text-brand-text">
                Ünvan və şəhər əsasında avtomatik qurulur
              </p>
            )}
          </div>

          <ReadonlyField
            label="Təsvir"
            value={values.description}
            className="sm:col-span-2"
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                Mağaza adı *
              </span>

              <input
                name="name"
                required
                maxLength={120}
                value={values.name}
                onChange={(event) =>
                  updateField("name", event.target.value)
                }
                disabled={isPending}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                Şəhər
              </span>

              <input
                name="city"
                maxLength={80}
                value={values.city}
                onChange={(event) =>
                  updateField("city", event.target.value)
                }
                disabled={isPending}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                Əlaqə telefonu
              </span>

              <input
                name="contactPhone"
                maxLength={30}
                value={values.contactPhone}
                onChange={(event) =>
                  updateField(
                    "contactPhone",
                    event.target.value,
                  )
                }
                disabled={isPending}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                WhatsApp
              </span>

              <input
                name="whatsappPhone"
                maxLength={30}
                value={values.whatsappPhone}
                onChange={(event) =>
                  updateField(
                    "whatsappPhone",
                    event.target.value,
                  )
                }
                disabled={isPending}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                Ünvan
              </span>

              <input
                name="address"
                maxLength={200}
                value={values.address}
                onChange={(event) =>
                  updateField("address", event.target.value)
                }
                disabled={isPending}
                className={inputClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                Xəritə linki{" "}
                <span className="font-normal text-brand-muted">
                  (istəyə görə — boşdursa, xəritə ünvandan
                  qurulur)
                </span>
              </span>

              <input
                name="mapUrl"
                type="url"
                maxLength={500}
                value={values.mapUrl}
                onChange={(event) =>
                  updateField("mapUrl", event.target.value)
                }
                disabled={isPending}
                className={inputClass}
                placeholder="https://maps.google.com/..."
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">
                Təsvir
              </span>

              <textarea
                name="description"
                rows={4}
                maxLength={2000}
                value={values.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value,
                  )
                }
                disabled={isPending}
                className={`${inputClass} resize-y`}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-xl border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ləğv et
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              {isPending
                ? "Yadda saxlanılır..."
                : "Yadda saxla"}
            </button>
          </div>
        </>
      )}

      {!isEditing ? (
        <div className="border-t border-red-100 pt-5">
          <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-red-800">
                Təhlükəli əməliyyat
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Mağaza deaktiv ediləcək və mağaza idarəetmə girişiniz bağlanacaq. Mağazaya bağlı elanlar silinməyəcək.
              </p>
            </div>

            <button
              type="button"
              onClick={openDeleteModal}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Mağazanı sil
            </button>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-store-title"
            aria-describedby="delete-store-description"
            className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </div>

            <h2
              id="delete-store-title"
              className="mt-4 text-lg font-bold text-brand-text"
            >
              Mağazanı silmək istədiyinizə əminsiniz?
            </h2>

            <p
              id="delete-store-description"
              className="mt-2 text-sm leading-6 text-brand-muted"
            >
              Bu əməliyyatdan sonra mağaza deaktiv ediləcək və mağaza idarəetmə girişiniz bağlanacaq. Mağazaya bağlı elanlar silinməyəcək.
            </p>

            {deleteError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {deleteError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                autoFocus
                className="rounded-xl border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface disabled:cursor-not-allowed disabled:opacity-60"
              >
                Yox
              </button>

              <button
                type="button"
                onClick={handleDeleteStore}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isDeleting ? "Silinir..." : "Hə, sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
