"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useTransition,
} from "react";

import { deleteMyStore, updateMyStore } from "@/app/account/store/actions";
import { readStoreMapFieldsFromForm } from "@/lib/stores/store-map-fields";
import {
  removeUploadedStoreImages,
  STORE_IMAGE_ACCEPT,
  uploadStoreImage,
} from "@/lib/stores/store-images";
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

function StoreImageField({
  label,
  currentUrl,
  file,
  kind,
  disabled,
  onChange,
}: {
  label: string;
  currentUrl: string | null;
  file: File | null;
  kind: "logo" | "cover";
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  const isLogo = kind === "logo";

  return (
    <div className="rounded-xl border border-brand-border/80 p-3.5">
      <p className="text-sm font-semibold text-brand-text">{label}</p>
      <div
        className={`relative mt-2 overflow-hidden rounded-lg border border-brand-border bg-brand-surface/40 ${
          isLogo ? "h-28 w-28" : "h-32 w-full"
        }`}
      >
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt={`${label} önizləməsi`}
            fill
            sizes={isLogo ? "112px" : "(max-width: 767px) 100vw, 360px"}
            className={isLogo ? "bg-white object-contain" : "object-cover"}
          />
        ) : (
          <span className="flex h-full items-center justify-center px-3 text-center text-xs text-brand-muted">
            Şəkil əlavə edilməyib
          </span>
        )}
      </div>
      <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-primary transition-colors hover:border-brand-primary/40">
        {isLogo ? "Yeni logo seç" : "Yeni örtük seç"}
        <input
          type="file"
          accept={STORE_IMAGE_ACCEPT}
          disabled={disabled}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>
      {file ? (
        <p className="mt-2 truncate text-xs text-brand-muted" title={file.name}>
          {file.name}
        </p>
      ) : null}
    </div>
  );
}

export function StoreDashboardForm({
  store,
}: {
  store: Store;
}) {
  return <StoreDashboardFormContent key={store.id} store={store} />;
}

function StoreDashboardFormContent({
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

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
    setLogoFile(null);
    setCoverFile(null);
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (isPending) return;

    setValues(getInitialValues(store));
    setLogoFile(null);
    setCoverFile(null);
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
      const uploadedPaths: string[] = [];

      try {
        const logoUpload = logoFile
          ? await uploadStoreImage(store.id, "logo", logoFile)
          : null;
        if (logoUpload) uploadedPaths.push(logoUpload.path);

        const coverUpload = coverFile
          ? await uploadStoreImage(store.id, "cover", coverFile)
          : null;
        if (coverUpload) uploadedPaths.push(coverUpload.path);

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
          ...(logoUpload ? { logoUrl: logoUpload.publicUrl } : {}),
          ...(coverUpload ? { coverUrl: coverUpload.publicUrl } : {}),
        });

        if (!result.ok) {
          await removeUploadedStoreImages(uploadedPaths);
          setErrorMessage(result.error);
          return;
        }

        setLogoFile(null);
        setCoverFile(null);
        setSuccessMessage(
          "Mağaza məlumatları yeniləndi.",
        );
        setIsEditing(false);
        router.refresh();
      } catch (error) {
        await removeUploadedStoreImages(uploadedPaths);
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
      className="space-y-4 rounded-xl border border-brand-border/90 bg-white p-4 md:rounded-2xl md:p-6"
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
        <div className="grid gap-x-6 gap-y-4 rounded-xl border border-brand-border/70 bg-brand-surface/30 p-3.5 md:grid-cols-2 md:gap-y-5 md:p-4">
          <ReadonlyField
            label="Mağaza adı"
            value={values.name}
            className="md:col-span-2"
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

          <div className="md:col-span-2">
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
            className="md:col-span-2"
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <StoreImageField
              label="Logo"
              currentUrl={store.logo_url}
              file={logoFile}
              kind="logo"
              disabled={isPending}
              onChange={setLogoFile}
            />

            <StoreImageField
              label="Örtük şəkli"
              currentUrl={store.cover_url}
              file={coverFile}
              kind="cover"
              disabled={isPending}
              onChange={setCoverFile}
            />

            <label className="block md:col-span-2">
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

            <label className="block md:col-span-2">
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

            <label className="block md:col-span-2">
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

          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
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
        <div className="border-t border-red-100 pt-4 md:pt-5">
          <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/60 p-3.5 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
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
            className="w-full max-w-md rounded-xl border border-brand-border bg-white p-4 shadow-2xl md:rounded-2xl md:p-6"
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

            <div className="mt-5 flex flex-col-reverse gap-2 md:mt-6 md:flex-row md:justify-end">
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
