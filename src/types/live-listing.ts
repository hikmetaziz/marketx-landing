export type ListingStatus = "pending" | "active" | "sold" | "rejected" | "archived";

export type PublicListingStatus = "active" | "sold";

export type LiveListing = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  city: string;
  condition: string | null;
  status: PublicListingStatus;
  image_url: string | null;
  image_urls: string[] | null;
  delivery_available: boolean | null;
  view_count: number;
  created_at: string;
  updated_at: string | null;
};

/** Public detail view — phone is stored in listing_contacts, not on this type. */
export type LiveListingDetailView = LiveListing;

export type ListingRow = {
  id: string;
  user_id: string;
  slug: string | null;
  title: string;
  description: string | null;
  price: number;
  category: string;
  city: string;
  condition: string | null;
  status: string;
  image_url: string | null;
  image_urls: string[] | null;
  contact_phone: string | null;
  delivery_available: boolean | null;
  view_count: number;
  created_at: string;
  updated_at: string | null;
};
