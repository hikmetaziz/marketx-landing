import type { ListingAttributeValues } from "@/lib/taxonomy/listing-taxonomy-types";

export type ListingStatus = "pending" | "active" | "sold" | "rejected" | "archived" | "deleted";

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
  listing_number?: number | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  attributes?: ListingAttributeValues;
  expires_at?: string | null;
  store_id?: string | null;
  business_contact_phone?: string | null;
  store?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    contact_phone: string | null;
    whatsapp_phone: string | null;
  } | null;
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
  expires_at?: string | null;
  listing_number?: number | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  attributes?: unknown;
  store_id?: string | null;
};
