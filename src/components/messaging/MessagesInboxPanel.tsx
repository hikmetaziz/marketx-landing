"use client";

import { Loader2, Store } from "lucide-react";
import Link from "next/link";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  formatListingPrice,
  formatListingRelativeDate,
} from "@/lib/listings/format";
import {
  fetchMyConversations,
  subscribeToMyInbox,
  type MessagingRealtimeStatus,
} from "@/lib/messaging";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import type { ConversationPreview } from "@/types/message";

const STORE_APPLICATION_SUBJECT = "Yeni mağaza müraciəti";
const STORE_APPLICATION_HEADER = "MÜRACİƏT NÖVÜ: Yeni mağaza";
const MESSAGES_READ_EVENT = "marktx:messages-read";
const LEGACY_MESSAGES_READ_EVENT = "marktx:message-read-state-changed";

type InboxTab =
  | "store_messages"
  | "support"
  | "store_applications";

function isStoreApplication(item: ConversationPreview): boolean {
  if (item.store_application) {
    return true;
  }

  if (item.conversation_type !== "customer_support") {
    return false;
  }

  if (
    typeof item.subject === "string" &&
    item.subject.startsWith(STORE_APPLICATION_SUBJECT)
  ) {
    return true;
  }

  return (
    typeof item.last_message === "string" &&
    item.last_message.startsWith(STORE_APPLICATION_HEADER)
  );
}

function readApplicationField(
  message: string | null,
  label: string,
): string | null {
  if (!message) {
    return null;
  }

  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = message.match(
    new RegExp(`^${escapedLabel}:\\s*(.+)$`, "m"),
  );

  return match?.[1]?.trim() || null;
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

    // Köhnə müraciətlər üçün conversation status fallback-u.
    open: "Göndərilib",
    waiting_support: "Yoxlanılır",
    waiting_customer: "Sizdən məlumat gözlənilir",
    waiting_store: "Mağazadan cavab gözlənilir",
    resolved: "Təsdiqlənib",
    closed: "Bağlanıb",
  };

  return labels[status] ?? status;
}

function storeApplicationStatusClass(status: string): string {
  if (status === "approved" || status === "resolved") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "rejected" ||
    status === "cancelled" ||
    status === "closed"
  ) {
    return "bg-slate-100 text-slate-700";
  }

  if (
    status === "activation_pending" ||
    status === "waiting_customer" ||
    status === "needs_review"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-brand-primary-light text-brand-primary";
}

function isStoreOwnerCustomerConversation(
  item: ConversationPreview,
): boolean {
  return (
    item.conversation_type === "customer_store" &&
    item.viewer_role === "store"
  );
}

function statusLabel(
  status: string,
  options?: {
    storeOwnerCustomerConversation?: boolean;
  },
): string {
  if (
    options?.storeOwnerCustomerConversation &&
    status === "waiting_store"
  ) {
    return "Sizdən cavab gözləyir";
  }

  const labels: Record<string, string> = {
    open: "Açıq",
    waiting_customer: "Sizdən cavab gözləyir",
    waiting_store: "Mağazadan cavab gözləyir",
    waiting_support: "Dəstəkdən cavab gözləyir",
    resolved: "Həll olunub",
    closed: "Bağlanıb",
  };

  return labels[status] ?? status;
}

function readSupportField(
  message: string | null,
  label: "Mövzu" | "Başlıq" | "Detallar",
): string | null {
  if (!message) {
    return null;
  }

  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = message.match(
    new RegExp(
      `(?:^|\\s)${escapedLabel}:\\s*(.*?)(?=\\s+(?:Mövzu|Başlıq|Detallar):|$)`,
      "is",
    ),
  );

  return match?.[1]?.trim() || null;
}

function supportMessagePreview(item: ConversationPreview): string {
  if (item.conversation_type !== "customer_support") {
    return item.last_message ?? "Söhbətə başlayın...";
  }

  return (
    readSupportField(item.last_message, "Detallar") ??
    item.last_message ??
    "Söhbətə başlayın..."
  );
}

function cardMeta(
  item: ConversationPreview,
  storeOwnerCustomerConversation: boolean,
): string | null {
  if (item.listing_title) {
    return `${item.listing_title}${
      item.listing_price != null
        ? ` · ${formatListingPrice(item.listing_price)}`
        : ""
    }`;
  }

  if (item.conversation_type === "customer_support") {
    const topic = readSupportField(item.last_message, "Mövzu");
    const subject =
      readSupportField(item.last_message, "Başlıq") ??
      item.subject?.trim() ??
      null;
    const supportMeta = [topic, subject].filter(Boolean).join(" · ");

    return supportMeta || null;
  }

  if (
    storeOwnerCustomerConversation ||
    item.conversation_type === "store_support"
  ) {
    return null;
  }

  return null;
}

function cardTitle(item: ConversationPreview): string {
  if (item.conversation_type === "customer_store") {
    return item.store_name ?? "Mağaza";
  }

  if (item.conversation_type === "customer_support") {
    return "MarktX Dəstək";
  }

  if (item.conversation_type === "store_support") {
    return `${item.store_name ?? "Mağaza"} · Dəstək`;
  }

  return "Köhnə yazışma";
}

function ConversationCard({
  item,
}: {
  item: ConversationPreview;
}) {
  const storeOwnerCustomerConversation =
    isStoreOwnerCustomerConversation(item);
  const meta = cardMeta(item, storeOwnerCustomerConversation);
  const displayStatus = statusLabel(item.status, {
    storeOwnerCustomerConversation,
  });
  const messagePreview = supportMessagePreview(item);
  const showConversationStatus =
    item.status === "closed" || item.status === "resolved";

  return (
    <Link
      href={`/account/messages/${item.id}`}
      className="block rounded-2xl border border-brand-border/90 bg-white p-4 shadow-sm transition-colors hover:border-brand-primary/30"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-primary-light text-sm font-black text-brand-primary">
          {item.store_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.store_logo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : item.listing_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.listing_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            cardTitle(item).slice(0, 1)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-1 text-base font-bold text-brand-text">
              {cardTitle(item)}
            </h2>

            <span className="shrink-0 text-xs font-semibold text-brand-muted">
              {formatListingRelativeDate(
                item.last_message_at ?? item.updated_at,
              )}
            </span>
          </div>

          {meta ? (
            <p className="mt-1 line-clamp-1 text-xs text-brand-muted">
              {meta}
            </p>
          ) : null}

          <p className="mt-2 line-clamp-2 text-sm text-brand-text">
            {messagePreview}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
            {showConversationStatus ? (
              <span className="rounded-full bg-brand-surface px-2 py-1 text-brand-muted">
                {displayStatus}
              </span>
            ) : null}

            {item.conversation_type === "legacy_user_user" ? (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                Köhnə yazışma
              </span>
            ) : null}

            {item.unread_count > 0 ? (
              <span className="rounded-full bg-brand-primary px-2 py-1 text-white">
                {item.unread_count} yeni
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function StoreApplicationCard({ item }: { item: ConversationPreview }) {
  const application = item.store_application;
  const storeName =
    application?.store_name ??
    readApplicationField(item.last_message, "Mağaza adı") ??
    "Yeni mağaza müraciəti";
  const category =
    application?.category_name ??
    readApplicationField(item.last_message, "Kateqoriya");
  const city =
    application?.city ??
    readApplicationField(item.last_message, "Şəhər");
  const applicationStatus = application?.status ?? item.status;
  const applicationCreatedAt = application?.created_at ?? item.created_at;
  const meta = [category, city].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/account/messages/${item.id}`}
      className="block rounded-2xl border border-brand-border/90 bg-white p-4 shadow-sm transition-colors hover:border-brand-primary/30"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary-light text-brand-primary">
          <Store className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="line-clamp-1 text-base font-bold text-brand-text">
                {storeName}
              </h2>

              {meta ? (
                <p className="mt-1 text-sm text-brand-muted">{meta}</p>
              ) : null}
            </div>

            <span className="shrink-0 text-xs font-semibold text-brand-muted">
              {formatListingRelativeDate(applicationCreatedAt)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span
              className={`rounded-full px-2.5 py-1 ${storeApplicationStatusClass(
                applicationStatus,
              )}`}
            >
              {storeApplicationStatusLabel(applicationStatus)}
            </span>

            {item.unread_count > 0 ? (
              <span className="rounded-full bg-brand-primary px-2.5 py-1 text-white">
                {item.unread_count} yeni
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ConversationList({
  items,
}: {
  items: ConversationPreview[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ConversationCard
          key={item.id}
          item={item}
        />
      ))}
    </div>
  );
}

function InboxTabs({
  active,
  onChange,
  storeMessagesUnreadCount,
  supportUnreadCount,
  applicationsUnreadCount,
}: {
  active: InboxTab;
  onChange: (tab: InboxTab) => void;
  storeMessagesUnreadCount: number;
  supportUnreadCount: number;
  applicationsUnreadCount: number;
}) {
  const tabs: {
    value: InboxTab;
    label: string;
    count: number;
  }[] = [
    {
      value: "store_messages",
      label: "Mağaza mesajları",
      count: storeMessagesUnreadCount,
    },
    {
      value: "support",
      label: "Dəstək",
      count: supportUnreadCount,
    },
    {
      value: "store_applications",
      label: "Mağaza müraciətləri",
      count: applicationsUnreadCount,
    },
  ];
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activateTabAt = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;

    onChange(tab.value);
    window.requestAnimationFrame(() => {
      tabRefs.current[index]?.focus();
    });
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      activateTabAt((index + 1) % tabs.length);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      activateTabAt((index - 1 + tabs.length) % tabs.length);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      activateTabAt(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      activateTabAt(tabs.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Mesaj kateqoriyaları"
      className="flex gap-1 overflow-x-auto border-b border-brand-border/80"
    >
      {tabs.map((tab, index) => {
        const isActive = active === tab.value;

        return (
          <button
            key={tab.value}
            id={`messages-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`messages-panel-${tab.value}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            className={`relative flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-bold transition-colors ${
              isActive
                ? "text-brand-primary"
                : "text-brand-muted hover:text-brand-text"
            }`}
          >
            {tab.label}

            {tab.count > 0 ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive
                    ? "bg-brand-primary-light text-brand-primary"
                    : "bg-brand-surface text-brand-muted"
                }`}
              >
                {tab.count}
              </span>
            ) : null}

            {isActive ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-primary" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ tab }: { tab: InboxTab }) {
  const content: Record<
    InboxTab,
    { title: string; description: string }
  > = {
    store_messages: {
      title: "Hələ mağaza mesajı yoxdur",
      description:
        "Mağaza elanından söhbətə başladıqda yazışmalar burada görünəcək.",
    },
    support: {
      title: "Hələ dəstək yazışması yoxdur",
      description:
        "Dəstək səhifəsindən MarktX komandası ilə söhbətə başlaya bilərsiniz.",
    },
    store_applications: {
      title: "Hələ mağaza müraciətiniz yoxdur",
      description:
        "Yeni mağaza açmaq üçün web müraciət formasını doldurun.",
    },
  };

  return (
    <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-8 text-center">
      <p className="text-base font-bold text-brand-text">
        {content[tab].title}
      </p>
      <p className="mt-2 text-sm text-brand-muted">
        {content[tab].description}
      </p>
    </div>
  );
}

export function MessagesInboxPanel() {
  const { supabase, user } = useAuthUser();
  const [items, setItems] = useState<ConversationPreview[]>([]);
  const [activeTab, setActiveTab] =
    useState<InboxTab>("store_messages");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const loadingRef = useRef(false);
  const mountedRef = useRef(false);
  const fallbackPollingRef = useRef<number | null>(null);
  const focusSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (silent = false, reportErrors = true) => {
      if (!supabase || !user) {
        if (!mountedRef.current) return;
        setItems([]);
        setLoading(false);
        return;
      }

      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      if (!silent) {
        setLoading(true);
      }

      try {
        const { data, error } = await fetchMyConversations(
          supabase,
          user.id,
        );

        if (!mountedRef.current) {
          return;
        }

        if (error) {
          if (reportErrors) {
            setErrorMessage(error);
          }
          return;
        }

        setItems(data);
        setErrorMessage("");
      } finally {
        if (!mountedRef.current) {
          loadingRef.current = false;
          return;
        }

        if (!silent) {
          setLoading(false);
        }

        loadingRef.current = false;
      }
    },
    [supabase, user],
  );

  const clearFallbackPolling = useCallback(() => {
    if (fallbackPollingRef.current == null) return;
    window.clearInterval(fallbackPollingRef.current);
    fallbackPollingRef.current = null;
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (fallbackPollingRef.current != null) return;

    fallbackPollingRef.current = window.setInterval(
      () => void load(true, false),
      10000,
    );
  }, [load]);

  const handleRealtimeStatus = useCallback((status: MessagingRealtimeStatus) => {
    if (status === "SUBSCRIBED") {
      clearFallbackPolling();
      void load(true, false);
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      startFallbackPolling();
    }
  }, [clearFallbackPolling, load, startFallbackPolling]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    const onMessagesRead = () => {
      void load(true);
    };

    let active = true;
    const unsubscribe = subscribeToMyInbox(
      supabase,
      user.id,
      () => void load(true),
      {
        onStatus: (status) => {
          if (active) handleRealtimeStatus(status);
        },
      },
    );

    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (focusSyncTimerRef.current != null) {
        window.clearTimeout(focusSyncTimerRef.current);
      }

      focusSyncTimerRef.current = window.setTimeout(() => {
        focusSyncTimerRef.current = null;
        void load(true);
      }, 80);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(MESSAGES_READ_EVENT, onMessagesRead);
    window.addEventListener(LEGACY_MESSAGES_READ_EVENT, onMessagesRead);

    return () => {
      active = false;
      unsubscribe();
      clearFallbackPolling();
      if (focusSyncTimerRef.current != null) {
        window.clearTimeout(focusSyncTimerRef.current);
        focusSyncTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(MESSAGES_READ_EVENT, onMessagesRead);
      window.removeEventListener(LEGACY_MESSAGES_READ_EVENT, onMessagesRead);
    };
  }, [clearFallbackPolling, handleRealtimeStatus, load, supabase, user]);

  if (!isSupabaseConfigured()) {
    return (
      <p className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-sm text-brand-muted">
        Mesajlaşma hazırda əlçatan deyil.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const storeApplications = items.filter(isStoreApplication);
  const ordinaryItems = items.filter(
    (item) => !isStoreApplication(item),
  );

  const storeMessages = ordinaryItems.filter(
    (item) =>
      item.conversation_type === "customer_store" ||
      item.conversation_type === "legacy_user_user",
  );

  const support = ordinaryItems.filter(
    (item) =>
      item.conversation_type === "customer_support" ||
      item.conversation_type === "store_support",
  );

  const storeMessagesUnreadCount = storeMessages.reduce(
    (total, item) => total + item.unread_count,
    0,
  );
  const supportUnreadCount = support.reduce(
    (total, item) => total + item.unread_count,
    0,
  );
  const applicationsUnreadCount = storeApplications.reduce(
    (total, item) => total + item.unread_count,
    0,
  );

  const activeItemsCount =
    activeTab === "store_messages"
      ? storeMessages.length
      : activeTab === "support"
        ? support.length
        : storeApplications.length;

  return (
    <div className="space-y-5">
      <InboxTabs
        active={activeTab}
        onChange={setActiveTab}
        storeMessagesUnreadCount={storeMessagesUnreadCount}
        supportUnreadCount={supportUnreadCount}
        applicationsUnreadCount={applicationsUnreadCount}
      />

      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div
        id={`messages-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`messages-tab-${activeTab}`}
      >
        {activeItemsCount === 0 ? (
          <EmptyState tab={activeTab} />
        ) : activeTab === "store_messages" ? (
          <ConversationList
            items={storeMessages}
          />
        ) : activeTab === "support" ? (
          <ConversationList
            items={support}
          />
        ) : (
          <div className="space-y-3">
            {storeApplications.map((item) => (
              <StoreApplicationCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
