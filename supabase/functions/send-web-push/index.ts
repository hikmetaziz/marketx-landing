import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import webPush from "npm:web-push@3.6.7";

type PushRequest = {
  event?: string;
  message_id?: string;
  listing_id?: string;
  store_application_id?: string;
  conversation_id?: string;
};

type PushPayloadData = {
  conversation_id?: string;
  listing_id?: string;
  listing_slug?: string;
};

type PushTarget = {
  userId: string;
  title: string;
  body: string;
  data: PushPayloadData;
};

type WebPushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  "";
const WEB_PUSH_VAPID_PRIVATE_KEY =
  Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY") ?? "";
const WEB_PUSH_VAPID_PUBLIC_KEY =
  Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY") ?? "";
const WEB_PUSH_VAPID_SUBJECT =
  Deno.env.get("WEB_PUSH_VAPID_SUBJECT") ?? "mailto:info@marketx.az";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
};

const STORE_MEMBER_ROLES = ["owner", "manager", "staff"];

type SupabaseClientInstance = ReturnType<typeof createClient>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function createUserClient(authHeader: string): SupabaseClientInstance {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

function createAdminClient(): SupabaseClientInstance {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function readRequestString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function readProfileRole(
  supabase: SupabaseClientInstance,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return typeof data?.role === "string" ? data.role : null;
}

function canSendStoreApplicationApprovalPush(role: string | null): boolean {
  return role === "admin" || role === "moderator";
}

async function isClaimedStoreMember(
  supabase: SupabaseClientInstance,
  storeId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("store_members")
    .select("id, stores!inner(status)")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .in("role", STORE_MEMBER_ROLES)
    .eq("stores.status", "claimed")
    .maybeSingle();

  return !error && Boolean(data);
}

async function resolveMessageTargets(
  supabase: SupabaseClientInstance,
  messageId: string,
  callerUserId: string,
): Promise<PushTarget[]> {
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, sender_context")
    .eq("id", messageId)
    .maybeSingle();

  if (messageError || !message || message.sender_id !== callerUserId) {
    throw new Error("message_not_authorized");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, conversation_type, customer_user_id, store_id, buyer_id, seller_id")
    .eq("id", message.conversation_id)
    .maybeSingle();

  if (conversationError || !conversation) {
    throw new Error("conversation_not_found");
  }

  if (conversation.conversation_type === "customer_store") {
    const storeId = conversation.store_id as string | null;
    if (!storeId) return [];

    const { data: store } = await supabase
      .from("stores")
      .select("id, name, status")
      .eq("id", storeId)
      .maybeSingle();

    if (store?.status !== "claimed") return [];

    if (message.sender_context === "customer") {
      if (conversation.customer_user_id !== callerUserId) {
        throw new Error("message_not_authorized");
      }

      const { data: members, error: membersError } = await supabase
        .from("store_members")
        .select("user_id")
        .eq("store_id", storeId)
        .in("role", STORE_MEMBER_ROLES);

      if (membersError) {
        throw new Error("store_members_lookup_failed");
      }

      return unique(
        (members ?? [])
          .map((member) => member.user_id as string)
          .filter((userId) => userId !== callerUserId),
      ).map((userId) => ({
        userId,
        title: "Yeni müştəri mesajı",
        body: "Yeni mesajınız var",
        data: { conversation_id: conversation.id as string },
      }));
    }

    if (message.sender_context === "store") {
      const isMember = await isClaimedStoreMember(supabase, storeId, callerUserId);
      if (!isMember) {
        throw new Error("message_not_authorized");
      }

      const customerUserId = conversation.customer_user_id as string | null;
      if (!customerUserId || customerUserId === callerUserId) return [];

      return [
        {
          userId: customerUserId,
          title:
            typeof store?.name === "string" && store.name.trim()
              ? store.name.trim()
              : "Mağaza",
          body: "Yeni mesajınız var",
          data: { conversation_id: conversation.id as string },
        },
      ];
    }

    return [];
  }

  if (conversation.conversation_type === "legacy_user_user") {
    const buyerId = conversation.buyer_id as string | null;
    const sellerId = conversation.seller_id as string | null;
    if (callerUserId !== buyerId && callerUserId !== sellerId) {
      throw new Error("message_not_authorized");
    }

    const recipientId = callerUserId === buyerId ? sellerId : buyerId;
    if (!recipientId || recipientId === callerUserId) return [];

    return [
      {
        userId: recipientId,
        title: "Yeni mesaj",
        body: "Yeni mesajınız var",
        data: { conversation_id: conversation.id as string },
      },
    ];
  }

  return [];
}

async function resolveListingModerationTargets(
  supabase: SupabaseClientInstance,
  request: PushRequest,
  callerUserId: string,
): Promise<PushTarget[]> {
  const listingId = readRequestString(request.listing_id);
  if (!listingId) {
    throw new Error("listing_id_required");
  }

  const role = await readProfileRole(supabase, callerUserId);
  if (role !== "admin") {
    throw new Error("admin_required");
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, user_id")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing?.user_id || listing.user_id === callerUserId) {
    return [];
  }

  const title =
    request.event === "listing_approved"
      ? "Elanınız təsdiqləndi"
      : "Elanınız rədd edildi";

  return [
    {
      userId: listing.user_id as string,
      title,
      body: "MarktX hesabınızda yeniləmə var.",
      data: { listing_id: listing.id as string },
    },
  ];
}

async function resolveActivationCodeTargets(
  supabase: SupabaseClientInstance,
  request: PushRequest,
  callerUserId: string,
): Promise<PushTarget[]> {
  const role = await readProfileRole(supabase, callerUserId);
  if (!canSendStoreApplicationApprovalPush(role)) {
    throw new Error("support_admin_required");
  }

  let query = supabase
    .from("store_applications")
    .select("id, conversation_id, applicant_user_id");

  const applicationId = readRequestString(request.store_application_id);
  const conversationId = readRequestString(request.conversation_id);

  if (applicationId) {
    query = query.eq("id", applicationId);
  } else if (conversationId) {
    query = query.eq("conversation_id", conversationId);
  } else {
    throw new Error("store_application_identifier_required");
  }

  const { data: application, error } = await query.maybeSingle();
  if (error || !application?.applicant_user_id || !application.conversation_id) {
    return [];
  }

  const applicantUserId = application.applicant_user_id as string;
  if (applicantUserId === callerUserId) return [];

  return [
    {
      userId: applicantUserId,
      title: "Mağaza müraciətiniz təsdiqləndi",
      body: "Aktivasiya kodunuz hazırdır.",
      data: { conversation_id: application.conversation_id as string },
    },
  ];
}

function isStaleSubscriptionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status =
    (error as { statusCode?: unknown }).statusCode ??
    (error as { status?: unknown }).status;
  return status === 404 || status === 410;
}

async function sendToSubscriptions(
  supabase: SupabaseClientInstance,
  targets: PushTarget[],
): Promise<{ sent: number; failed: number; staleDeleted: number }> {
  const targetByUserId = new Map(targets.map((target) => [target.userId, target]));
  const recipientIds = [...targetByUserId.keys()];

  if (recipientIds.length === 0) {
    return { sent: 0, failed: 0, staleDeleted: 0 };
  }

  const { data: subscriptions, error } = await supabase
    .from("web_push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", recipientIds);

  if (error) {
    throw new Error("web_push_subscriptions_lookup_failed");
  }

  let sent = 0;
  let failed = 0;
  let staleDeleted = 0;

  for (const subscription of (subscriptions ?? []) as WebPushSubscriptionRow[]) {
    const target = targetByUserId.get(subscription.user_id);
    if (!target) continue;

    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify({
          title: target.title,
          body: target.body,
          data: target.data,
        }),
      );
      sent += 1;
    } catch (error) {
      failed += 1;

      if (isStaleSubscriptionError(error)) {
        const { error: deleteError } = await supabase
          .from("web_push_subscriptions")
          .delete()
          .eq("id", subscription.id);

        if (!deleteError) {
          staleDeleted += 1;
        }
      } else {
        console.warn("Web push delivery failed", {
          subscriptionId: subscription.id,
          error,
        });
      }
    }
  }

  return { sent, failed, staleDeleted };
}

async function resolveTargets(
  supabase: SupabaseClientInstance,
  request: PushRequest,
  callerUserId: string,
): Promise<PushTarget[]> {
  const messageId = readRequestString(request.message_id);
  if (messageId) {
    return resolveMessageTargets(supabase, messageId, callerUserId);
  }

  if (request.event === "listing_approved" || request.event === "listing_rejected") {
    return resolveListingModerationTargets(supabase, request, callerUserId);
  }

  if (request.event === "activation_code_ready") {
    return resolveActivationCodeTargets(supabase, request, callerUserId);
  }

  throw new Error("unsupported_push_event");
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !WEB_PUSH_VAPID_PRIVATE_KEY ||
    !WEB_PUSH_VAPID_PUBLIC_KEY ||
    !WEB_PUSH_VAPID_SUBJECT
  ) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return jsonResponse({ error: "auth_required" }, 401);
  }

  const userClient = createUserClient(authHeader);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "auth_required" }, 401);
  }

  let payload: PushRequest;
  try {
    payload = (await request.json()) as PushRequest;
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  webPush.setVapidDetails(
    WEB_PUSH_VAPID_SUBJECT,
    WEB_PUSH_VAPID_PUBLIC_KEY,
    WEB_PUSH_VAPID_PRIVATE_KEY,
  );

  try {
    const adminClient = createAdminClient();
    const targets = await resolveTargets(adminClient, payload, user.id);
    const result = await sendToSubscriptions(adminClient, targets);

    return jsonResponse({
      ok: true,
      recipients: targets.length,
      ...result,
    });
  } catch (error) {
    console.warn("Web push request failed", {
      error,
      event: payload.event,
      hasMessageId: Boolean(payload.message_id),
      hasListingId: Boolean(payload.listing_id),
      hasApplicationId: Boolean(payload.store_application_id),
      hasConversationId: Boolean(payload.conversation_id),
    });

    return jsonResponse({ error: "push_not_sent" }, 400);
  }
});
