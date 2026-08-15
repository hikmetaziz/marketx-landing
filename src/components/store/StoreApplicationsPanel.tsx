"use client";

import { Loader2, Store } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { formatListingRelativeDate } from "@/lib/listings/format";
import {
  fetchMyConversations,
  subscribeToMyInbox,
} from "@/lib/messaging";
import {
  isStoreApplicationMessage,
  isStoreApplicationSubject,
  parseStoreApplicationMessage,
} from "@/lib/stores/parse-store-application";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import type { ConversationPreview } from "@/types/message";

function isStoreApplication(
  item: ConversationPreview,
): boolean {
  if (
    item.conversation_type !== "customer_support"
  ) {
    return false;
  }

  if (
    isStoreApplicationSubject(item.subject)
  ) {
    return true;
  }

  return isStoreApplicationMessage(
    item.last_message,
  );
}

function applicationStatusLabel(
  status: string,
): string {
  const labels: Record<string, string> = {
    open: "Göndərilib",
    waiting_support: "Yoxlanılır",
    waiting_customer: "Sizdən məlumat gözlənilir",
    waiting_store: "Mağaza tərəfindən cavab gözlənilir",
    resolved: "Tamamlanıb",
    closed: "Bağlanıb",
  };

  return labels[status] ?? status;
}

function applicationStatusClass(
  status: string,
): string {
  if (status === "resolved") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "closed") {
    return "bg-slate-100 text-slate-700";
  }

  if (status === "waiting_customer") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-blue-50 text-blue-700";
}

function StoreApplicationCard({
  item,
}: {
  item: ConversationPreview;
}) {
  const parsed = parseStoreApplicationMessage(
    item.last_message,
  );

  const storeName =
    parsed?.name.trim() ||
    "Yeni mağaza müraciəti";

  const category =
    parsed?.category.trim() || "";

  const city = parsed?.city.trim() || "";

  const meta = [category, city]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-xl border border-brand-border/90 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary-light text-brand-primary md:h-12 md:w-12">
          <Store
            className="h-5 w-5"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-brand-text md:text-base">
                {storeName}
              </h2>

              {meta ? (
                <p className="mt-1 text-sm text-brand-muted">
                  {meta}
                </p>
              ) : null}
            </div>

            <span className="shrink-0 text-xs font-semibold text-brand-muted">
              {formatListingRelativeDate(
                item.created_at,
              )}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${applicationStatusClass(
                item.status,
              )}`}
            >
              {applicationStatusLabel(
                item.status,
              )}
            </span>

            <Link
              href={`/account/messages/${item.id}`}
              className="text-sm font-bold text-brand-primary hover:underline"
            >
              Müraciətə bax
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function StoreApplicationsPanel() {
  const { supabase, user } = useAuthUser();

  const [items, setItems] = useState<
    ConversationPreview[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadingRef = useRef(false);

  const load = useCallback(
    async (silent = false) => {
      if (!supabase || !user) {
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
        const result =
          await fetchMyConversations(
            supabase,
            user.id,
          );

        setItems(
          result.data.filter(
            isStoreApplication,
          ),
        );

        setErrorMessage(
          result.error ?? "",
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }

        loadingRef.current = false;
      }
    },
    [supabase, user],
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => void load(false),
      0,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    const unsubscribe =
      subscribeToMyInbox(
        supabase,
        user.id,
        () => void load(true),
      );

    const interval = window.setInterval(
      () => void load(true),
      10000,
    );

    const onVisible = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void load(true);
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisible,
    );

    return () => {
      unsubscribe();
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        onVisible,
      );
    };
  }, [load, supabase, user]);

  if (!isSupabaseConfigured()) {
    return (
      <p className="rounded-xl border border-brand-border/90 bg-brand-surface/60 p-4 text-sm text-brand-muted md:rounded-2xl md:p-6">
        Mağaza müraciətləri hazırda
        əlçatan deyil.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-brand-border/90 bg-brand-surface/60 p-8 md:rounded-2xl md:p-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-brand-border/90 bg-brand-surface/60 p-5 text-center md:rounded-2xl md:p-8">
          <Store className="mx-auto h-8 w-8 text-brand-muted" />

          <p className="mt-3 text-base font-bold text-brand-text">
            Hələ mağaza müraciətiniz yoxdur
          </p>

          <p className="mt-2 text-sm text-brand-muted">
            Yeni mağaza açmaq üçün web
            müraciət formasını doldurun.
          </p>

          <Link
            href="/account/support"
            className="mt-4 inline-flex rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-primary-dark"
          >
            Yeni mağaza müraciəti
          </Link>
        </div>
      ) : (
        <section className="space-y-3">
          {items.map((item) => (
            <StoreApplicationCard
              key={item.id}
              item={item}
            />
          ))}
        </section>
      )}
    </div>
  );
}
