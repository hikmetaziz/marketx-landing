"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatListingPrice, formatListingRelativeDate } from "@/lib/listings/format";
import { fetchMyConversations, subscribeToMyInbox } from "@/lib/messaging";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import type { ConversationPreview } from "@/types/message";

export function MessagesInboxPanel() {
  const { supabase, user } = useAuthUser();
  const [items, setItems] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const loadingRef = useRef(false);

  const load = useCallback(
    async (silent = false) => {
      if (!supabase || !user) {
        setItems([]);
        setLoading(false);
        return;
      }

      if (loadingRef.current) return;
      loadingRef.current = true;
      if (!silent) setLoading(true);

      const { data, error } = await fetchMyConversations(supabase, user.id);
      setItems(data);
      setErrorMessage(error ?? "");
      if (!silent) setLoading(false);
      loadingRef.current = false;
    },
    [supabase, user],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!supabase || !user) return;

    const unsubscribe = subscribeToMyInbox(supabase, user.id, () => void load(true));
    const interval = window.setInterval(() => void load(true), 8000);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [load, supabase, user]);

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

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-8 text-center">
        <p className="text-3xl">💬</p>
        <p className="mt-3 text-base font-bold text-brand-text">Hələ mesaj yoxdur</p>
        <p className="mt-2 text-sm text-brand-muted">
          Elana daxil olub &quot;Mesaj yaz&quot; düyməsinə basın.
        </p>
        {errorMessage ? <p className="mt-3 text-xs font-semibold text-red-600">{errorMessage}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errorMessage ? <p className="text-xs font-semibold text-red-600">{errorMessage}</p> : null}
      {items.map((item) => {
        const isBuyer = user?.id === item.buyer_id;
        return (
          <Link
            key={item.id}
            href={`/account/messages/${item.id}`}
            className="card-premium block rounded-2xl p-4 transition-colors hover:border-brand-primary/30"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="line-clamp-1 text-base font-bold text-brand-text">{item.listing_title}</h2>
              <span className="shrink-0 text-xs font-semibold text-brand-muted">
                {formatListingRelativeDate(item.last_message_at ?? item.updated_at)}
              </span>
            </div>
            <p className="mt-1 text-xs text-brand-muted">
              {formatListingPrice(item.listing_price)} · {isBuyer ? "Satıcı ilə" : "Alıcı ilə"}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-brand-text">
              {item.last_message ?? "Söhbətə başlayın..."}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
