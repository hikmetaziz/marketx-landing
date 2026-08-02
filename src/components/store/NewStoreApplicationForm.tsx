"use client";

import { Check, ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AZERBAIJAN_CITY_OPTIONS } from "@/lib/constants/cities";
import { normalizeAzPhone } from "@/lib/contact-phone";
import { sendConversationMessage } from "@/lib/messaging";
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  uploadSupportAttachments,
} from "@/lib/messaging/support-attachments";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

const STORE_CATEGORIES = [
  "Avtomobil və nəqliyyat",
  "Avto ehtiyat hissələri və avadanlıq",
  "Telefon",
  "Elektronika",
  "Məişət texnikası",
  "Ev və bağ",
  "Geyim və aksesuar",
  "Xidmətlər",
  "Biznes və avadanlıq",
  "Digər",
] as const;

const WORK_DAYS = [
  ["monday", "Bazar ertəsi"],
  ["tuesday", "Çərşənbə axşamı"],
  ["wednesday", "Çərşənbə"],
  ["thursday", "Cümə axşamı"],
  ["friday", "Cümə"],
  ["saturday", "Şənbə"],
  ["sunday", "Bazar"],
] as const;

const inputClass =
  "w-full rounded-xl border border-brand-border bg-white px-3.5 py-3 text-sm text-brand-text placeholder:text-brand-muted/70 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20";

type ApplicationState = {
  name: string;
  category: string;
  city: string;
  description: string;
  address: string;
  workingDays: string[];
  openingTime: string;
  closingTime: string;
  phone: string;
  whatsapp: string;
  email: string;
};

const initialState: ApplicationState = {
  name: "",
  category: "",
  city: "",
  description: "",
  address: "",
  workingDays: [],
  openingTime: "09:00",
  closingTime: "18:00",
  phone: "",
  whatsapp: "",
  email: "",
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function workDayLabels(values: string[]) {
  return WORK_DAYS.filter(([value]) => values.includes(value)).map(([, label]) => label);
}

export function NewStoreApplicationForm() {
  const router = useRouter();
  const { supabase, user } = useAuthUser();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ApplicationState>(initialState);
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const logoPreviewRef = useRef<string | null>(null);
  const coverPreviewRef = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    logoPreviewRef.current = logoPreview;

    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  useEffect(() => {
    coverPreviewRef.current = coverPreview;

    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const updatePreviewFile = (
    file: File | null,
    setFile: (value: File | null) => void,
    setPreview: (value: string | null) => void,
    previewRef: { current: string | null },
  ) => {
    setFile(file);

    if (!file) {
      setPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    previewRef.current = previewUrl;
    setPreview(previewUrl);
  };

  const update = <K extends keyof ApplicationState>(key: K, value: ApplicationState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validateStep = (targetStep: number) => {
    if (targetStep === 1 && (!form.name.trim() || !form.category || !form.city || !form.description.trim())) {
      return "Mağaza adı, kateqoriya, şəhər və təsviri daxil edin.";
    }
    if (
      targetStep === 2 &&
      (!form.address.trim() || form.workingDays.length === 0 || !form.openingTime || !form.closingTime)
    ) {
      return "Ünvanı, iş günlərini və iş saatlarını daxil edin.";
    }
    if (targetStep === 3) {
      if (!normalizeAzPhone(form.phone)) {
        return "Telefon nömrəsini tam daxil edin. Məsələn: 051 471 11 18.";
      }
      if (form.whatsapp.trim() && !normalizeAzPhone(form.whatsapp)) {
        return "WhatsApp nömrəsini düzgün daxil edin.";
      }
      if (form.email.trim() && !isValidEmail(form.email.trim())) {
        return "E-poçt ünvanını düzgün daxil edin.";
      }
    }
    return "";
  };

  const next = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((current) => Math.min(3, current + 1));
  };

  const submit = async () => {
    if (!supabase || !user || pending) return;
    const validationError = validateStep(1) || validateStep(2) || validateStep(3);
    if (validationError) {
      setError(validationError);
      return;
    }

    const phone = normalizeAzPhone(form.phone);
    const whatsapp = form.whatsapp.trim() ? normalizeAzPhone(form.whatsapp) : null;
    if (!phone) return;

    const message = [
      "MÜRACİƏT NÖVÜ: Yeni mağaza",
      `Mağaza adı: ${form.name.trim()}`,
      `Kateqoriya: ${form.category}`,
      `Şəhər: ${form.city}`,
      `Təsvir: ${form.description.trim()}`,
      `Ünvan: ${form.address.trim()}`,
      `İş günləri: ${workDayLabels(form.workingDays).join(", ")}`,
      `İş saatları: ${form.openingTime}–${form.closingTime}`,
      `Telefon: ${phone}`,
      `WhatsApp: ${whatsapp ?? "Qeyd edilməyib"}`,
      `E-poçt: ${form.email.trim() || "Qeyd edilməyib"}`,
      "",
      "Qeyd: Bu müraciət mağaza və sahiblik yaratmır. MarktX yoxlamasından sonra mağaza ayrıca yaradılacaq.",
    ].join("\n");

    if (message.length > 1000) {
      setError("Müraciət çox uzundur. Təsvir və ünvanı qısaldın.");
      return;
    }

    setPending(true);
    setError("");

    const { data: createdApplicationResult, error: applicationError } = await supabase.rpc(
      "submit_store_application",
      {
        p_application: {
          name: form.name.trim(),
          category: form.category,
          categoryId: null,
          city: form.city,
          description: form.description.trim(),
          address: form.address.trim(),
          workingDays: workDayLabels(form.workingDays).join(", "),
          openingTime: form.openingTime,
          closingTime: form.closingTime,
          phone,
          whatsapp,
          email: form.email.trim(),
        },
      },
    );

    const createdApplication = Array.isArray(createdApplicationResult)
      ? createdApplicationResult[0]
      : createdApplicationResult;
    const applicationId =
      typeof createdApplication?.application_id === "string"
        ? createdApplication.application_id
        : "";
    const conversationId =
      typeof createdApplication?.conversation_id === "string"
        ? createdApplication.conversation_id
        : "";

    if (applicationError || !applicationId || !conversationId) {
      console.error("New store application submission failed", {
        code: applicationError?.code,
        message: applicationError?.message,
        details: applicationError?.details,
        hint: applicationError?.hint,
      });
      setPending(false);
      setError("Müraciət göndərilmədi. Yenidən cəhd edin.");
      return;
    }

    const [logoUpload, coverUpload] = await Promise.all([
      logo
        ? uploadSupportAttachments(user.id, conversationId, [logo])
        : Promise.resolve({ urls: [], errors: [] }),
      cover
        ? uploadSupportAttachments(user.id, conversationId, [cover])
        : Promise.resolve({ urls: [], errors: [] }),
    ]);

    const logoUrl = logo ? (logoUpload.urls[0] ?? null) : null;
    const coverUrl = cover ? (coverUpload.urls[0] ?? null) : null;

    if (logoUrl || coverUrl) {
      const { error: assetError } = await supabase.rpc("update_my_store_application_assets", {
        p_application_id: applicationId,
        p_logo_url: logoUrl,
        p_cover_url: coverUrl,
      });

      if (assetError) {
        console.error("Store application asset persistence failed", {
          code: assetError.code,
          message: assetError.message,
          details: assetError.details,
          hint: assetError.hint,
        });
      }
    }

    const attachmentLines = [
      logoUrl ? `Logo: ${logoUrl}` : null,
      coverUrl ? `Örtük şəkli: ${coverUrl}` : null,
      logoUpload.errors.length || coverUpload.errors.length
        ? "Qeyd: Seçilmiş şəkillərdən biri yüklənmədi."
        : null,
    ].filter((line): line is string => Boolean(line));

    if (attachmentLines.length > 0) {
      await sendConversationMessage(supabase, conversationId, attachmentLines.join("\n"));
    }

    router.push(`/account/messages/${conversationId}`);
  };

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                item <= step ? "bg-brand-primary text-white" : "bg-brand-surface text-brand-muted"
              }`}
            >
              {item < step ? <Check className="h-4 w-4" /> : item}
            </span>
            <span className="hidden text-xs font-semibold text-brand-muted sm:block">
              {item === 1 ? "Mağaza" : item === 2 ? "İş qrafiki" : "Əlaqə"}
            </span>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">Mağaza adı *</span>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={80} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">Kateqoriya *</span>
            <select value={form.category} onChange={(event) => update("category", event.target.value)} className={inputClass}>
              <option value="">Seçin</option>
              {STORE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">Şəhər *</span>
            <select value={form.city} onChange={(event) => update("city", event.target.value)} className={inputClass}>
              <option value="">Seçin</option>
              {AZERBAIJAN_CITY_OPTIONS.map((city) => <option key={city.slug} value={city.value}>{city.label}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">Təsvir *</span>
            <textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={4} maxLength={160} className={inputClass} />
          </label>
          <FileField
            label="Logo"
            file={logo}
            previewUrl={logoPreview}
            previewClassName="h-32 w-full object-contain bg-white"
            onChange={(file) => updatePreviewFile(file, setLogo, setLogoPreview, logoPreviewRef)}
          />
          <FileField
            label="Örtük şəkli"
            file={cover}
            previewUrl={coverPreview}
            previewClassName="h-32 w-full object-cover"
            onChange={(file) => updatePreviewFile(file, setCover, setCoverPreview, coverPreviewRef)}
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">Ünvan *</span>
            <input value={form.address} onChange={(event) => update("address", event.target.value)} maxLength={120} className={inputClass} />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-brand-text">İş günləri *</legend>
            <div className="flex flex-wrap gap-2">
              {WORK_DAYS.map(([value, label]) => {
                const selected = form.workingDays.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("workingDays", selected ? form.workingDays.filter((day) => day !== value) : [...form.workingDays, value])}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      selected ? "border-brand-primary bg-brand-primary-light text-brand-primary-dark" : "border-brand-border text-brand-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">Açılış vaxtı *</span>
              <input type="time" value={form.openingTime} onChange={(event) => update("openingTime", event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand-text">Bağlanış vaxtı *</span>
              <input type="time" value={form.closingTime} onChange={(event) => update("closingTime", event.target.value)} className={inputClass} />
            </label>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">Telefon *</span>
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} maxLength={30} placeholder="051 471 11 18" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">WhatsApp</span>
            <input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} maxLength={30} placeholder="051 471 11 18" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">E-poçt</span>
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} maxLength={100} className={inputClass} />
          </label>
          <div className="rounded-xl border border-brand-border bg-brand-surface/40 p-4 text-sm">
            <p className="font-bold text-brand-text">{form.name}</p>
            <p className="mt-1 text-brand-muted">{form.category} · {form.city}</p>
            <p className="mt-1 text-brand-muted">{workDayLabels(form.workingDays).join(", ")} · {form.openingTime}–{form.closingTime}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={pending || step === 1}
          onClick={() => {
            setError("");
            setStep((current) => Math.max(1, current - 1));
          }}
          className="rounded-xl border border-brand-border px-4 py-2.5 text-sm font-semibold text-brand-text disabled:invisible"
        >
          Geri
        </button>
        {step < 3 ? (
          <button type="button" onClick={next} className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white">
            Davam et
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Müraciəti göndər
          </button>
        )}
      </div>
    </div>
  );
}

function FileField({
  label,
  file,
  previewUrl,
  previewClassName,
  onChange,
}: {
  label: string;
  file: File | null;
  previewUrl: string | null;
  previewClassName: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block rounded-xl border border-dashed border-brand-border p-4">
      <span className="flex items-center gap-2 text-sm font-semibold text-brand-text">
        <ImagePlus className="h-4 w-4 text-brand-primary" />
        {label}
      </span>
      <input
        type="file"
        accept={SUPPORT_ATTACHMENT_ACCEPT}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="mt-3 block w-full text-xs text-brand-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-surface file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-primary"
      />
      {file ? <span className="mt-2 block truncate text-xs text-brand-muted">{file.name}</span> : null}
      {previewUrl ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-brand-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={label} className={previewClassName} />
        </div>
      ) : null}
    </label>
  );
}
