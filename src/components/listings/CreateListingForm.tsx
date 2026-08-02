"use client";

import { ImagePlus, Loader2, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { attachListingImages, createListing } from "@/app/create-listing/actions";
import { TurnstileWidget } from "@/components/captcha/TurnstileWidget";
import { DynamicAttributeFields } from "@/components/listings/DynamicAttributeFields";
import { MAX_LISTING_IMAGES } from "@/constants/listings";
import { AZERBAIJAN_CITY_OPTIONS } from "@/lib/constants/cities";
import { isTurnstileConfigured } from "@/lib/captcha/turnstile-config";
import { isValidContactPhone } from "@/lib/contact-phone";
import { ListingImage } from "@/components/ui/ListingImage";
import { LISTING_IMAGE_FALLBACK_CLASS } from "@/lib/listings/listing-images";
import {
  isSupportedListingImageFile,
  LISTING_IMAGE_ACCEPT,
  uploadListingImages,
  type ListingImageUploadStage,
} from "@/lib/listings/upload";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import type { CategorySchemaSnapshot } from "@/lib/category-schema/schema-contract";
import {
  getCategorySchemaSelection,
  getResolvedPhotoLimit,
} from "@/lib/category-schema/resolve-category-schema";
import { isSyntheticCanonicalSubcategoryId } from "@/lib/taxonomy/marktx-taxonomy";
import { getAttributeDefinitions } from "@/lib/taxonomy/listing-taxonomy-utils";
import type { ListingAttributeValues, ListingTaxonomy } from "@/lib/taxonomy/listing-taxonomy-types";

type ImagePreview = {
  id: string;
  file: File;
  url: string;
};

type UploadProgressItem = {
  id: string;
  name: string;
  stage: ListingImageUploadStage | "pending";
  percent: number;
  message?: string;
};

type CreateListingFormProps = {
  taxonomy: ListingTaxonomy;
  categorySchemaSnapshot: CategorySchemaSnapshot;
  storeAccess: {
    storeId: string;
    storeName: string | null;
  };
};

const selectClass =
  "w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15";

function getUploadStageLabel(stage: UploadProgressItem["stage"]) {
  if (stage === "compressing") return "Sıxılır";
  if (stage === "uploading") return "Yüklənir";
  if (stage === "uploaded") return "Yükləndi";
  if (stage === "error") return "Xəta";
  return "Gözləyir";
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CreateListingForm({ taxonomy, categorySchemaSnapshot, storeAccess }: CreateListingFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { supabase, user, loading: authLoading } = useAuthUser();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [attributes, setAttributes] = useState<ListingAttributeValues>({});
  const [city, setCity] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [uploadProgressItems, setUploadProgressItems] = useState<UploadProgressItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileEnabled = isTurnstileConfigured();

  const selectedCategory = useMemo(
    () => taxonomy.categories.find((item) => item.id === categoryId) ?? null,
    [categoryId, taxonomy.categories],
  );
  const selectedSubcategories = selectedCategory?.subcategories ?? [];
  const attributeDefinitions = useMemo(
    () =>
      getAttributeDefinitions(
        taxonomy,
        categoryId || null,
        subcategoryId || null,
        categorySchemaSnapshot,
        attributes,
      ),
    [attributes, categoryId, categorySchemaSnapshot, subcategoryId, taxonomy],
  );
  const maxListingImages = useMemo(
    () =>
      getResolvedPhotoLimit(
        taxonomy,
        categoryId || null,
        subcategoryId || null,
        categorySchemaSnapshot,
        MAX_LISTING_IMAGES,
      ),
    [categoryId, categorySchemaSnapshot, subcategoryId, taxonomy],
  );
  const uploadProgressPercent = useMemo(() => {
    if (uploadProgressItems.length === 0) return 0;
    const total = uploadProgressItems.reduce((sum, item) => sum + item.percent, 0);
    return Math.round(total / uploadProgressItems.length);
  }, [uploadProgressItems]);

  const handleCategoryChange = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setSubcategoryId("");
    setAttributes({});
  };

  const handleSubcategoryChange = (nextSubcategoryId: string) => {
    setSubcategoryId(nextSubcategoryId);
    setAttributes({});
  };

  const handleAttributeChange = (key: string, value: ListingAttributeValues[string]) => {
    setAttributes((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "brand" && prev.brand !== value) {
        delete next.model;
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [images]);

  const clearForm = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setTitle("");
    setPrice("");
    setCategoryId("");
    setSubcategoryId("");
    setAttributes({});
    setCity("");
    setIsNew(false);
    setDeliveryAvailable(false);
    setContactPhone("");
    setDescription("");
    setImages([]);
    setUploadProgressItems([]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleAddImages = (fileList: FileList | null) => {
    if (!fileList) return;

    const remaining = maxListingImages - images.length;
    if (remaining <= 0) {
      setErrorMessage(`Maksimum ${maxListingImages} şəkil əlavə edə bilərsiniz.`);
      return;
    }

    const selectedFiles = Array.from(fileList);
    const supportedFiles = selectedFiles.filter(isSupportedListingImageFile);
    const nextFiles = supportedFiles.slice(0, remaining);
    const rejectedCount = selectedFiles.length - supportedFiles.length;
    const skippedByLimit = Math.max(0, supportedFiles.length - remaining);

    if (nextFiles.length === 0) {
      setErrorMessage("Yalnız JPG, PNG və ya WebP şəkil faylları seçin.");
      return;
    }

    const warnings: string[] = [];
    if (rejectedCount > 0) {
      warnings.push(`${rejectedCount} fayl formatı dəstəklənmir.`);
    }
    if (skippedByLimit > 0) {
      warnings.push(`Limitə görə ${skippedByLimit} şəkil əlavə olunmadı.`);
    }

    setErrorMessage(warnings.join(" "));
    setUploadProgressItems([]);
    setImages((prev) => [
      ...prev,
      ...nextFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeImage = (id: string) => {
    setUploadProgressItems([]);
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setUploadProgressItems([]);

    if (!title.trim() || !price || !categoryId || !city) {
      setErrorMessage("Başlıq, qiymət, kateqoriya və şəhər mütləq doldurulmalıdır.");
      return;
    }

    const schemaSelection = getCategorySchemaSelection(
      taxonomy,
      categoryId,
      subcategoryId || null,
      categorySchemaSnapshot,
    );
    if (schemaSelection?.formSchema?.requires_subcategory && !subcategoryId) {
      setErrorMessage("Alt kateqoriya seçin.");
      return;
    }
    if (isSyntheticCanonicalSubcategoryId(subcategoryId)) {
      setErrorMessage(
        "Bu alt kateqoriya hələ bazada aktiv deyil. Əvvəl taxonomy seed staging DB-də tətbiq olunmalıdır.",
      );
      return;
    }

    const missingAttribute = attributeDefinitions.find((definition) => {
      const value = attributes[definition.key];
      return (
        definition.is_required &&
        (value === null ||
          value === undefined ||
          value === "" ||
          (Array.isArray(value) && value.length === 0))
      );
    });

    if (missingAttribute) {
      setErrorMessage(`${missingAttribute.label_az} sahəsini doldurun.`);
      return;
    }

    const priceNumber = Number(price);
    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
      setErrorMessage("Qiymət düzgün rəqəm olmalıdır.");
      return;
    }

    if (!isValidContactPhone(contactPhone)) {
      setErrorMessage("Telefon düzgün deyil. Nümunə: 050 123 45 67");
      return;
    }

    if (!user?.id) {
      setErrorMessage("Daxil olmamısınız.");
      return;
    }

    if (turnstileEnabled && !captchaToken) {
      setErrorMessage("Təhlükəsizlik yoxlamasını tamamlayın.");
      return;
    }

    setLoading(true);

    const createResult = await createListing(
      {
        title,
        price: priceNumber,
        storeId: storeAccess.storeId,
        categoryId,
        subcategoryId: subcategoryId || null,
        attributes,
        city,
        isNew,
        description,
        contactPhone,
        deliveryAvailable,
      },
      captchaToken,
    );

    if (!createResult.ok) {
      setLoading(false);
      setErrorMessage(createResult.error);
      return;
    }

    if (images.length > 0) {
      setUploadProgressItems(
        images.map((img) => ({
          id: img.id,
          name: img.file.name,
          stage: "pending",
          percent: 0,
        })),
      );

      const { urls, errors } = await uploadListingImages(
        user.id,
        createResult.listingId,
        images.map((img) => img.file),
        0,
        (progress) => {
          const target = images[progress.index];
          if (!target) return;

          setUploadProgressItems((prev) =>
            prev.map((item) => {
              if (item.id !== target.id) return item;

              const percent =
                progress.stage === "compressing"
                  ? 30
                  : progress.stage === "uploading"
                    ? 70
                    : 100;
              const sizes =
                progress.compressedBytes && progress.originalBytes
                  ? `${formatFileSize(progress.originalBytes)} → ${formatFileSize(progress.compressedBytes)}`
                  : undefined;

              return {
                ...item,
                stage: progress.stage,
                percent,
                message: progress.error ?? sizes,
              };
            }),
          );
        },
      );

      if (urls.length > 0) {
        const attachResult = await attachListingImages(createResult.listingId, urls);

        if (!attachResult.ok) {
          setLoading(false);
          setSuccessMessage(
            "Elan yaradıldı, amma şəkil linki yazılmadı. Moderator panelindən yoxlayın.",
          );
          return;
        }

        if (errors.length > 0) {
          setLoading(false);
          setSuccessMessage(
            `Elan yaradıldı. ${urls.length} şəkil yükləndi, ${errors.length} uğursuz oldu.`,
          );
          clearForm();
          return;
        }
      } else {
        setLoading(false);
        setSuccessMessage(
          "Elan yaradıldı, amma şəkillər yüklənmədi. Storage bucket «listing-images» yoxlayın.",
        );
        return;
      }
    }

    setLoading(false);
    clearForm();
    setSuccessMessage(
      images.length > 0
        ? `Elan və ${images.length} şəkil yoxlanışa göndərildi. Moderator təsdiqindən sonra görünəcək.`
        : "Elanınız yoxlanışa göndərildi. Moderator təsdiqindən sonra görünəcək.",
    );
  };

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <div className="card-premium rounded-2xl p-6 text-center hover:translate-y-0">
        <p className="text-sm text-brand-muted">Supabase konfiqurasiyası tapılmadı.</p>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="card-premium flex items-center justify-center gap-3 rounded-2xl p-10 hover:translate-y-0">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <span className="text-sm text-brand-muted">Yoxlanılır...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card-premium rounded-2xl p-6 text-center hover:translate-y-0">
        <p className="text-sm text-brand-muted">Sessiya tapılmadı.</p>
        <Link
          href="/login?returnTo=/elan-yarat&mode=register"
          className="btn-primary-premium mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        >
          Daxil ol
        </Link>
      </div>
    );
  }

  if (taxonomy.categories.length === 0) {
    return (
      <div className="card-premium rounded-2xl p-6 text-center hover:translate-y-0">
        <p className="text-sm text-brand-muted">
          Kateqoriya siyahısı yüklənmədi. Səhifəni yeniləyin və ya bir az sonra yenidən cəhd edin.
        </p>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="card-premium mx-auto max-w-lg rounded-2xl p-6 text-center hover:translate-y-0">
        <p className="text-lg font-bold text-brand-text">Uğurlu!</p>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">{successMessage}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="btn-primary-premium rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          >
            Yeni elan
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-brand-border px-5 py-2.5 text-sm font-semibold text-brand-text hover:border-brand-primary/40 hover:text-brand-primary"
          >
            Ana səhifə
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-muted">Bir neçə addımda məhsulunuzu satışa çıxarın</p>
        <button
          type="button"
          onClick={clearForm}
          className="text-sm font-semibold text-brand-primary hover:underline"
        >
          Formu təmizlə
        </button>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        Elan bu mağaza üçün yaradılır: {storeAccess.storeName ?? "Mağaza"}
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="card-premium space-y-4 rounded-2xl p-5 hover:translate-y-0">
        <h2 className="text-base font-bold text-brand-text">Kateqoriya</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand-text">Əsas kateqoriya</label>
            <select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Seçin</option>
              {taxonomy.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          {selectedSubcategories.length > 0 ? (
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand-text">Alt kateqoriya</label>
              <select
                value={subcategoryId}
                onChange={(e) => handleSubcategoryChange(e.target.value)}
                className={selectClass}
              >
                <option value="">Seçin (istəyə bağlı)</option>
                {selectedSubcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <DynamicAttributeFields
          definitions={attributeDefinitions}
          values={attributes}
          subcategorySelected={Boolean(subcategoryId)}
          onChange={handleAttributeChange}
        />
      </section>

      <section className="card-premium space-y-4 rounded-2xl p-5 hover:translate-y-0">
        <h2 className="text-base font-bold text-brand-text">Şəkillər</h2>
        <p className="text-sm text-brand-muted">Ən azı 1 şəkil tövsiyə olunur. Maksimum {maxListingImages}.</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, index) => (
            <div key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
              <ListingImage
                src={img.url}
                alt={`Şəkil ${index + 1}`}
                fallbackClass={LISTING_IMAGE_FALLBACK_CLASS}
                sizes="160px"
                fit="contain"
              />
              {index === 0 ? (
                <span className="absolute left-2 top-2 rounded-md bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                  Əsas
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-brand-text shadow-sm hover:bg-white"
                aria-label="Şəkli sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {images.length < maxListingImages ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-border bg-brand-surface text-brand-muted transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
            >
              <ImagePlus className="h-7 w-7" />
              <span className="text-xs font-semibold">Şəkil əlavə et</span>
            </button>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={LISTING_IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            handleAddImages(e.target.files);
            e.target.value = "";
          }}
        />
      </section>

      <section className="card-premium space-y-4 rounded-2xl p-5 hover:translate-y-0">
        <h2 className="text-base font-bold text-brand-text">Elan məlumatları</h2>

        <div>
          <label className="mb-2 block text-sm font-semibold text-brand-text">Başlıq</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Məs: Samsung paltaryuyan maşın"
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand-text">Qiymət (AZN)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="450"
              className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand-text">Şəhər</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
            >
              <option value="">Seçin</option>
              {AZERBAIJAN_CITY_OPTIONS.map((option) => (
                <option key={option.slug} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-brand-text">Təsvir</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Məhsul haqqında ətraflı məlumat..."
            className="w-full resize-y rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-brand-text">Telefon (istəyə bağlı)</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="050 123 45 67"
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
          />
        </div>
      </section>

      <section className="card-premium space-y-3 rounded-2xl p-5 hover:translate-y-0">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-semibold text-brand-text">Vəziyyət: {isNew ? "Yeni" : "İşlənmiş"}</span>
            <span className="text-xs text-brand-muted">Məhsulun istifadə vəziyyəti</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isNew}
            onClick={() => setIsNew((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition-colors ${isNew ? "bg-brand-primary" : "bg-brand-border"}`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isNew ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-brand-border pt-3">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-brand-primary" />
            <span>
              <span className="block text-sm font-semibold text-brand-text">Çatdırılma mövcuddur</span>
              <span className="text-xs text-brand-muted">Alıcıya çatdırılma təklif edirsiniz</span>
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={deliveryAvailable}
            onClick={() => setDeliveryAvailable((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition-colors ${deliveryAvailable ? "bg-brand-primary" : "bg-brand-border"}`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${deliveryAvailable ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </label>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-brand-muted">
          Elan moderator yoxlanışından keçdikdən sonra saytda görünəcək.
        </p>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          {turnstileEnabled ? (
            <TurnstileWidget
              onToken={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
            />
          ) : null}
          {uploadProgressItems.length > 0 ? (
            <div className="w-full min-w-0 rounded-xl border border-brand-border bg-brand-surface p-3 text-left sm:w-80">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-brand-text">
                <span>Şəkillər yüklənir</span>
                <span>{uploadProgressPercent}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-brand-border"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgressPercent}
              >
                <div
                  className="h-full rounded-full bg-brand-primary transition-all"
                  style={{ width: `${uploadProgressPercent}%` }}
                />
              </div>
              <div className="mt-3 space-y-2">
                {uploadProgressItems.map((item) => (
                  <div key={item.id} className="min-w-0 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-brand-muted">{item.name}</span>
                      <span
                        className={
                          item.stage === "error"
                            ? "shrink-0 font-semibold text-red-600"
                            : "shrink-0 font-semibold text-brand-text"
                        }
                      >
                        {getUploadStageLabel(item.stage)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-border">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.stage === "error" ? "bg-red-500" : "bg-brand-primary"
                        }`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    {item.message ? <p className="mt-1 truncate text-[11px] text-brand-muted">{item.message}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <button
            type="submit"
            disabled={loading || (turnstileEnabled && !captchaToken)}
            className="btn-primary-premium inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Göndərilir...
              </>
            ) : (
              "Elanı göndər"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
