import type { SupabaseClient } from "@supabase/supabase-js";

import { translateSupabaseError } from "@/lib/listings/errors";
import type { Conversation, ConversationDetail, ConversationPreview, Message } from "@/types/message";

type ConversationRow = Conversation & {
  listings:
    | { title: string; price: number; slug: string | null }
    | { title: string; price: number; slug: string | null }[]
    | null;
};

function unwrapListingJoin(
  listings: ConversationRow["listings"],
): { title: string; price: number; slug: string | null } | null {
  if (!listings) return null;
  return Array.isArray(listings) ? (listings[0] ?? null) : listings;
}

function translateMessagingError(message: string): string {
  return translateSupabaseError(message);
}

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  listingId: string,
  buyerId: string,
  sellerId: string,
): Promise<{ conversationId: string | null; error: string | null }> {
  if (buyerId === sellerId) {
    return { conversationId: null, error: "Öz elanınıza mesaj yaza bilməzsiniz." };
  }

  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (findError) {
    return { conversationId: null, error: translateMessagingError(findError.message) };
  }

  if (existing?.id) {
    return { conversationId: existing.id, error: null };
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
    .select("id")
    .single();

  if (error || !data) {
    return {
      conversationId: null,
      error: error ? translateMessagingError(error.message) : "Söhbət yaradılmadı",
    };
  }

  return { conversationId: data.id, error: null };
}

export async function fetchConversationDetail(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<{ data: ConversationDetail | null; error: string | null }> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`id, listing_id, buyer_id, seller_id, created_at, updated_at, listings ( title, price, slug )`)
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) {
    return {
      data: null,
      error: error ? translateMessagingError(error.message) : "Söhbət tapılmadı",
    };
  }

  const row = data as ConversationRow;

  if (row.buyer_id !== userId && row.seller_id !== userId) {
    return { data: null, error: "Bu söhbətə giriş yoxdur." };
  }

  const listing = unwrapListingJoin(row.listings);

  return {
    data: {
      id: row.id,
      listing_id: row.listing_id,
      buyer_id: row.buyer_id,
      seller_id: row.seller_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      listing_title: listing?.title ?? "Elan",
      listing_price: listing?.price ?? 0,
      listing_slug: listing?.slug ?? null,
      other_user_id: row.buyer_id === userId ? row.seller_id : row.buyer_id,
    },
    error: null,
  };
}

export async function fetchMyConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: ConversationPreview[]; error: string | null }> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`id, listing_id, buyer_id, seller_id, created_at, updated_at, listings ( title, price, slug )`)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) {
    return { data: [], error: translateMessagingError(error.message) };
  }

  const rows = (data ?? []) as ConversationRow[];
  const previews: ConversationPreview[] = [];

  for (const row of rows) {
    const listing = unwrapListingJoin(row.listings);
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("body, created_at")
      .eq("conversation_id", row.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    previews.push({
      id: row.id,
      listing_id: row.listing_id,
      buyer_id: row.buyer_id,
      seller_id: row.seller_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      listing_title: listing?.title ?? "Elan",
      listing_price: listing?.price ?? 0,
      listing_slug: listing?.slug ?? null,
      other_user_id: row.buyer_id === userId ? row.seller_id : row.buyer_id,
      last_message: lastMsg?.body ?? null,
      last_message_at: lastMsg?.created_at ?? null,
    });
  }

  return { data: previews, error: null };
}

export async function fetchMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<{ data: Message[]; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: translateMessagingError(error.message) };
  }

  return { data: (data as Message[]) ?? [], error: null };
}

export async function fetchMessagesAfter(
  supabase: SupabaseClient,
  conversationId: string,
  afterCreatedAt: string,
): Promise<{ data: Message[]; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .gt("created_at", afterCreatedAt)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: translateMessagingError(error.message) };
  }

  return { data: (data as Message[]) ?? [], error: null };
}

export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  body: string,
): Promise<{ data: Message | null; error: string | null }> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { data: null, error: "Mesaj boş ola bilməz." };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error ? translateMessagingError(error.message) : "Mesaj göndərilmədi",
    };
  }

  return { data: data as Message, error: null };
}

export function subscribeToMessages(
  supabase: SupabaseClient,
  conversationId: string,
  onInsert: (message: Message) => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToMyInbox(
  supabase: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`inbox:${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
      onChange(),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "conversations" },
      (payload) => {
        const row = payload.new as Conversation;
        if (row.buyer_id === userId || row.seller_id === userId) onChange();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function notifyMessageRecipient(
  supabase: SupabaseClient,
  payload: {
    to_user_id: string;
    conversation_id: string;
    title: string;
    body: string;
  },
): Promise<void> {
  try {
    await supabase.functions.invoke("send-push", { body: payload });
  } catch {
    // Push optional — mesaj DB-də saxlanılır
  }
}
