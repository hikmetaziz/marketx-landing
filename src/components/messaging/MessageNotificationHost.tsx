"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchMyConversations,
  subscribeToIncomingMessages,
  subscribeToMyInbox,
} from "@/lib/messaging";

const UNREAD_COUNT_EVENT = "marktx:message-unread-count";
const READ_STATE_CHANGED_EVENT = "marktx:messages-read";
const LEGACY_READ_STATE_CHANGED_EVENT = "marktx:message-read-state-changed";

type MessageNotificationHostProps = {
  supabase: SupabaseClient | null;
  userId: string | null;
  onUnreadCountChange: (count: number) => void;
};

type ToastState = {
  conversationId: string;
  messageId: string;
} | null;

function publishUnreadCount(count: number) {
  window.dispatchEvent(
    new CustomEvent(UNREAD_COUNT_EVENT, {
      detail: { count },
    }),
  );
}

export function dispatchMessageReadStateChanged() {
  window.dispatchEvent(new Event(READ_STATE_CHANGED_EVENT));
  window.dispatchEvent(new Event(LEGACY_READ_STATE_CHANGED_EVENT));
}

export function MessageNotificationHost({
  supabase,
  userId,
  onUnreadCountChange,
}: MessageNotificationHostProps) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<number | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!supabase || !userId) {
      onUnreadCountChange(0);
      publishUnreadCount(0);
      return;
    }

    const { data, error } = await fetchMyConversations(supabase, userId);
    if (error) return;

    const unreadConversationCount = data.reduce(
      (total, conversation) => total + (conversation.unread_count > 0 ? 1 : 0),
      0,
    );
    onUnreadCountChange(unreadConversationCount);
    publishUnreadCount(unreadConversationCount);
  }, [onUnreadCountChange, supabase, userId]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const handleReadStateChanged = () => {
      void refreshUnreadCount();
    };

    window.addEventListener(READ_STATE_CHANGED_EVENT, handleReadStateChanged);
    window.addEventListener(LEGACY_READ_STATE_CHANGED_EVENT, handleReadStateChanged);
    return () => {
      window.removeEventListener(READ_STATE_CHANGED_EVENT, handleReadStateChanged);
      window.removeEventListener(LEGACY_READ_STATE_CHANGED_EVENT, handleReadStateChanged);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!supabase || !userId) return undefined;

    return subscribeToMyInbox(supabase, userId, () => {
      void refreshUnreadCount();
    });
  }, [refreshUnreadCount, supabase, userId]);

  useEffect(() => {
    if (!supabase || !userId) return undefined;

    return subscribeToIncomingMessages(supabase, userId, (message) => {
      if (seenMessageIdsRef.current.has(message.id)) return;
      seenMessageIdsRef.current.add(message.id);

      setToast({
        conversationId: message.conversation_id,
        messageId: message.id,
      });
      void refreshUnreadCount();

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }

      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 5000);
    });
  }, [refreshUnreadCount, supabase, userId]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  if (!toast) return null;

  return (
    <button
      type="button"
      className="fixed right-4 top-20 z-[80] rounded-xl border border-brand-primary/30 bg-white px-4 py-3 text-left shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition hover:border-brand-primary hover:shadow-[0_22px_55px_rgba(15,23,42,0.22)]"
      onClick={() => {
        const conversationId = toast.conversationId;
        setToast(null);
        router.push(`/account/messages/${conversationId}`);
      }}
    >
      <span className="block text-sm font-bold text-brand-text">Yeni mesaj</span>
    </button>
  );
}
