"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConversationActionsMenu } from "@/components/messaging/ConversationActionsMenu";
import { dispatchMessageReadStateChanged } from "@/components/messaging/MessageNotificationHost";
import { MessageTemplateChips } from "@/components/messaging/MessageTemplateChips";
import { MESSAGE_TEMPLATES_BY_AUDIENCE, type MessageTemplateAudience } from "@/constants/message-templates";
import { formatListingPrice, formatListingRelativeDate } from "@/lib/listings/format";
import { canSubmitMessage, MESSAGE_BODY_MAX_LENGTH, validateMessageBody } from "@/lib/messaging/message-input";
import {
  classifyPaymentSafety,
  PAYMENT_BLOCK_TEXT,
  PAYMENT_BLOCK_TITLE,
  confirmPaymentSafetyWarning,
  showPaymentSafetyBlockNotice,
} from "@/lib/messaging/payment-safety";
import {
  archiveConversationForCurrentUser,
  blockCustomerStoreConversation,
  closeConversation,
  deleteConversationMessageText,
  editConversationMessage,
  fetchConversationDetail,
  fetchMessages,
  fetchMessagesAfter,
  markConversationRead,
  sendConversationMessage,
  subscribeToMessages,
} from "@/lib/messaging";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import type { ConversationDetail, Message, StoreApplication } from "@/types/message";

type ChatPanelProps = {
  conversationId: string;
};

const CLOSED_READ_ONLY_MESSAGE = "Bu söhbət bağlanıb. Yeni mesaj göndərmək mümkün deyil.";
const LEGACY_READ_ONLY_MESSAGE = "Bu köhnə yazışma yalnız oxuma rejimindədir.";
const UNAVAILABLE_LISTING_MESSAGE = "Bu məhsul artıq aktiv deyil. Əvvəlki yazışmanı davam etdirə bilərsiniz.";
const STORE_APPLICATION_SUBJECT = "Yeni mağaza müraciəti";
const STORE_APPLICATION_HEADER = "MÜRACİƏT NÖVÜ: Yeni mağaza";
const STORE_CLAIM_ACTION_MARKER = "[MARKTX_ACTION:STORE_CLAIM]";
const STORE_CLAIM_ACTION_HREF = "/account/store/claim#claim-form";
const STORE_CLAIM_DRAFT_STORAGE_KEY = "marktx_store_claim_draft";

type MessageActionsMenuProps = {
  pending?: boolean;
  onDelete: () => void;
  onEdit: () => void;
};

function MessageActionsMenu({ pending = false, onDelete, onEdit }: MessageActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleEdit = () => {
    setOpen(false);
    onEdit();
  };

  const handleDelete = () => {
    setOpen(false);
    onDelete();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={pending}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-60"
        title="Mesaj seçimləri"
        aria-label="Mesaj seçimləri"
        aria-expanded={open}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open ? (
        <div className="absolute right-0 top-8 z-30 w-36 overflow-hidden rounded-xl border border-brand-border bg-white py-1 text-brand-text shadow-lg">
          <button
            type="button"
            onClick={handleEdit}
            className="block w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-brand-surface"
          >
            Düzəlt
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            Sil
          </button>
        </div>
      ) : null}
    </div>
  );
}

function topicLabel(topic: string | null): string {
  const labels: Record<string, string> = {
    account: "Hesab",
    store_or_product_complaint: "Mağaza və ya məhsul şikayəti",
    incorrect_price: "Yanlış qiymət",
    technical_problem: "Texniki problem",
    claim: "Sahiblik",
    product_import: "Məhsul importu",
    subscription: "Abunəlik",
    moderation: "Moderasiya",
    store_information: "Mağaza məlumatları",
    other: "Digər",
  };
  return labels[topic ?? ""] ?? "Ümumi";
}

function isStoreApplicationConversation(conversation: ConversationDetail): boolean {
  if (conversation.conversation_type !== "customer_support") return false;
  if (conversation.store_application) return true;
  if (typeof conversation.subject === "string" && conversation.subject.startsWith(STORE_APPLICATION_SUBJECT)) return true;
  return false;
}

function parseStoreApplicationPayload(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = body.split("\n");
  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key && value) result[key] = value;
  }
  return result;
}

function storeApplicationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    submitted: "Göndərilib",
    under_review: "Yoxlanılır",
    activation_pending: "Kodun daxil edilməsi gözlənilir",
    approved: "Təsdiqlənib",
    rejected: "Rədd edilib",
    cancelled: "Ləğv edilib",
    needs_review: "Əlavə yoxlama tələb olunur",
    open: "Açıq",
    waiting_customer: "Sizdən cavab gözləyir",
    waiting_store: "Mağazadan cavab gözləyir",
    waiting_support: "Yoxlanılır",
    resolved: "Tamamlanıb",
    closed: "Tamamlanıb",
  };
  return labels[status] ?? status;
}

function titleForConversation(conversation: ConversationDetail): string {
  if (conversation.conversation_type === "customer_store") {
    return conversation.store_name ?? "Mağaza";
  }
  if (conversation.conversation_type === "customer_support") {
    return "MarktX Dəstək";
  }
  if (conversation.conversation_type === "store_support") {
    return `${conversation.store_name ?? "Mağaza"} · MarktX Dəstək`;
  }
  return "Köhnə yazışma";
}

function templateAudienceForConversation(
  conversation: ConversationDetail,
  userId: string,
  canAccessSupportPanel: boolean,
): MessageTemplateAudience | null {
  if (conversation.conversation_type !== "customer_store") return null;
  if (conversation.customer_user_id === userId) return "customer";
  return canAccessSupportPanel ? "support" : "store";
}

function messageMetadataText(message: Message, key: string): string | null {
  const value = message.metadata?.[key];
  return typeof value === "string" ? value : null;
}

function extractStoreClaimActionDraft(body: string): { storeCode: string; claimCode: string } | null {
  const storeCode = body.match(/\bMX-STORE-[A-Z0-9-]+\b/i)?.[0]?.toUpperCase();
  const claimCode = body.match(/Aktivasiya kodu:\s*([A-Z0-9-]{6,30})/i)?.[1]?.toUpperCase();

  if (!storeCode || !claimCode) return null;

  return { storeCode, claimCode };
}

function saveStoreClaimActionDraft(body: string): void {
  const draft = extractStoreClaimActionDraft(body);
  if (!draft) return;

  try {
    window.sessionStorage.setItem(
      STORE_CLAIM_DRAFT_STORAGE_KEY,
      JSON.stringify({
        ...draft,
        createdAt: Date.now(),
      }),
    );
  } catch {
    // Best-effort convenience only; the user can still copy the codes manually.
  }
}

function isMessageDeleted(message: Message): boolean {
  return Boolean(messageMetadataText(message, "deleted_at"));
}

function isMessageEdited(message: Message): boolean {
  return Boolean(messageMetadataText(message, "edited_at")) && !isMessageDeleted(message);
}

function isCustomerStoreListingUnavailable(conversation: ConversationDetail): boolean {
  if (conversation.conversation_type !== "customer_store" || !conversation.listing_id) return false;
  if (conversation.listing_availability_status === "unavailable") return true;
  return conversation.listing_status !== "active";
}

function readOnlyMessageForConversation(conversation: ConversationDetail): string | null {
  if (conversation.conversation_type === "legacy_user_user") return LEGACY_READ_ONLY_MESSAGE;
  if (conversation.status === "closed" || conversation.status === "resolved") return CLOSED_READ_ONLY_MESSAGE;
  return null;
}

function StoreApplicationInfoCard({
  application,
  body,
  createdAt,
  status,
}: {
  application: StoreApplication | null;
  body: string;
  createdAt: string;
  status: string;
}) {
  const payload = parseStoreApplicationPayload(body);
  const fields = [
    { label: "Mağaza adı", value: application?.store_name ?? payload["Mağaza adı"] },
    { label: "Kateqoriya", value: application?.category_name ?? payload.Kateqoriya },
    { label: "Şəhər", value: application?.city ?? payload["Şəhər"] },
    { label: "Təsvir", value: application?.description ?? payload["Təsvir"] },
    { label: "Ünvan", value: application?.address ?? payload["Ünvan"] },
    { label: "İş günləri", value: application?.working_days ?? payload["İş günləri"] },
    { label: "İş saatları", value: application?.working_hours ?? payload["İş saatları"] },
    { label: "Telefon", value: application?.phone ?? payload.Telefon },
    { label: "WhatsApp", value: application?.whatsapp ?? payload.WhatsApp },
    { label: "E-poçt", value: application?.email ?? payload["E-poçt"] },
  ];
  const effectiveStatus = application?.status ?? status;
  const effectiveCreatedAt = application?.created_at ?? createdAt;

  return (
    <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-brand-text">Mağaza müraciəti</h3>
        <span className="rounded-full bg-brand-primary-light px-2 py-0.5 text-xs font-bold text-brand-primary">
          {storeApplicationStatusLabel(effectiveStatus)}
        </span>
      </div>
      <dl className="space-y-2">
        {fields.map(({ label, value }) => {
          if (!value || value === "Qeyd edilməyib") return null;
          return (
            <div key={label} className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
              <dt className="font-semibold text-brand-muted">{label}</dt>
              <dd className="text-brand-text">{value}</dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 text-xs text-brand-muted">
        Göndərilib: {formatListingRelativeDate(effectiveCreatedAt)}
      </p>
    </div>
  );
}

function emptyConversationCopy(conversation: ConversationDetail): { title: string; description: string } {
  if (conversation.can_send) {
    return {
      title: "Söhbətə başlayın",
      description: "Mesajınızı aşağıdan yazın.",
    };
  }

  if (conversation.conversation_type === "legacy_user_user") {
    return {
      title: "Bu yazışmada mesaj yoxdur.",
      description: LEGACY_READ_ONLY_MESSAGE,
    };
  }

  if (conversation.status === "closed" || conversation.status === "resolved") {
    return {
      title: "Bu söhbətdə mesaj yoxdur.",
      description: CLOSED_READ_ONLY_MESSAGE,
    };
  }

  return {
    title: "Bu söhbətdə mesaj yoxdur.",
    description: "Yeni mesaj yazmaq mümkün deyil.",
  };
}

export function ChatPanel({ conversationId }: ChatPanelProps) {
  const router = useRouter();
  const { supabase, user, canAccessSupportPanel } = useAuthUser();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [lastFailedDraft, setLastFailedDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [messageActionId, setMessageActionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messagesRef = useRef<Message[]>([]);
  const sendingRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const messageElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const readObserverRef = useRef<IntersectionObserver | null>(null);
  const markedReadMessageIdsRef = useRef<Set<string>>(new Set());

  const markNewestVisibleIncomingMessage = useCallback(() => {
    if (!supabase || !user) return;
    if (document.visibilityState !== "visible" || !document.hasFocus()) return;

    const root = messageListRef.current;
    if (!root) return;

    const rootRect = root.getBoundingClientRect();
    let newestVisibleIncoming: Message | null = null;

    for (const message of messagesRef.current) {
      if (message.sender_id === user.id) continue;

      const element = messageElementsRef.current.get(message.id);
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const visibleWidth = Math.max(0, Math.min(rect.right, rootRect.right) - Math.max(rect.left, rootRect.left));
      const visibleHeight = Math.max(0, Math.min(rect.bottom, rootRect.bottom) - Math.max(rect.top, rootRect.top));
      const area = rect.width * rect.height;
      const visibleRatio = area > 0 ? (visibleWidth * visibleHeight) / area : 0;

      if (visibleRatio >= 0.6) {
        newestVisibleIncoming = message;
      }
    }

    if (!newestVisibleIncoming || markedReadMessageIdsRef.current.has(newestVisibleIncoming.id)) return;

    markedReadMessageIdsRef.current.add(newestVisibleIncoming.id);
    void markConversationRead(supabase, conversationId, newestVisibleIncoming.id).then(({ error }) => {
      if (error) {
        markedReadMessageIdsRef.current.delete(newestVisibleIncoming.id);
        return;
      }

      dispatchMessageReadStateChanged();
    });
  }, [conversationId, supabase, user]);

  const registerMessageElement = useCallback((messageId: string, element: HTMLDivElement | null) => {
    const previous = messageElementsRef.current.get(messageId);

    if (previous && previous !== element) {
      readObserverRef.current?.unobserve(previous);
    }

    if (element) {
      messageElementsRef.current.set(messageId, element);
      readObserverRef.current?.observe(element);
    } else {
      messageElementsRef.current.delete(messageId);
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    markedReadMessageIdsRef.current.clear();
  }, [conversationId]);

  useEffect(() => {
    if (!supabase || !user || !conversation || typeof IntersectionObserver === "undefined") return;

    const root = messageListRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      () => markNewestVisibleIncomingMessage(),
      {
        root,
        threshold: [0, 0.6, 1],
      },
    );

    readObserverRef.current = observer;
    messageElementsRef.current.forEach((element) => observer.observe(element));

    const onScroll = () => markNewestVisibleIncomingMessage();
    root.addEventListener("scroll", onScroll, { passive: true });
    const timeoutId = window.setTimeout(() => markNewestVisibleIncomingMessage(), 120);

    return () => {
      window.clearTimeout(timeoutId);
      root.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (readObserverRef.current === observer) readObserverRef.current = null;
    };
  }, [conversation, markNewestVisibleIncomingMessage, supabase, user]);

  const scrollToBottom = useCallback((smooth = true) => {
    listEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const appendMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        const next = [...prev, message];
        messagesRef.current = next;
        return next;
      });
      window.setTimeout(() => scrollToBottom(true), 80);
    },
    [scrollToBottom],
  );

  const replaceMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      const index = prev.findIndex((item) => item.id === message.id);
      if (index === -1) return prev;
      const next = [...prev];
      next[index] = message;
      messagesRef.current = next;
      return next;
    });
  }, []);

  const syncNewMessages = useCallback(async () => {
    if (!supabase) return;
    const last = messagesRef.current.at(-1);
    if (!last) {
      const { data, error } = await fetchMessages(supabase, conversationId);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setMessages(data);
      messagesRef.current = data;
      return;
    }
    const { data, error } = await fetchMessagesAfter(supabase, conversationId, last.created_at);
    if (error) {
      setErrorMessage(error);
      return;
    }
    for (const message of data) appendMessage(message);
  }, [appendMessage, conversationId, supabase]);

  useEffect(() => {
    if (!supabase || !user || !conversationId) return;

    let cancelled = false;

    void (async () => {
      setLoading(true);
      const [detailRes, messagesRes] = await Promise.all([
        fetchConversationDetail(supabase, conversationId, user.id),
        fetchMessages(supabase, conversationId),
      ]);

      if (cancelled) return;

      if (detailRes.error || !detailRes.data) {
        setErrorMessage(detailRes.error ?? "Söhbət tapılmadı");
        setConversation(null);
        setLoading(false);
        return;
      }

      setConversation(detailRes.data);
      setMessages(messagesRes.data);
      messagesRef.current = messagesRes.data;
      setErrorMessage(messagesRes.error ?? "");
      setLoading(false);
      window.setTimeout(() => scrollToBottom(false), 100);
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, scrollToBottom, supabase, user]);

  useEffect(() => {
    if (!supabase || !conversationId) return;
    return subscribeToMessages(
      supabase,
      conversationId,
      (message) => {
        appendMessage(message);
      },
      replaceMessage,
    );
  }, [appendMessage, conversationId, replaceMessage, supabase]);

  useEffect(() => {
    if (!supabase) return;
    const interval = window.setInterval(() => void syncNewMessages(), 5000);
    return () => window.clearInterval(interval);
  }, [supabase, syncNewMessages]);

  useEffect(() => {
    if (!supabase || !user || !conversationId) return;

    const refreshMessages = async () => {
      const { data, error } = await fetchMessages(supabase, conversationId);
      if (error) {
        setErrorMessage(error);
        return;
      }

      setMessages(data);
      messagesRef.current = data;
      window.setTimeout(() => markNewestVisibleIncomingMessage(), 120);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshMessages();
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [conversationId, markNewestVisibleIncomingMessage, supabase, user]);

  const handleSend = async (text?: string) => {
    const source = text ?? draft;
    const validation = validateMessageBody(source);
    if (!validation.ok || !supabase || !user || sendingRef.current || !conversation?.can_send) return;

    const safety = classifyPaymentSafety(validation.body);
    if (safety.level === "BLOCK") {
      setErrorMessage(`${PAYMENT_BLOCK_TITLE}. ${PAYMENT_BLOCK_TEXT}`);
      void showPaymentSafetyBlockNotice();
      if (!text) setDraft(validation.body);
      return;
    }

    if (safety.level === "WARN_AND_ALLOW") {
      const confirmed = await confirmPaymentSafetyWarning();
      if (!confirmed) {
        if (!text) setDraft(validation.body);
        return;
      }
    }

    sendingRef.current = true;
    setSending(true);
    setErrorMessage("");
    setLastFailedDraft("");

    try {
      const { data, error } = await sendConversationMessage(supabase, conversationId, validation.body);
      if (error) {
        setErrorMessage(error);
        setLastFailedDraft(validation.body);
        return;
      }

      if (data) {
        appendMessage(data);
        if (!text) setDraft("");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Mesaj göndərilmədi.");
      setLastFailedDraft(validation.body);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleArchive = async () => {
    if (!supabase || !user || archiving) return;
    const confirmed = window.confirm("Yazışmanı siyahıdan silmək istəyirsiniz? Yeni mesaj gəlsə, yenidən görünəcək.");
    if (!confirmed) return;

    setArchiving(true);
    setErrorMessage("");
    const result = await archiveConversationForCurrentUser(supabase, conversationId);
    setArchiving(false);
    if (result.error) {
      setErrorMessage(result.error);
      return;
    }
    router.push("/account/messages");
  };

  const handleBlock = async () => {
    if (!supabase || !user || !conversation || blocking) return;
    if (conversation.conversation_type !== "customer_store" || !conversation.store_id || !conversation.customer_user_id) return;

    const isCustomer = conversation.customer_user_id === user.id;
    const confirmed = window.confirm(
      isCustomer
        ? "Bu mağazanı bloklamaq istəyirsiniz? Bu mağazaya yeni mesaj yaza bilməyəcəksiniz."
        : "Bu istifadəçini bloklamaq istəyirsiniz? O, mağazanıza yeni mesaj yaza bilməyəcək.",
    );
    if (!confirmed) return;

    setBlocking(true);
    setErrorMessage("");
    const blockResult = await blockCustomerStoreConversation(supabase, {
      conversationId,
      reason: isCustomer ? "customer_blocked_store" : "store_or_support_blocked_customer",
    });
    setBlocking(false);
    if (blockResult.error) {
      setErrorMessage(blockResult.error);
      return;
    }

    router.push("/account/messages");
  };

  const handleClose = async () => {
    if (!supabase || !conversation || closing) return;
    if (conversation.conversation_type === "legacy_user_user" || conversation.status === "closed" || conversation.status === "resolved") return;

    const confirmed = window.confirm("Bu söhbəti bağlamaq istəyirsiniz? Bağlandıqdan sonra yeni mesaj göndərmək mümkün olmayacaq.");
    if (!confirmed) return;

    setClosing(true);
    setErrorMessage("");
    const result = await closeConversation(supabase, conversationId);
    setClosing(false);
    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setConversation((current) =>
      current
        ? {
            ...current,
            status: "closed",
            closed_at: new Date().toISOString(),
            can_send: false,
            is_read_only: current.is_read_only || current.conversation_type === "legacy_user_user",
          }
        : current,
    );
  };

  const startEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditDraft(message.body);
    setErrorMessage("");
  };

  const cancelEditMessage = () => {
    setEditingMessageId("");
    setEditDraft("");
  };

  const handleEditMessage = async (message: Message) => {
    const validation = validateMessageBody(editDraft);
    if (!supabase || !validation.ok || messageActionId) return;

    const safety = classifyPaymentSafety(validation.body);
    if (safety.level === "BLOCK") {
      setErrorMessage(`${PAYMENT_BLOCK_TITLE}. ${PAYMENT_BLOCK_TEXT}`);
      void showPaymentSafetyBlockNotice();
      return;
    }
    if (safety.level === "WARN_AND_ALLOW") {
      const confirmed = await confirmPaymentSafetyWarning();
      if (!confirmed) return;
    }

    setMessageActionId(message.id);
    setErrorMessage("");
    const result = await editConversationMessage(supabase, { messageId: message.id, body: validation.body });
    setMessageActionId("");
    if (result.error || !result.data) {
      setErrorMessage(result.error ?? "Mesaj dəyişdirilmədi.");
      return;
    }

    replaceMessage(result.data);
    cancelEditMessage();
  };

  const handleDeleteMessage = async (message: Message) => {
    if (!supabase || messageActionId) return;
    const confirmed = window.confirm("Bu mesajın mətnini silmək istəyirsiniz?");
    if (!confirmed) return;

    setMessageActionId(message.id);
    setErrorMessage("");
    const result = await deleteConversationMessageText(supabase, message.id);
    setMessageActionId("");
    if (result.error || !result.data) {
      setErrorMessage(result.error ?? "Mesaj silinmədi.");
      return;
    }

    replaceMessage(result.data);
    if (editingMessageId === message.id) cancelEditMessage();
  };

  if (!isSupabaseConfigured()) {
    return <p className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-sm text-brand-muted">Mesajlaşma hazırda əlçatan deyil.</p>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-brand-border/90 bg-brand-surface/60">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!conversation || !user) {
    return (
      <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-8 text-center">
        <p className="text-sm font-semibold text-red-600">{errorMessage || "Söhbət tapılmadı"}</p>
        <Link href="/account/messages" className="mt-4 inline-flex text-sm font-semibold text-brand-primary hover:text-brand-primary-dark">
          Mesajlara qayıt
        </Link>
      </div>
    );
  }

  const readOnlyMessage = readOnlyMessageForConversation(conversation);
  const listingUnavailableMessage =
    !readOnlyMessage && isCustomerStoreListingUnavailable(conversation) ? UNAVAILABLE_LISTING_MESSAGE : null;
  const templateAudience = templateAudienceForConversation(conversation, user.id, canAccessSupportPanel);
  const messageTemplates = templateAudience ? MESSAGE_TEMPLATES_BY_AUDIENCE[templateAudience] : [];
  const canBlockConversation =
    conversation.conversation_type === "customer_store" &&
    Boolean(conversation.store_id && conversation.customer_user_id);
  const canCloseConversation =
    conversation.conversation_type !== "legacy_user_user" &&
    conversation.status !== "closed" &&
    conversation.status !== "resolved";
  const emptyCopy = emptyConversationCopy(conversation);

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-brand-border/90 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-brand-border/80 px-4 py-3">
        <Link href="/account/messages" className="shrink-0 text-sm font-semibold text-brand-primary hover:text-brand-primary-dark">
          Mesajlar
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-brand-text">{titleForConversation(conversation)}</h1>
          <p className="text-xs text-brand-muted">
            {conversation.conversation_type === "customer_store" && conversation.listing_title
              ? `${conversation.listing_title} · ${conversation.listing_price != null ? formatListingPrice(conversation.listing_price) : ""}`
              : conversation.conversation_type.includes("support")
                ? readOnlyMessage
                  ? topicLabel(conversation.support_topic)
                  : `${topicLabel(conversation.support_topic)} · ${conversation.status}`
                : "Köhnə yazışma"}
          </p>
        </div>
        {conversation.store_slug ? (
          <Link href={`/stores/${conversation.store_slug}`} className="shrink-0 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-primary">
            Mağaza
          </Link>
        ) : null}
        {conversation.listing_slug ? (
          <Link href={`/elanlar/${conversation.listing_slug}`} className="shrink-0 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-primary">
            Elan
          </Link>
        ) : null}
        <ConversationActionsMenu
          archiving={archiving}
          blocking={blocking}
          closing={closing}
          onArchive={() => void handleArchive()}
          onBlock={canBlockConversation ? () => void handleBlock() : undefined}
          onClose={canCloseConversation ? () => void handleClose() : undefined}
        />
      </div>

      {readOnlyMessage ? (
        <div className="border-b border-brand-border/70 bg-brand-surface/70 px-4 py-3 text-sm font-medium text-brand-muted">
          {readOnlyMessage}
        </div>
      ) : null}
      {listingUnavailableMessage ? (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {listingUnavailableMessage}
        </div>
      ) : null}

      <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <p className="text-base font-bold text-brand-text">{emptyCopy.title}</p>
            <p className="mt-2 max-w-sm text-sm text-brand-muted">{emptyCopy.description}</p>
          </div>
        ) : (
          messages.map((message, index) => {
            if (index === 0 && isStoreApplicationConversation(conversation) && message.body.startsWith(STORE_APPLICATION_HEADER)) {
              return (
                <div
                  key={message.id}
                  ref={(element) => registerMessageElement(message.id, element)}
                  data-message-id={message.id}
                >
                  <StoreApplicationInfoCard
                    application={conversation.store_application}
                    body={message.body}
                    createdAt={message.created_at}
                    status={conversation.status}
                  />
                </div>
              );
            }
            const mine = message.sender_id === user.id;
            const deleted = isMessageDeleted(message);
            const edited = isMessageEdited(message);
            const editing = editingMessageId === message.id;
            const actionPending = messageActionId === message.id;
            const hasStoreClaimAction =
              !deleted && message.body.includes(STORE_CLAIM_ACTION_MARKER);
            const displayBody = hasStoreClaimAction
              ? message.body.split(STORE_CLAIM_ACTION_MARKER).join("").trim()
              : message.body;
            const showStoreClaimAction =
              hasStoreClaimAction &&
              !mine &&
              conversation.conversation_type === "customer_support";
            const canManageMessage =
              mine && conversation.can_send && !deleted && !hasStoreClaimAction;
            return (
              <div
                key={message.id}
                ref={(element) => registerMessageElement(message.id, element)}
                data-message-id={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${mine ? "bg-brand-primary text-white" : "border border-brand-border bg-brand-surface text-brand-text"}`}>
                  {editing ? (
                    <form
                      className="space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleEditMessage(message);
                      }}
                    >
                      <textarea
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        rows={3}
                        maxLength={MESSAGE_BODY_MAX_LENGTH}
                        className="min-h-24 w-full resize-y rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/70 focus:border-white/70"
                        placeholder="Mesajı düzəldin..."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditMessage}
                          disabled={actionPending}
                          className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-bold text-white/85 disabled:opacity-60"
                        >
                          Ləğv et
                        </button>
                        <button
                          type="submit"
                          disabled={!canSubmitMessage(editDraft, actionPending)}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-brand-primary disabled:opacity-60"
                        >
                          {actionPending ? "Yadda saxlanır..." : "Yadda saxla"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`whitespace-pre-wrap text-sm leading-relaxed ${deleted ? "italic opacity-75" : ""}`}>
                            {deleted ? "Mesaj silindi" : displayBody}
                          </p>
                          {showStoreClaimAction ? (
                            <button
                              type="button"
                              onClick={() => {
                                saveStoreClaimActionDraft(message.body);
                                router.push(STORE_CLAIM_ACTION_HREF);
                              }}
                              className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary-dark"
                            >
                              Mağazanı aktivləşdir
                            </button>
                          ) : null}
                          <div className={`mt-1.5 flex items-center gap-2 text-[11px] ${mine ? "justify-end text-white/75" : "text-brand-muted"}`}>
                            <span>{formatListingRelativeDate(message.created_at)}</span>
                            {edited ? <span>Düzəldildi</span> : null}
                          </div>
                        </div>
                        {canManageMessage ? (
                          <MessageActionsMenu
                            pending={actionPending}
                            onEdit={() => startEditMessage(message)}
                            onDelete={() => void handleDeleteMessage(message)}
                          />
                        ) : null}
                      </div>
                      {actionPending ? (
                        <p className="mt-1.5 text-right text-[11px] font-semibold text-white/70">İşlənir...</p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {errorMessage ? (
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
          {lastFailedDraft && conversation.can_send ? (
            <button type="button" className="mt-1 text-xs font-bold text-brand-primary" onClick={() => void handleSend(lastFailedDraft)}>
              Yenidən göndər
            </button>
          ) : null}
        </div>
      ) : null}

      {conversation.can_send ? (
        <>
          {messageTemplates.length > 0 ? (
            <div className="border-t border-brand-border/70 px-3 pt-3">
              <MessageTemplateChips templates={messageTemplates} onSelect={(text) => void handleSend(text)} disabled={sending} />
            </div>
          ) : null}
          <form
            className="flex items-end gap-2 border-t border-brand-border/80 px-3 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Mesaj yazın..."
              rows={1}
              maxLength={MESSAGE_BODY_MAX_LENGTH}
              className="max-h-28 min-h-[42px] flex-1 resize-y rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
            />
            <button type="submit" disabled={!canSubmitMessage(draft, sending, conversation.can_send)} className="inline-flex min-w-[84px] items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Göndər"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
