export const MESSAGING_CONTRACT_VERSION = 1;

export const CONVERSATION_TYPES = [
  "legacy_user_user",
  "customer_store",
  "customer_support",
  "store_support",
];

export const CONVERSATION_STATUSES = [
  "open",
  "waiting_customer",
  "waiting_store",
  "waiting_support",
  "resolved",
  "closed",
];

export const SENDER_CONTEXTS = [
  "customer",
  "store",
  "support",
  "legacy_user",
];

export const CUSTOMER_SUPPORT_TOPICS = [
  "account",
  "store_or_product_complaint",
  "incorrect_price",
  "technical_problem",
  "other",
];

export const STORE_SUPPORT_TOPICS = [
  "claim",
  "product_import",
  "subscription",
  "moderation",
  "store_information",
  "technical_problem",
  "other",
];

export const STORE_INBOX_ACCESS = {
  read: ["owner", "manager", "staff"],
  reply: ["owner", "manager", "staff"],
  support: ["owner", "manager", "staff"],
  close: ["owner", "manager"],
};

export const SUPPORT_ACCESS = {
  roles: ["admin", "moderator"],
  customerStoreAccess: ["reported", "escalated", "moderation", "legal", "security"],
};

export const LEGACY_BEHAVIOR = {
  type: "legacy_user_user",
  readable: true,
  writableDuringFoundation: true,
  writableAfterCutover: false,
  newConversationCreationAllowedDuringFoundation: true,
  newConversationCreationAllowedAfterEnforcement: false,
};

export const ROLLOUT_PHASES = {
  foundation: "additive compatibility; existing direct legacy writes remain temporarily allowed",
  frontend_cutover: "web and mobile switch to RPC creation and message sending",
  enforcement: "direct conversation/message inserts are blocked; legacy history remains readable",
};

export function buildMessagingContract() {
  return {
    version: MESSAGING_CONTRACT_VERSION,
    conversation_types: CONVERSATION_TYPES,
    conversation_statuses: CONVERSATION_STATUSES,
    sender_contexts: SENDER_CONTEXTS,
    customer_support_topics: CUSTOMER_SUPPORT_TOPICS,
    store_support_topics: STORE_SUPPORT_TOPICS,
    store_inbox_access: STORE_INBOX_ACCESS,
    support_access: SUPPORT_ACCESS,
    legacy_behavior: LEGACY_BEHAVIOR,
    rollout_phases: ROLLOUT_PHASES,
    public_conversation_summary: {
      id: "uuid",
      conversation_type: CONVERSATION_TYPES,
      status: CONVERSATION_STATUSES,
      listing_id: "uuid|null",
      customer_user_id: "uuid|null",
      store_id: "uuid|null",
      subject: "string|null",
      support_topic: "string|null",
      last_message_at: "timestamp|null",
      updated_at: "timestamp",
    },
    message_shape: {
      id: "uuid",
      conversation_id: "uuid",
      sender_id: "auth.uid",
      sender_context: SENDER_CONTEXTS,
      body: "string",
      created_at: "timestamp",
      metadata: "json",
    },
    read_state_shape: {
      conversation_id: "uuid",
      user_id: "auth.uid",
      last_read_message_id: "uuid|null",
      last_read_at: "timestamp",
      archived_at: "timestamp|null",
      muted_at: "timestamp|null",
    },
    realtime_contract: {
      open_chat: "subscribe to messages filtered by conversation_id",
      inbox: "subscribe to accessible conversation updates and reload summaries",
      avoid: "unfiltered message INSERT subscription for inbox",
    },
  };
}
