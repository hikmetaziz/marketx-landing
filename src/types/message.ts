import type {
  ConversationStatus,
  ConversationType,
  CustomerSupportTopic,
  SenderContext,
  StoreSupportTopic,
} from "@/lib/messaging-contract/contract";

export type Conversation = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  conversation_type: ConversationType;
  customer_user_id: string | null;
  store_id: string | null;
  subject: string | null;
  support_topic: CustomerSupportTopic | StoreSupportTopic | null;
  assigned_admin_id: string | null;
  status: ConversationStatus;
  last_message_at: string | null;
  reported_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_context: SenderContext;
  body: string;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type StoreApplicationStatus =
  | "submitted"
  | "under_review"
  | "activation_pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "needs_review";

export type StoreApplication = {
  id: string;
  conversation_id: string;
  applicant_user_id: string;

  store_name: string;
  category_name: string | null;
  city: string | null;
  description: string | null;
  address: string | null;
  working_days: string | null;
  working_hours: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;

  status: StoreApplicationStatus;

  reviewed_by: string | null;
  reviewed_at: string | null;

  created_at: string;
  updated_at: string;
};


export type ConversationPreview = Conversation & {
  listing_title: string | null;
  listing_price: number | null;
  listing_status: string | null;
  listing_availability_status: string | null;
  listing_slug: string | null;
  listing_image_url: string | null;
  store_name: string | null;
  store_slug: string | null;
  store_logo_url: string | null;
  other_user_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;

  store_application: StoreApplication | null;
};

export type ConversationDetail = Conversation & {
  listing_title: string | null;
  listing_price: number | null;
  listing_status: string | null;
  listing_availability_status: string | null;
  listing_slug: string | null;
  listing_image_url: string | null;
  store_name: string | null;
  store_slug: string | null;
  store_logo_url: string | null;
  other_user_id: string | null;
  is_read_only: boolean;
  can_send: boolean;

  store_application: StoreApplication | null;
};

export type AdminCustomerStoreConversationSummary = {
  id: string;
  status: ConversationStatus;
  queue_reason: "reported" | "escalated";
  store_id: string;
  store_name: string | null;
  store_slug: string | null;
  listing_id: string | null;
  listing_title: string | null;
  listing_slug: string | null;
  subject: string | null;
  reported_at: string | null;
  escalated_at: string | null;
  last_message_at: string | null;
  updated_at: string;
  report_count: number;
  latest_report_at: string | null;
};

export type AdminSupportConversationSummary = {
  id: string;
  conversation_type: "customer_support" | "store_support";
  status: ConversationStatus;
  store_id: string | null;
  store_name: string | null;
  store_slug: string | null;
  customer_user_id: string | null;
  support_topic: CustomerSupportTopic | StoreSupportTopic | null;
  subject: string | null;
  assigned_admin_id: string | null;
  last_message_at: string | null;
  last_message_body: string | null;
  created_at: string;
  updated_at: string;
};
