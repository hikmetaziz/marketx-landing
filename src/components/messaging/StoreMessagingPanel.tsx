"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchStoreConversations, getOrCreateStoreSupportConversation, sendConversationMessage } from "@/lib/messaging";
import { STORE_SUPPORT_TOPICS, type StoreSupportTopic } from "@/lib/messaging-contract/contract";
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
import type { ConversationPreview } from "@/types/message";

const STORE_TOPIC_LABELS: Record<StoreSupportTopic, string> = {
  claim: "Sahiblik",
  product_import: "Məhsul importu",
  subscription: "Abunəlik",
  moderation: "Moderasiya",
  store_information: "Mağaza məlumatları",
  technical_problem: "Texniki problem",
  other: "Digər",
};

const STORE_TOPIC_PLACEHOLDERS: Record<StoreSupportTopic, { subject: string; details: string }> = {
  claim: {
    subject: "Məsələn: mağaza sahiblik təsdiqi",
    details: "Mağaza sahiblik problemi və hansı mağaza ilə bağlı olduğunu yazın...",
  },
  product_import: {
    subject: "Məsələn: məhsul importunda xəta",
    details: "Import faylı, məhsul sayı və aldığınız xəta haqqında detalları yazın...",
  },
  subscription: {
    subject: "Məsələn: abunəlik aktiv görünmür",
    details: "Abunəlik, ödəniş və görünən status barədə məlumat yazın...",
  },
  moderation: {
    subject: "Məsələn: elan təsdiqdən keçmədi",
    details: "Hansı elanla bağlıdır, moderator qeydi nədir və nəyi yoxlamaq lazımdır...",
  },
  store_information: {
    subject: "Məsələn: mağaza məlumatını dəyişmək istəyirəm",
    details: "Dəyişmək istədiyiniz mağaza məlumatını və səbəbi yazın...",
  },
  technical_problem: {
    subject: "Məsələn: mağaza panelində xəta çıxır",
    details: "Problemin harada baş verdiyini, cihaz/browser məlumatını və xəta mətnini yazın...",
  },
  other: {
    subject: "Məsələn: mağaza ilə bağlı sual",
    details: "Müraciətinizi qısa və aydın izah edin...",
  },
};

function SmallConversationCard({ item }: { item: ConversationPreview }) {
  return (
    <div className="rounded-xl border border-brand-border bg-white p-3 hover:border-brand-primary/40">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/account/messages/${item.id}`} className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-bold text-brand-text">
            {item.conversation_type === "store_support" ? "MarktX Dəstək" : item.listing_title ?? "Müştəri mesajı"}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-brand-muted">{item.last_message ?? item.status}</p>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {item.unread_count > 0 ? <span className="rounded-full bg-brand-primary px-2 py-1 text-xs font-bold text-white">{item.unread_count}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function StoreMessagingPanel({ storeId }: { storeId: string }) {
  const router = useRouter();
  const { supabase, user } = useAuthUser();
  const [items, setItems] = useState<ConversationPreview[]>([]);
  const [topic, setTopic] = useState<StoreSupportTopic>("technical_problem");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const result = await fetchStoreConversations(supabase, storeId, user.id);
      setItems(result.data);
      setError(result.error ?? "");
    } finally {
      if (!silent) setLoading(false);
      loadingRef.current = false;
    }
  }, [storeId, supabase, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!supabase || !user) return;
    const interval = window.setInterval(() => void load(true), 10000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, supabase, user]);

  const startSupport = async () => {
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
    const result = await getOrCreateStoreSupportConversation(supabase, {
      storeId,
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
      topicLabel: STORE_TOPIC_LABELS[topic],
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

  const customerMessages = items.filter((item) => item.conversation_type === "customer_store");
  const supportMessages = items.filter((item) => item.conversation_type === "store_support");
  const canSubmit = Boolean(subject.trim() && details.trim()) && !pending;
  const placeholder = STORE_TOPIC_PLACEHOLDERS[topic];

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/50 p-4">
        <h2 className="text-lg font-bold text-brand-text">Müştəri mesajları</h2>
        {loading ? <Loader2 className="mt-4 h-5 w-5 animate-spin text-brand-primary" /> : null}
        {!loading && customerMessages.length === 0 ? <p className="mt-3 text-sm text-brand-muted">Müştəri mesajı yoxdur.</p> : null}
        <div className="mt-3 space-y-2">
          {customerMessages.map((item) => (
            <SmallConversationCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-text">MarktX Dəstək</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-muted">{supportMessages.length} söhbət</span>
        </div>
        <div className="mt-3 grid gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">Mövzu</span>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value as StoreSupportTopic)}
              className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm font-semibold text-brand-text"
            >
              {STORE_SUPPORT_TOPICS.map((item) => (
                <option key={item} value={item}>
                  {STORE_TOPIC_LABELS[item]}
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
              className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
              placeholder={placeholder.subject}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-text">İlk mesaj</span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              maxLength={1600}
              className="w-full resize-y rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
              placeholder={placeholder.details}
            />
          </label>
          <label className="block rounded-xl border border-dashed border-brand-border bg-white/70 px-4 py-3">
            <span className="block text-sm font-semibold text-brand-text">Şəkil əlavə et</span>
            <span className="mt-1 block text-xs text-brand-muted">Lazımdırsa screenshot və ya foto əlavə edin. Maksimum {SUPPORT_ATTACHMENT_MAX_FILES} şəkil.</span>
            <input
              type="file"
              accept={SUPPORT_ATTACHMENT_ACCEPT}
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, SUPPORT_ATTACHMENT_MAX_FILES))}
              className="mt-3 block w-full text-sm text-brand-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-surface file:px-3 file:py-2 file:text-sm file:font-bold file:text-brand-primary"
            />
            {files.length > 0 ? <span className="mt-2 block text-xs font-semibold text-brand-muted">{files.length} şəkil seçildi</span> : null}
          </label>
          <button type="button" onClick={() => void startSupport()} disabled={!canSubmit} className="rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            {pending ? "Açılır..." : "Dəstəyə yaz"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
        <div className="mt-4 space-y-2">
          {supportMessages.map((item) => (
            <SmallConversationCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
