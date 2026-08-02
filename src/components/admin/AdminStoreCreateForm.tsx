"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { adminCreateStore } from "@/app/admin/stores/actions";
import { readStoreMapFieldsFromForm } from "@/lib/stores/store-map-fields";

const inputClass =
  "w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/70 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20";

export function AdminStoreCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();

    if (!name) {
      setErrorMessage("Mağaza adını daxil edin.");
      return;
    }

    startTransition(async () => {
      const result = await adminCreateStore({
        name,
        category: String(data.get("category") ?? "").trim(),
        city: String(data.get("city") ?? "").trim(),
        contactPhone: String(data.get("contactPhone") ?? "").trim(),
        whatsappPhone: String(data.get("whatsappPhone") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
        ...readStoreMapFieldsFromForm(data),
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setCreatedCode(result.storeCode);
      router.push(`/admin/stores/${result.storeId}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-brand-border/90 bg-white p-5 sm:p-6">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {createdCode ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Mağaza yaradıldı. Kod: <span className="font-mono font-bold">{createdCode}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">Mağaza adı *</span>
          <input name="name" required maxLength={120} className={inputClass} placeholder="Məs: Mağaza(firma) adı" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">Kateqoriya</span>
          <input name="category" maxLength={80} className={inputClass} placeholder="Məs: Ev və bağ" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">Şəhər</span>
          <input name="city" maxLength={80} className={inputClass} placeholder="Məs: Bakı" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">Əlaqə telefonu</span>
          <input name="contactPhone" maxLength={30} className={inputClass} placeholder="+994 50 000 00 00" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">WhatsApp</span>
          <input name="whatsappPhone" maxLength={30} className={inputClass} placeholder="+994 50 000 00 00" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">Ünvan</span>
          <input name="address" maxLength={200} className={inputClass} placeholder="Küçə, bina, məhəllə..." />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">
            Xəritə linki <span className="font-normal text-brand-muted">(istəyə görə — boşdursa, xəritə ünvandan qurulur)</span>
          </span>
          <input name="mapUrl" type="url" maxLength={500} className={inputClass} placeholder="https://maps.google.com/..." />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">Təsvir</span>
          <textarea name="description" rows={3} maxLength={2000} className={inputClass} placeholder="Mağaza haqqında qısa məlumat" />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-70"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Mağaza yarat
      </button>
    </form>
  );
}
