export type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ConversationPreview = Conversation & {
  listing_title: string;
  listing_price: number;
  listing_slug: string | null;
  other_user_id: string;
  last_message: string | null;
  last_message_at: string | null;
};

export type ConversationDetail = Conversation & {
  listing_title: string;
  listing_price: number;
  listing_slug: string | null;
  other_user_id: string;
};
