"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { MessageTemplateChips } from "@/components/messaging/MessageTemplateChips";
import { formatListingPrice, formatListingRelativeDate } from "@/lib/listings/format";
import {
  fetchConversationDetail,
  fetchMessages,
  fetchMessagesAfter,
  notifyMessageRecipient,
  sendMessage,
  subscribeToMessages,
} from "@/lib/messaging";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import type { ConversationDetail, Message } from "@/types/message";

type ChatPanelProps = {
  conversationId: string;
};

export function ChatPanel({ conversationId }: ChatPanelProps) {
  const { supabase, user } = useAuthUser();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messagesRef = useRef<Message[]>([]);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const syncNewMessages = useCallback(async () => {
    if (!supabase) return;
    const last = messagesRef.current.at(-1);
    if (!last) return;
    const { data } = await fetchMessagesAfter(supabase, conversationId, last.created_at);
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
      setErrorMessage("");
      setLoading(false);
      window.setTimeout(() => scrollToBottom(false), 100);
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, scrollToBottom, supabase, user]);

  useEffect(() => {
    if (!supabase || !conversationId) return;
    return subscribeToMessages(supabase, conversationId, appendMessage);
  }, [appendMessage, conversationId, supabase]);

  useEffect(() => {
    if (!supabase) return;
    const interval = window.setInterval(() => void syncNewMessages(), 4000);
    return () => window.clearInterval(interval);
  }, [supabase, syncNewMessages]);

  const handleSend = async (text?: string) => {
    const body = (text ?? draft).trim();
    if (!body || !supabase || !user || sending) return;

    setSending(true);
    setErrorMessage("");

    const { data, error } = await sendMessage(supabase, conversationId, user.id, body);
    if (error) {
      setErrorMessage(error);
      setSending(false);
      return;
    }

    if (data) {
      appendMessage(data);
      if (!text) setDraft("");

      if (conversation?.other_user_id) {
        void notifyMessageRecipient(supabase, {
          to_user_id: conversation.other_user_id,
          conversation_id: conversation.id,
          title: "Yeni mesaj",
          body,
        });
      }
    }

    setSending(false);
  };

  if (!isSupabaseConfigured()) {
    return (
      <p className="rounded-2xl border border-brand-border/90 bg-brand-surface/60 p-6 text-sm text-brand-muted">
        Mesajlaşma hazırda əlçatan deyil.
      </p>
    );
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
        <Link
          href="/account/messages"
          className="mt-4 inline-flex text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
        >
          ← Mesajlara qayıt
        </Link>
      </div>
    );
  }

  const isBuyer = user.id === conversation.buyer_id;

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-brand-border/90 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-brand-border/80 px-4 py-3">
        <Link
          href="/account/messages"
          className="shrink-0 text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
        >
          ← Mesajlar
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-brand-text">{conversation.listing_title}</h1>
          <p className="text-xs text-brand-muted">
            {formatListingPrice(conversation.listing_price)} · {isBuyer ? "Satıcı" : "Alıcı"}
          </p>
        </div>
        <Link
          href={
            conversation.listing_slug
              ? `/listings/${conversation.listing_slug}`
              : `/listings`
          }
          className="shrink-0 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-primary"
        >
          Elan
        </Link>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <p className="text-base font-bold text-brand-text">Söhbətə başlayın</p>
            <p className="mt-2 max-w-sm text-sm text-brand-muted">
              {isBuyer
                ? "Aşağıdakı şablon suallardan birini seçin və ya öz mesajınızı yazın."
                : "Alıcı mesaj göndərəndə burada görünəcək."}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === user.id;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
                    mine
                      ? "bg-brand-primary text-white"
                      : "border border-brand-border bg-brand-surface text-brand-text"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                  <p className={`mt-1.5 text-[11px] ${mine ? "text-white/75" : "text-brand-muted"}`}>
                    {formatListingRelativeDate(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {errorMessage ? (
        <p className="px-4 pb-2 text-xs font-semibold text-red-600">{errorMessage}</p>
      ) : null}

      {isBuyer ? (
        <div className="border-t border-brand-border/70 px-3 pt-3">
          <MessageTemplateChips onSelect={(text) => void handleSend(text)} disabled={sending} />
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
          maxLength={1000}
          className="max-h-28 min-h-[42px] flex-1 resize-y rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="inline-flex min-w-[84px] items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Göndər"}
        </button>
      </form>
    </div>
  );
}
