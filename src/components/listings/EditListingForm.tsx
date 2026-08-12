"use client";

import { ImagePlus, Loader2, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { updateMyListing } from "@/app/account/listings/actions";
import { DynamicAttributeFields } from "@/components/listings/DynamicAttributeFields";
import { MAX_LISTING_IMAGES } from "@/constants/listings";
import { AZERBAIJAN_CITY_OPTIONS } from "@/lib/constants/cities";
import { isValidContactPhone } from "@/lib/contact-phone";
import { ListingImage } from "@/components/ui/ListingImage";
import type { CategorySchemaSnapshot } from "@/lib/category-schema/schema-contract";
import { getResolvedPhotoLimit } from "@/lib/category-schema/resolve-category-schema";
import { getListingImages, LISTING_IMAGE_FALLBACK_CLASS } from "@/lib/listings/listing-images";
import type { EditableListing } from "@/lib/listings/my-listing-edit";
import {
  isSupportedListingImageFile,
  LISTING_IMAGE_ACCEPT,
  uploadListingImages,
  type ListingImageUploadStage,
} from "@/lib/listings/upload";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import { getAttributeDefinitions } from "@/lib/taxonomy/listing-taxonomy-utils";
import type { ListingAttributeValues, ListingTaxonomy } from "@/lib/taxonomy/listing-taxonomy-types";

type ImagePreview = {
  id: string;
  url: string;
  file?: File;
  remote?: boolean;
};

type UploadProgressItem = {
  id: string;
  name: string;
  stage: ListingImageUploadStage | "pending";
  percent: number;
  message?: string;
};

type EditListingFormProps = {
  listing: EditableListing;
  taxonomy: ListingTaxonomy;
  categorySchemaSnapshot: CategorySchemaSnapshot;
};

const selectClass =
  "w-full rounded-xl border border-brand-border bg-brand-surface px-3.5 py-2.5 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15 md:px-4 md:py-3";

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

export function EditListingForm({ listing, taxonomy, categorySchemaSnapshot }: EditListingFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthUser();

  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState(String(listing.price));
  const [categoryId, setCategoryId] = useState(listing.category_id ?? "");
  const [subcategoryId, setSubcategoryId] = useState(listing.subcategory_id ?? "");
  const [attributes, setAttributes] = useState<ListingAttributeValues>(listing.attributes);
  const [city, setCity] = useState(listing.city);
  const [isNew, setIsNew] = useState(listing.condition === "Yeni");
  const [deliveryAvailable, setDeliveryAvailable] = useState(Boolean(listing.delivery_available));
  const [contactPhone, setContactPhone] = useState(listing.contact_phone ?? "");
  const [description, setDescription] = useState(listing.description ?? "");
  const [images, setImages] = useState<ImagePreview[]>(() =>
    getListingImages(listing).map((url, index) => ({
      id: `remote-${index}-${url}`,
      url,
      remote: true,
    })),
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadProgressItems, setUploadProgressItems] = useState<UploadProgressItem[]>([]);

  const selectedCategory = useMemo(
    () => taxonomy.categories.find((item) => item.id === categoryId) ?? null,
    [categoryId, taxonomy.categories],
  );
  const selectedSubcategories = useMemo(
    () => selectedCategory?.subcategories ?? [],
    [selectedCategory],
  );
  const selectedSubcategory = useMemo(
    () => selectedSubcategories.find((item) => item.id === subcategoryId) ?? null,
    [selectedSubcategories, subcategoryId],
  );
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
  const legacyAttributeEntries = useMemo(() => {
    const knownKeys = new Set(attributeDefinitions.map((definition) => definition.key));
    return Object.entries(attributes).filter(([key]) => !knownKeys.has(key));
  }, [attributeDefinitions, attributes]);
  const hasLegacySubcategory =
    Boolean(subcategoryId) && (!selectedSubcategory || selectedSubcategory.slug === "komputerler");
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
      images.forEach((img) => {
        if (!img.remote) URL.revokeObjectURL(img.url);
      });
    };
  }, [images]);

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
      if (target && !target.remote) URL.revokeObjectURL(target.url);
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setUploadProgressItems([]);

    if (!title.trim() || !price || !categoryId || !city) {
      setErrorMessage("Başlıq, qiymət, kateqoriya və şəhər mütləq doldurulmalıdır.");
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
      setErrorMessage("Telefon düzgün deyil. Nümunə: 050 XXX XX XX");
      return;
    }

    if (!user?.id) {
      setErrorMessage("Daxil olmamısınız.");
      return;
    }

    setLoading(true);

    const keptRemoteUrls = images.filter((img) => img.remote).map((img) => img.url);
    const newImagePreviews = images.filter((img): img is ImagePreview & { file: File } => Boolean(img.file));
    const newFiles = newImagePreviews.map((img) => img.file);
    let finalUrls = [...keptRemoteUrls];

    if (newFiles.length > 0) {
      setUploadProgressItems(
        newImagePreviews.map((img) => ({
          id: img.id,
          name: img.file.name,
          stage: "pending",
          percent: 0,
        })),
      );

      const { urls, errors } = await uploadListingImages(
        user.id,
        listing.id,
        newFiles,
        keptRemoteUrls.length,
        (progress) => {
          const target = newImagePreviews[progress.index];
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
      finalUrls = [...keptRemoteUrls, ...urls].slice(0, maxListingImages);
      if (errors.length > 0 && finalUrls.length === 0) {
        setLoading(false);
        setErrorMessage("Şəkil yüklənmədi. Yenidən cəhd edin.");
        return;
      }
    }

    const updateResult = await updateMyListing(
      listing.id,
      {
        title,
        price: priceNumber,
        categoryId,
        subcategoryId: subcategoryId || null,
        attributes,
        city,
        isNew,
        description,
        contactPhone,
        deliveryAvailable,
      },
      finalUrls,
    );

    setLoading(false);

    if (!updateResult.ok) {
      setErrorMessage(updateResult.error);
      return;
    }

    if (updateResult.slug) {
      router.push(`/elanlar/${updateResult.slug}`);
    } else {
      router.push("/account/listings");
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="card-premium space-y-4 rounded-xl p-4 hover:translate-y-0 md:rounded-2xl md:p-5">
        <h2 className="text-base font-bold text-brand-text">Kateqoriya</h2>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand-text">Əsas kateqoriya</label>
            <select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} className={selectClass}>
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
        {hasLegacySubcategory ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Bu elan legacy alt kateqoriya ilə saxlanılıb. Dəqiq canonical alt kateqoriya seçilmədən avtomatik
            masaüstü kompüter kimi təsnif edilmir.
          </div>
        ) : null}
        {legacyAttributeEntries.length > 0 ? (
          <div className="space-y-3 rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
            <h3 className="text-sm font-bold text-brand-text">Legacy detallar</h3>
            {legacyAttributeEntries.map(([key, value]) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold text-brand-muted">{key}</label>
                <input
                  type="text"
                  value={Array.isArray(value) ? value.join(", ") : value === null || value === undefined ? "" : String(value)}
                  readOnly
                  className={`${selectClass} bg-white`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card-premium space-y-4 rounded-xl p-4 hover:translate-y-0 md:rounded-2xl md:p-5">
        <h2 className="text-base font-bold text-brand-text">Şəkillər</h2>
        <p className="text-sm text-brand-muted">Maksimum {maxListingImages} şəkil.</p>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative aspect-[4/3] overflow-hidden rounded-xl border border-brand-border bg-brand-surface"
            >
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

      <section className="card-premium space-y-4 rounded-xl p-4 hover:translate-y-0 md:rounded-2xl md:p-5">
        <h2 className="text-base font-bold text-brand-text">Elan məlumatları</h2>

        <div>
          <label className="mb-2 block text-sm font-semibold text-brand-text">Başlıq</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-3.5 py-2.5 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15 md:px-4 md:py-3"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand-text">Qiymət (AZN)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-brand-surface px-3.5 py-2.5 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15 md:px-4 md:py-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand-text">Şəhər</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-brand-surface px-3.5 py-2.5 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15 md:px-4 md:py-3"
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
            className="w-full resize-y rounded-xl border border-brand-border bg-brand-surface px-3.5 py-2.5 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15 md:px-4 md:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-brand-text">Telefon</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="050 XXX XX XX"
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-3.5 py-2.5 text-brand-text outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15 md:px-4 md:py-3"
          />
        </div>
      </section>

      <section className="card-premium space-y-3 rounded-xl p-4 hover:translate-y-0 md:rounded-2xl md:p-5">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-semibold text-brand-text">Vəziyyət: {isNew ? "Yeni" : "İşlənmiş"}</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isNew}
            onClick={() => setIsNew((value) => !value)}
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
            <span className="block text-sm font-semibold text-brand-text">Çatdırılma mövcuddur</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={deliveryAvailable}
            onClick={() => setDeliveryAvailable((value) => !value)}
            className={`relative h-7 w-12 rounded-full transition-colors ${deliveryAvailable ? "bg-brand-primary" : "bg-brand-border"}`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${deliveryAvailable ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </label>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-brand-muted">
          Vacib dəyişikliklər moderator yoxlanışına göndərilə bilər.
        </p>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
          {uploadProgressItems.length > 0 ? (
            <div className="w-full min-w-0 rounded-xl border border-brand-border bg-brand-surface p-3 text-left md:w-80">
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
          <div className="flex flex-wrap gap-2">
          <Link
            href="/account/listings"
            className="inline-flex items-center justify-center rounded-xl border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text hover:border-brand-primary/40"
          >
            Ləğv et
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary-premium inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Yadda saxlanılır...
              </>
            ) : (
              "Yadda saxla"
            )}
          </button>
        </div>
      </div>
      </div>
    </form>
  );
}
