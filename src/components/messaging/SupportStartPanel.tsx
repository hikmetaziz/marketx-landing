"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getOrCreateCustomerSupportConversation, sendConversationMessage } from "@/lib/messaging";
import { CUSTOMER_SUPPORT_TOPICS, type CustomerSupportTopic } from "@/lib/messaging-contract/contract";
import {
  buildSupportInitialMessage,
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_ATTACHMENT_MAX_FILES,
  uploadSupportAttachments,
} from "@/lib/messaging/support-attachments";
import {
  classifyPaymentSafety,
  PAYMENT_BLOCK_TEXT,
  PAYMENT_BLOCK_TITLE,
  confirmPaymentSafetyWarning,
  showPaymentSafetyBlockNotice,
} from "@/lib/messaging/payment-safety";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

const CUSTOMER_TOPIC_LABELS: Record<CustomerSupportTopic, string> = {
  account: "Hesab",
  store_or_product_complaint: "Mağaza və ya məhsul şikayəti",
  incorrect_price: "Yanlış qiymət",
  technical_problem: "Texniki problem",
  other: "Digər",
};

const CUSTOMER_TOPIC_PLACEHOLDERS: Record<CustomerSupportTopic, { subject: string; details: string }> = {
  account: {
    subject: "Məsələn: hesaba daxil ola bilmirəm",
    details: "Hesabda nə baş verdiyini, hansı addımda dayandığını və varsa xəta mətnini yazın...",
  },
  store_or_product_complaint: {
    subject: "Məsələn: mağaza sifarişə cavab vermir",
    details: "Mağaza, elan və problem haqqında detalları yazın. Link və ya screenshot varsa əlavə edin...",
  },
  incorrect_price: {
    subject: "Məsələn: elanda qiymət yanlışdır",
    details: "Hansı elanda qiymət problemi olduğunu, gözlədiyiniz və gördüyünüz qiyməti yazın...",
  },
  technical_problem: {
    subject: "Məsələn: şəkil yüklənmir",
    details: "Problemin harada baş verdiyini, cihaz/browser məlumatını və gördüyünüz xəta mətnini yazın...",
  },
  other: {
    subject: "Məsələn: ümumi sual",
    details: "Müraciətinizi qısa və aydın izah edin...",
  },
};

export function SupportStartPanel() {
  const router = useRouter();
  const { supabase, user } = useAuthUser();
  const [topic, setTopic] = useState<CustomerSupportTopic>("technical_problem");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    if (!supabase || !user || pending) return;

    const cleanSubject = subject.trim();
    const cleanDetails = details.trim();
    if (!cleanSubject || !cleanDetails) {
      setError("Başlıq və detallı mesaj yazın.");
      return;
    }

    const safety = classifyPaymentSafety(`${cleanSubject}\n${cleanDetails}`);
    if (safety.level === "BLOCK") {
      setError(`${PAYMENT_BLOCK_TITLE}. ${PAYMENT_BLOCK_TEXT}`);
      void showPaymentSafetyBlockNotice();
      return;
    }
    if (safety.level === "WARN_AND_ALLOW") {
      const confirmed = await confirmPaymentSafetyWarning();
      if (!confirmed) return;
    }

    setPending(true);
    setError("");

    const result = await getOrCreateCustomerSupportConversation(supabase, {
      topic,
      subject: cleanSubject,
    });

    if (result.error || !result.conversationId) {
      setPending(false);
      setError(result.error ?? "Dəstək söhbəti açılmadı.");
      return;
    }

    const uploadResult = files.length > 0 ? await uploadSupportAttachments(user.id, result.conversationId, files) : { urls: [], errors: [] };
    const message = buildSupportInitialMessage({
      topicLabel: CUSTOMER_TOPIC_LABELS[topic],
      subject: cleanSubject,
      details: cleanDetails,
      attachmentUrls: uploadResult.urls,
      uploadErrors: uploadResult.errors,
    });

    const messageResult = await sendConversationMessage(supabase, result.conversationId, message);

    setPending(false);
    if (messageResult.error) {
      setError(messageResult.error);
      return;
    }

    router.push(`/account/messages/${result.conversationId}`);
  };

  const canSubmit = Boolean(subject.trim() && details.trim()) && !pending;
  const placeholder = CUSTOMER_TOPIC_PLACEHOLDERS[topic];

  return (
    <div className="rounded-xl border border-brand-border/90 bg-white p-4 shadow-sm md:rounded-2xl md:p-5">
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">Mövzu</span>
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value as CustomerSupportTopic)}
            className="w-full rounded-xl border border-brand-border bg-brand-surface/40 px-3 py-2.5 text-sm font-semibold text-brand-text outline-none focus:border-brand-primary/40 md:py-3"
          >
            {CUSTOMER_SUPPORT_TOPICS.map((item) => (
              <option key={item} value={item}>
                {CUSTOMER_TOPIC_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand-text">Qısa başlıq</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-brand-border bg-brand-surface/40 px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40 md:py-3"
            placeholder={placeholder.subject}
          />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-brand-text">İlk mesaj</span>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={5}
          maxLength={1600}
          className="w-full resize-y rounded-xl border border-brand-border bg-brand-surface/40 px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40 md:py-3"
          placeholder={placeholder.details}
        />
      </label>
      <label className="mt-4 block rounded-xl border border-dashed border-brand-border bg-brand-surface/30 px-3.5 py-3 md:px-4">
        <span className="block text-sm font-semibold text-brand-text">Şəkil əlavə et</span>
        <span className="mt-1 block text-xs text-brand-muted">Lazımdırsa screenshot və ya foto əlavə edin. Maksimum {SUPPORT_ATTACHMENT_MAX_FILES} şəkil.</span>
        <input
          type="file"
          accept={SUPPORT_ATTACHMENT_ACCEPT}
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, SUPPORT_ATTACHMENT_MAX_FILES))}
          className="mt-3 block w-full text-sm text-brand-muted file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-bold file:text-brand-primary"
        />
        {files.length > 0 ? <span className="mt-2 block text-xs font-semibold text-brand-muted">{files.length} şəkil seçildi</span> : null}
      </label>
      {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={() => void start()}
        disabled={!canSubmit}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 md:w-auto md:py-3"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        MarktX Dəstəyə yaz
      </button>
    </div>
  );
}
