export type StoreStatus = "unclaimed" | "claim_pending" | "claimed" | "suspended";

export type StoreClaimRequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired";

export type Store = {
  id: string;
  store_code: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  category_id: string | null;
  contact_phone: string | null;
  whatsapp_phone: string | null;
  address: string | null;
  city: string | null;
  map_url: string | null;
  logo_url: string | null;
  cover_url: string | null;
  owner_id: string | null;
  status: StoreStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

/** Public görünüş — owner_id/status/admin sahələri YOX (public_store_profiles view). */
export type PublicStoreProfile = {
  id: string;
  store_code: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  category_id: string | null;
  contact_phone: string | null;
  whatsapp_phone: string | null;
  address: string | null;
  city: string | null;
  map_url: string | null;
  logo_url: string | null;
  cover_url: string | null;
  created_at: string;
};

export type StoreClaimRequest = {
  id: string;
  store_id: string;
  requested_by: string;
  claim_code_id: string | null;
  status: StoreClaimRequestStatus;
  submitted_store_code: string;
  submitted_phone: string | null;
  submitted_note: string | null;
  evidence_url: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type StoreMember = {
  id: string;
  store_id: string;
  user_id: string;
  role: "owner" | "manager" | "staff";
  created_at: string;
};
