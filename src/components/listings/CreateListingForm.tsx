"use client";

import { ImagePlus, Loader2, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { attachListingImages, createListing } from "@/app/create-listing/actions";
import { TurnstileWidget } from "@/components/captcha/TurnstileWidget";
import { CITY_OPTIONS, LISTING_CATEGORIES, MAX_LISTING_IMAGES } from "@/constants/listings";
import { isTurnstileConfigured } from "@/lib/captcha/turnstile-config";
import { isValidContactPhone } from "@/lib/contact-phone";
import { ListingImage } from "@/components/ui/ListingImage";
import { LISTING_IMAGE_FALLBACK_CLASS } from "@/lib/listings/listing-images";
import { uploadListingImages } from "@/lib/listings/upload";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

type ImagePreview = {
  id: string;
  file: File;
  url: string;
};

export function CreateListingForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { supabase, user, loading: authLoading } = useAuthUser();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileEnabled = isTurnstileConfigured();

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [images]);

  const clearForm = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setTitle("");
    setPrice("");
    setCategory("");
    setCity("");
    setIsNew(false);
    setDeliveryAvailable(false);
    setContactPhone("");
    setDescription("");
    setImages([]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleAddImages = (fileList: FileList | null) => {
    if (!fileList) return;

    const remaining = MAX_LISTING_IMAGES - images.length;
    if (remaining <= 0) {
      setErrorMessage(`Maksimum ${MAX_LISTING_IMAGES} şəkil əlavə edə bilərsiniz.`);
      return;
    }

    const nextFiles = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining);

    if (nextFiles.length === 0) {
      setErrorMessage("Yalnız şəkil faylları seçin.");
      return;
    }

    setErrorMessage("");
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

    if (!title.trim() || !price || !category || !city) {
      setErrorMessage("Başlıq, qiymət, kateqoriya və şəhər mütləq doldurulmalıdır.");
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
        category,
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
      const { urls, errors } = await uploadListingImages(
        user.id,
        createResult.listingId,
        images.map((img) => img.file),
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
          href="/login?returnTo=/create-listing&mode=register"
          className="btn-primary-premium mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        >
          Daxil ol
        </Link>
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

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="card-premium space-y-4 rounded-2xl p-5 hover:translate-y-0">
        <h2 className="text-base font-bold text-brand-text">Kateqoriya</h2>
        <div className="flex flex-wrap gap-2">
          {LISTING_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                category === cat
                  ? "border-brand-primary bg-brand-primary-light text-brand-primary-dark"
                  : "border-brand-border bg-white text-brand-muted hover:border-brand-primary/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="card-premium space-y-4 rounded-2xl p-5 hover:translate-y-0">
        <h2 className="text-base font-bold text-brand-text">Şəkillər</h2>
        <p className="text-sm text-brand-muted">Ən azı 1 şəkil tövsiyə olunur. Maksimum {MAX_LISTING_IMAGES}.</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, index) => (
            <div key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
              <ListingImage
                src={img.url}
                alt={`Şəkil ${index + 1}`}
                fallbackClass={LISTING_IMAGE_FALLBACK_CLASS}
                sizes="160px"
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

          {images.length < MAX_LISTING_IMAGES ? (
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
          accept="image/*"
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
              {CITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
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
