import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapMessagingError,
  type MessagingErrorContext,
} from "@/lib/messaging/errors";
import type { CustomerSupportTopic, StoreSupportTopic } from "@/lib/messaging-contract/contract";
import type {
  AdminCustomerStoreConversationSummary,
  AdminSupportConversationSummary,
  Conversation,
  ConversationDetail,
  ConversationPreview,
  ConversationViewerRole,
  Message,
  StoreApplication,
} from "@/types/message";

type ListingInfo = {
  title: string;
  price: number;
  status: string | null;
  availability_status: string | null;
  slug: string | null;
  image_url: string | null;
  image_urls: string[] | null;
};

type StoreInfo = {
  name: string;
  slug: string | null;
  logo_url: string | null;
};

const WEB_PUSH_TRIGGERED_MESSAGE_IDS = new Set<string>();

type ConversationRow = Conversation & {
  listings: ListingInfo | ListingInfo[] | null;
  stores: StoreInfo | StoreInfo[] | null;
  store_application:
    | StoreApplication
    | StoreApplication[]
    | null;
};

type AdminCustomerStoreConversationSummaryRow = Omit<AdminCustomerStoreConversationSummary, "report_count"> & {
  report_count: number | string | null;
};

type ReadState = {
  last_read_at: string | null;
  archived_at: string | null;
};

type ViewerRoleRow = {
  conversation_id: string;
  viewer_role: string | null;
};

export type MessagingRealtimeStatus =
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

type MessagingRealtimeOptions = {
  onStatus?: (status: MessagingRealtimeStatus) => void;
};

const CONVERSATION_SELECT = `
  id,
  listing_id,
  buyer_id,
  seller_id,
  conversation_type,
  customer_user_id,
  store_id,
  subject,
  support_topic,
  assigned_admin_id,
  status,
  last_message_at,
  reported_at,
  resolved_at,
  closed_at,
  created_at,
  updated_at,
  listings (
    title,
    price,
    status,
    availability_status,
    slug,
    image_url,
    image_urls
  ),
  stores (
    name,
    slug,
    logo_url
  ),
  store_application:store_applications (
    id,
    conversation_id,
    applicant_user_id,
    store_name,
    category_name,
    city,
    description,
    address,
    working_days,
    working_hours,
    phone,
    whatsapp,
    email,
    status,
    reviewed_by,
    reviewed_at,
    created_at,
    updated_at
  )
`;

const MESSAGE_SELECT = "id, conversation_id, sender_id, sender_context, body, created_at, metadata";
export const MESSAGE_HISTORY_PAGE_SIZE = 50;

function unwrapOne<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function translateMessagingError(
  error: unknown,
  context: MessagingErrorContext,
): string {
  return mapMessagingError(error, context).message;
}

function conversationOpenError(error: unknown): string {
  return translateMessagingError(error, "open_conversation");
}

function isConversationViewerRole(value: unknown): value is ConversationViewerRole {
  return value === "customer" || value === "store" || value === "support";
}

async function fetchViewerRoles(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, ConversationViewerRole>> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_conversation_viewer_roles", {
    p_conversation_ids: uniqueIds,
  });

  if (error) return new Map();

  return new Map(
    ((data ?? []) as ViewerRoleRow[])
      .filter((row) => isConversationViewerRole(row.viewer_role))
      .map((row) => [row.conversation_id, row.viewer_role as ConversationViewerRole]),
  );
}

function mapConversation(
  row: ConversationRow,
  userId?: string,
  viewerRole: ConversationViewerRole | null = null,
): ConversationDetail {
  const listing = unwrapOne(row.listings);
  const store = unwrapOne(row.stores);
  const storeApplication = unwrapOne(row.store_application);
  const listingImage = listing?.image_urls?.[0] ?? listing?.image_url ?? null;
  const legacy = row.conversation_type === "legacy_user_user";

  return {
    id: row.id,
    listing_id: row.listing_id,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    conversation_type: row.conversation_type,
    customer_user_id: row.customer_user_id,
    store_id: row.store_id,
    subject: row.subject,
    support_topic: row.support_topic,
    assigned_admin_id: row.assigned_admin_id,
    status: row.status,
    last_message_at: row.last_message_at,
    reported_at: row.reported_at,
    resolved_at: row.resolved_at,
    closed_at: row.closed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    listing_title: listing?.title ?? null,
    listing_price: listing?.price ?? null,
    listing_status: listing?.status ?? null,
    listing_availability_status: listing?.availability_status ?? null,
    listing_slug: listing?.slug ?? null,
    listing_image_url: listingImage,
    store_name: store?.name ?? null,
    store_slug: store?.slug ?? null,
    store_logo_url: store?.logo_url ?? null,
    other_user_id:
      userId && row.buyer_id === userId ? row.seller_id : userId && row.seller_id === userId ? row.buyer_id : null,
    viewer_role: viewerRole,
    is_read_only: legacy,
    can_send: !legacy && row.status !== "closed" && row.status !== "resolved",
    store_application: storeApplication,
  };
}

let realtimeTopicCounter = 0;

function uniqueRealtimeTopic(base: string): string {
  realtimeTopicCounter = (realtimeTopicCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${base}:${Date.now()}:${realtimeTopicCounter}`;
}

async function fetchLastMessage(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<{ body: string | null; created_at: string | null }> {
  const { data } = await supabase
    .from("messages")
    .select("body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    body: typeof data?.body === "string" ? data.body : null,
    created_at: typeof data?.created_at === "string" ? data.created_at : null,
  };
}

async function fetchReadState(supabase: SupabaseClient, ids: string[], userId?: string): Promise<Map<string, ReadState>> {
  if (ids.length === 0) return new Map();
  let query = supabase
    .from("conversation_reads")
    .select("conversation_id, last_read_at, archived_at")
    .in("conversation_id", ids);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data } = await query;

  return new Map(
    ((data ?? []) as Array<{ conversation_id: string; last_read_at: string | null; archived_at: string | null }>).map((row) => [
      row.conversation_id,
      { last_read_at: row.last_read_at, archived_at: row.archived_at },
    ]),
  );
}

function isArchivedForCurrentActivity(archivedAt: string | null, activityAt: string | null): boolean {
  if (!archivedAt) return false;
  if (!activityAt) return true;
  return new Date(archivedAt).getTime() >= new Date(activityAt).getTime();
}

async function toPreviews(
  supabase: SupabaseClient,
  rows: ConversationRow[],
  userId?: string,
): Promise<ConversationPreview[]> {
  const ids = rows.map((row) => row.id);
  const [readState, viewerRoles] = await Promise.all([
    fetchReadState(supabase, ids, userId),
    fetchViewerRoles(supabase, ids),
  ]);
  const previews: ConversationPreview[] = [];

  for (const row of rows) {
    const mapped = mapConversation(row, userId, viewerRoles.get(row.id) ?? null);
    const last = await fetchLastMessage(supabase, row.id);
    const state = readState.get(row.id) ?? { last_read_at: null, archived_at: null };
    if (isArchivedForCurrentActivity(state.archived_at, last.created_at ?? mapped.last_message_at ?? mapped.updated_at)) continue;

    const unread =
      last.created_at && (!state.last_read_at || new Date(last.created_at).getTime() > new Date(state.last_read_at).getTime())
        ? 1
        : 0;

    previews.push({
      ...mapped,
      last_message: last.body,
      last_message_at: last.created_at ?? mapped.last_message_at,
      unread_count: unread,
    });
  }

  return previews;
}

export async function getOrCreateCustomerStoreConversation(
  supabase: SupabaseClient,
  input: { storeId: string; listingId?: string | null; subject?: string | null },
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_or_create_customer_store_conversation", {
    p_store_id: input.storeId,
    p_listing_id: input.listingId ?? null,
    p_subject: input.subject ?? null,
  });

  if (error || !data) {
    return { conversationId: null, error: error ? conversationOpenError(error) : "Söhbət açılmadı." };
  }

  return { conversationId: String(data), error: null };
}

export async function getOrCreateCustomerSupportConversation(
  supabase: SupabaseClient,
  input: { topic: CustomerSupportTopic; subject?: string | null },
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_or_create_customer_support_conversation", {
    p_support_topic: input.topic,
    p_subject: input.subject ?? null,
  });

  if (error || !data) {
    return { conversationId: null, error: error ? conversationOpenError(error) : "Dəstək söhbəti açılmadı." };
  }

  return { conversationId: String(data), error: null };
}

export async function getOrCreateStoreSupportConversation(
  supabase: SupabaseClient,
  input: { storeId: string; topic: StoreSupportTopic; subject?: string | null },
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_or_create_store_support_conversation", {
    p_store_id: input.storeId,
    p_support_topic: input.topic,
    p_subject: input.subject ?? null,
  });

  if (error || !data) {
    return { conversationId: null, error: error ? conversationOpenError(error) : "Dəstək söhbəti açılmadı." };
  }

  return { conversationId: String(data), error: null };
}

export async function fetchConversationDetail(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<{ data: ConversationDetail | null; error: string | null }> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error ? translateMessagingError(error, "load_messages") : "Söhbət tapılmadı." };
  }

  const viewerRoles = await fetchViewerRoles(supabase, [data.id]);

  return { data: mapConversation(data as ConversationRow, userId, viewerRoles.get(data.id) ?? null), error: null };
}

export async function fetchMyConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: ConversationPreview[]; error: string | null }> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) return { data: [], error: translateMessagingError(error, "load_inbox") };
  return { data: await toPreviews(supabase, (data ?? []) as ConversationRow[], userId), error: null };
}

export async function fetchStoreConversations(
  supabase: SupabaseClient,
  storeId: string,
  userId?: string,
): Promise<{ data: ConversationPreview[]; error: string | null }> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("store_id", storeId)
    .in("conversation_type", ["customer_store", "store_support"])
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) return { data: [], error: translateMessagingError(error, "load_inbox") };
  return { data: await toPreviews(supabase, (data ?? []) as ConversationRow[], userId), error: null };
}

async function filterArchivedSupportSummaries<T extends { id: string; last_message_at: string | null; updated_at: string }>(
  supabase: SupabaseClient,
  rows: T[],
  userId?: string,
): Promise<T[]> {
  if (!userId || rows.length === 0) return rows;
  const readState = await fetchReadState(supabase, rows.map((row) => row.id), userId);
  return rows.filter((row) => {
    const state = readState.get(row.id);
    return !isArchivedForCurrentActivity(state?.archived_at ?? null, row.last_message_at ?? row.updated_at);
  });
}

export async function fetchAdminSupportConversations(
  supabase: SupabaseClient,
  input: { limit?: number; offset?: number; userId?: string } = {},
): Promise<{ data: AdminSupportConversationSummary[]; error: string | null }> {
  const { data, error } = await supabase.rpc("list_admin_support_conversations", {
    p_limit: input.limit ?? 50,
    p_offset: input.offset ?? 0,
  });

  if (error) return { data: [], error: translateMessagingError(error, "load_inbox") };
  return { data: await filterArchivedSupportSummaries(supabase, (data ?? []) as AdminSupportConversationSummary[], input.userId), error: null };
}

export async function fetchAdminCustomerStoreQueue(
  supabase: SupabaseClient,
  input: { limit?: number; offset?: number } = {},
): Promise<{ data: AdminCustomerStoreConversationSummary[]; error: string | null }> {
  const { data, error } = await supabase.rpc("list_reported_customer_store_conversations", {
    p_limit: input.limit ?? 50,
    p_offset: input.offset ?? 0,
  });

  if (error) return { data: [], error: translateMessagingError(error, "load_inbox") };

  return {
    data: ((data ?? []) as AdminCustomerStoreConversationSummaryRow[]).map((row) => ({
      ...row,
      report_count: Number(row.report_count ?? 0),
    })),
    error: null,
  };
}

export async function auditCustomerStoreConversationAccess(
  supabase: SupabaseClient,
  input: { conversationId: string; reason: "reported" | "escalated" },
): Promise<{ data: Conversation | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_audited_customer_store_conversation", {
    p_conversation_id: input.conversationId,
    p_access_reason: input.reason,
    p_metadata: { source: "admin_support_panel" },
  });

  if (error || !data) {
    return { data: null, error: error ? translateMessagingError(error, "load_messages") : "Söhbət açıla bilmədi." };
  }

  return { data: data as Conversation, error: null };
}

export async function auditStoreSupportConversationAccess(
  supabase: SupabaseClient,
  input: { conversationId: string; reason?: "support_assignment" | "moderation" | "security" },
): Promise<{ data: Conversation | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_audited_store_support_conversation", {
    p_conversation_id: input.conversationId,
    p_access_reason: input.reason ?? "support_assignment",
    p_metadata: { source: "admin_support_panel" },
  });

  if (error || !data) {
    return { data: null, error: error ? translateMessagingError(error, "load_messages") : "Söhbət açıla bilmədi." };
  }

  return { data: data as Conversation, error: null };
}

export async function fetchMessages(
  supabase: SupabaseClient,
  conversationId: string,
  options: { limit?: number } = {},
): Promise<{ data: Message[]; error: string | null }> {
  const limit = Math.max(1, Math.round(options.limit ?? MESSAGE_HISTORY_PAGE_SIZE));
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: translateMessagingError(error, "load_messages") };
  return {
    data: ((data as Message[]) ?? [])
      .map((row) => ({ ...row, metadata: row.metadata ?? {} }))
      .sort(
        (left, right) =>
          left.created_at.localeCompare(right.created_at) ||
          left.id.localeCompare(right.id),
      ),
    error: null,
  };
}

export function mergeMessages(
  current: Message[],
  incoming: Message[],
): Message[] {
  const messageMap = new Map(
    current.map((message) => [message.id, message]),
  );

  for (const message of incoming) {
    messageMap.set(message.id, message);
  }

  return [...messageMap.values()].sort(
    (left, right) =>
      left.created_at.localeCompare(right.created_at) ||
      left.id.localeCompare(right.id),
  );
}

export function filterMessagesAfterArchiveBoundary(messages: Message[], archivedAt: string | null): Message[] {
  if (!archivedAt) return messages;

  const archiveTime = new Date(archivedAt).getTime();
  if (Number.isNaN(archiveTime)) return messages;

  return messages.filter((message) => new Date(message.created_at).getTime() > archiveTime);
}

export async function fetchConversationArchiveBoundary(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<{ archivedAt: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("conversation_reads")
    .select("archived_at")
    .eq("conversation_id", conversationId)
    .limit(1);

  if (error) return { archivedAt: null, error: translateMessagingError(error, "load_messages") };

  const row = (data ?? [])[0] as { archived_at: string | null } | undefined;
  return { archivedAt: row?.archived_at ?? null, error: null };
}

export async function fetchFirstConversationMessage(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<{ data: Message | null; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: translateMessagingError(error, "load_messages") };
  }

  if (!data) {
    return { data: null, error: null };
  }

  const message = data as Message;

  return {
    data: { ...message, metadata: message.metadata ?? {} },
    error: null,
  };
}

export async function fetchMessagesAfter(
  supabase: SupabaseClient,
  conversationId: string,
  after: Pick<Message, "created_at" | "id">,
): Promise<{ data: Message[]; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .gte("created_at", after.created_at)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) return { data: [], error: translateMessagingError(error, "load_messages") };

  const messages = ((data as Message[]) ?? [])
    .map((row) => ({ ...row, metadata: row.metadata ?? {} }))
    .filter((message) => {
      const createdAtComparison = message.created_at.localeCompare(after.created_at);
      return createdAtComparison > 0 || (createdAtComparison === 0 && message.id.localeCompare(after.id) > 0);
    });

  return { data: messages, error: null };
}

export async function fetchMessagesBefore(
  supabase: SupabaseClient,
  conversationId: string,
  before: Pick<Message, "created_at" | "id">,
  options: { limit?: number; archivedAt?: string | null } = {},
): Promise<{ data: Message[]; error: string | null; hasMore: boolean }> {
  const limit = Math.max(1, Math.round(options.limit ?? MESSAGE_HISTORY_PAGE_SIZE));
  let query = supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);

  if (options.archivedAt) {
    query = query.gt("created_at", options.archivedAt);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (error) {
    return { data: [], error: translateMessagingError(error, "load_messages"), hasMore: false };
  }

  const normalized = ((data as Message[]) ?? [])
    .map((row) => ({ ...row, metadata: row.metadata ?? {} }))
    .sort(
      (left, right) =>
        left.created_at.localeCompare(right.created_at) ||
        left.id.localeCompare(right.id),
    );
  const hasMore = normalized.length > limit;
  const messages = hasMore ? normalized.slice(normalized.length - limit) : normalized;

  return { data: messages, error: null, hasMore };
}

export async function sendConversationMessage(
  supabase: SupabaseClient,
  conversationId: string,
  body: string,
): Promise<{ data: Message | null; error: string | null }> {
  const trimmed = body.trim();
  if (!trimmed) return { data: null, error: "Mesaj boş ola bilməz." };

  const { data, error } = await supabase.rpc("send_conversation_message", {
    p_conversation_id: conversationId,
    p_body: trimmed,
    p_sender_context: null,
  });

  if (error || !data) {
    return { data: null, error: error ? translateMessagingError(error, "send_message") : "Mesaj göndərilmədi." };
  }

  const message = data as Message;
  const normalizedMessage = { ...message, metadata: message.metadata ?? {} };

  triggerWebMessagePush(supabase, normalizedMessage.id);

  return { data: normalizedMessage, error: null };
}

function triggerWebMessagePush(supabase: SupabaseClient, messageId: string): void {
  if (WEB_PUSH_TRIGGERED_MESSAGE_IDS.has(messageId)) {
    return;
  }

  WEB_PUSH_TRIGGERED_MESSAGE_IDS.add(messageId);

  void supabase.functions
    .invoke("send-web-push", {
      body: { message_id: messageId },
    })
    .then(({ error }) => {
      if (error && process.env.NODE_ENV !== "production") {
        console.warn("Web message push failed", {
          messageId,
          message: error.message,
        });
      }
    })
    .catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Web message push failed", {
          messageId,
          error,
        });
      }
    });
}

export async function editConversationMessage(
  supabase: SupabaseClient,
  input: { messageId: string; body: string },
): Promise<{ data: Message | null; error: string | null }> {
  const trimmed = input.body.trim();
  if (!trimmed) return { data: null, error: "Mesaj boş ola bilməz." };

  const { data, error } = await supabase.rpc("edit_conversation_message", {
    p_message_id: input.messageId,
    p_body: trimmed,
  });

  if (error || !data) {
    return { data: null, error: error ? translateMessagingError(error, "edit_message") : "Mesaj dəyişdirilmədi." };
  }

  const message = data as Message;
  return { data: { ...message, metadata: message.metadata ?? {} }, error: null };
}

export async function deleteConversationMessageText(
  supabase: SupabaseClient,
  messageId: string,
): Promise<{ data: Message | null; error: string | null }> {
  const { data, error } = await supabase.rpc("delete_conversation_message_text", {
    p_message_id: messageId,
  });

  if (error || !data) {
    return { data: null, error: error ? translateMessagingError(error, "delete_message") : "Mesaj silinmədi." };
  }

  const message = data as Message;
  return { data: { ...message, metadata: message.metadata ?? {} }, error: null };
}

export async function markConversationRead(
  supabase: SupabaseClient,
  conversationId: string,
  lastReadMessageId?: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
    p_last_read_message_id: lastReadMessageId ?? null,
  });

  return { error: error ? translateMessagingError(error, "mark_read") : null };
}

export async function archiveConversationForCurrentUser(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc(
    "archive_conversation_for_current_user",
    {
      p_conversation_id: conversationId,
    },
  );

  return {
    error: error ? translateMessagingError(error, "archive_conversation") : null,
  };
}

export async function blockCustomerStoreConversation(
  supabase: SupabaseClient,
  input: { conversationId: string; reason?: string | null },
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("block_customer_store_conversation", {
    p_conversation_id: input.conversationId,
    p_reason: input.reason ?? "messaging_block",
  });

  return { error: error ? translateMessagingError(error, "block_conversation") : null };
}

export async function closeConversation(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("close_conversation", { p_conversation_id: conversationId });
  return { error: error ? translateMessagingError(error, "close_conversation") : null };
}

export async function reportConversation(
  supabase: SupabaseClient,
  input: { conversationId: string; reportedUserId: string; reason: string; details?: string | null },
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("report_conversation", {
    p_conversation_id: input.conversationId,
    p_reported_user_id: input.reportedUserId,
    p_reason: input.reason,
    p_details: input.details ?? null,
  });
  return { error: error ? translateMessagingError(error, "report_conversation") : null };
}

export function subscribeToMessages(
  supabase: SupabaseClient,
  conversationId: string,
  onInsert: (message: Message) => void,
  onUpdate?: (message: Message) => void,
  options?: MessagingRealtimeOptions,
): () => void {
  const channel = supabase
    .channel(uniqueRealtimeTopic(`messages:${conversationId}`))
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert({ ...(payload.new as Message), metadata: (payload.new as Message).metadata ?? {} }),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onUpdate?.({ ...(payload.new as Message), metadata: (payload.new as Message).metadata ?? {} }),
    )
    .subscribe((status) => {
      options?.onStatus?.(status as MessagingRealtimeStatus);
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToIncomingMessages(
  supabase: SupabaseClient,
  userId: string,
  onMessage: (message: Message) => void,
): () => void {
  const channel = supabase
    .channel(uniqueRealtimeTopic(`incoming-messages:${userId}`))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const message = { ...(payload.new as Message), metadata: (payload.new as Message).metadata ?? {} };
      if (message.sender_id === userId || Object.prototype.hasOwnProperty.call(message.metadata, "deleted_at")) return;
      onMessage(message);
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToMyInbox(
  supabase: SupabaseClient,
  userId: string,
  onChange: () => void,
  options?: MessagingRealtimeOptions,
): () => void {
  const channel = supabase
    .channel(uniqueRealtimeTopic(`inbox:${userId}`))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () => onChange())
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => onChange())
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_reads", filter: `user_id=eq.${userId}` }, () => onChange())
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_reads", filter: `user_id=eq.${userId}` }, () => onChange())
    .subscribe((status) => {
      options?.onStatus?.(status as MessagingRealtimeStatus);
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
