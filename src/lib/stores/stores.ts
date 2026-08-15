import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { LiveListing } from "@/types/live-listing";
import type {
  PublicStoreProfile,
  Store,
  StoreClaimRequest,
  StoreStatus,
} from "@/types/store";

export type PublicStoreSummary = PublicStoreProfile & {
  active_listing_count: number;
};

export type PaginatedStoreListings = {
  listings: LiveListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const STORE_SELECT =
  "id, store_code, name, slug, description, category, category_id, contact_phone, whatsapp_phone, address, city, map_url, logo_url, cover_url, owner_id, status, created_by, created_at, updated_at";

const PUBLIC_STORE_SELECT =
  "id, store_code, name, slug, description, category, category_id, contact_phone, whatsapp_phone, address, city, map_url, logo_url, cover_url, created_at";

const STORE_LISTING_SELECT =
  "id, user_id, slug, title, description, price, category, city, condition, status, image_url, image_urls, delivery_available, view_count, created_at, updated_at";

const STORE_LISTING_PAGE_SIZE = 24;

async function getClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  try {
    return await createClient();
  } catch {
    return null;
  }
}

function getStoreListingPagination(page = 1, limit = STORE_LISTING_PAGE_SIZE) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.round(page)) : 1;
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.round(limit)) : STORE_LISTING_PAGE_SIZE;
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  return { page: safePage, limit: safeLimit, from, to };
}

function emptyStoreListingsPage(page = 1, limit = STORE_LISTING_PAGE_SIZE): PaginatedStoreListings {
  const pagination = getStoreListingPagination(page, limit);
  return {
    listings: [],
    total: 0,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: 1,
  };
}

function mapStoreActiveListingRows(rows: Array<Record<string, unknown>>): LiveListing[] {
  return rows
    .filter((row) => row.slug)
    .map((row) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      slug: row.slug as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      price: Number(row.price),
      category: row.category as string,
      city: row.city as string,
      condition: (row.condition as string | null) ?? null,
      status: "active" as const,
      image_url: (row.image_url as string | null) ?? null,
      image_urls: (row.image_urls as string[] | null) ?? null,
      delivery_available: (row.delivery_available as boolean | null) ?? null,
      view_count: Number(row.view_count ?? 0),
      created_at: row.created_at as string,
      updated_at: (row.updated_at as string | null) ?? null,
    }));
}

// ── Public ──────────────────────────────────────────────────────────────────

export const getPublicStoreBySlug = cache(
  async (slug: string): Promise<PublicStoreProfile | null> => {
    const supabase = await getClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("public_store_profiles")
      .select(PUBLIC_STORE_SELECT)
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return data as PublicStoreProfile;
  },
);

export async function getPublicStores(limit?: number): Promise<PublicStoreSummary[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  let query = supabase
    .from("public_store_profiles")
    .select(PUBLIC_STORE_SELECT)
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const stores = data as PublicStoreProfile[];
  if (stores.length === 0) return [];

  const storeIds = stores.map((store) => store.id);
  const counts = new Map<string, number>();
  const { data: listingRows } = await supabase
    .from("listings")
    .select("store_id")
    .in("store_id", storeIds)
    .eq("status", "active")
    .not("slug", "is", null);

  for (const row of (listingRows ?? []) as Array<{ store_id: string | null }>) {
    if (row.store_id) {
      counts.set(row.store_id, (counts.get(row.store_id) ?? 0) + 1);
    }
  }

  return stores.map((store) => ({
    ...store,
    active_listing_count: counts.get(store.id) ?? 0,
  }));
}

export async function getPublicStoreSlugs(): Promise<Array<{ slug: string; created_at: string }>> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("public_store_profiles")
    .select("slug, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Array<{ slug: string; created_at: string }>;
}

export async function getStoreActiveListings(storeId: string): Promise<LiveListing[]> {
  const page = await getStoreActiveListingsPage(storeId);
  return page.listings;
}

export async function getStoreActiveListingsPage(
  storeId: string,
  options: { page?: number; limit?: number } = {},
): Promise<PaginatedStoreListings> {
  const pagination = getStoreListingPagination(options.page, options.limit);
  const supabase = await getClient();
  if (!supabase) return emptyStoreListingsPage(pagination.page, pagination.limit);

  const { data, error, count } = await supabase
    .from("listings")
    .select(STORE_LISTING_SELECT, { count: "exact" })
    .eq("store_id", storeId)
    .eq("status", "active")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error || !data) return emptyStoreListingsPage(pagination.page, pagination.limit);

  const listings = mapStoreActiveListingRows(data as Array<Record<string, unknown>>);
  const total = count ?? listings.length;

  return {
    listings,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
  };
}

// ── Admin ───────────────────────────────────────────────────────────────────

export type AdminStoreStatusFilter = StoreStatus | "all";

const ADMIN_STORE_FILTERS: AdminStoreStatusFilter[] = [
  "unclaimed",
  "claim_pending",
  "claimed",
  "suspended",
  "all",
];

export function isAdminStoreStatusFilter(
  value: string | undefined,
): value is AdminStoreStatusFilter {
  return ADMIN_STORE_FILTERS.includes(value as AdminStoreStatusFilter);
}

export async function getAdminStoresByStatus(
  status: AdminStoreStatusFilter = "all",
): Promise<Store[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  let query = supabase.from("stores").select(STORE_SELECT).order("created_at", { ascending: false });
  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Store[];
}

export async function getAdminStoreById(id: string): Promise<Store | null> {
  const supabase = await getClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("stores").select(STORE_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as Store;
}

export type AdminClaimRequest = StoreClaimRequest & {
  store_name: string | null;
  requester_email: string | null;
  requester_name: string | null;
};

export type AdminStoreOwnerSummary = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
};

export async function getAdminStoreOwnerSummary(store: Store): Promise<AdminStoreOwnerSummary | null> {
  const supabase = await getClient();
  if (!supabase) return null;

  let ownerId = store.owner_id;

  if (!ownerId) {
    const { data: ownerMembership } = await supabase
      .from("store_members")
      .select("user_id")
      .eq("store_id", store.id)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    ownerId = typeof ownerMembership?.user_id === "string" ? ownerMembership.user_id : null;
  }

  if (!ownerId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, phone")
    .eq("id", ownerId)
    .maybeSingle();

  if (error || !data) {
    return {
      user_id: ownerId,
      display_name: null,
      email: null,
      phone: null,
    };
  }

  return {
    user_id: String(data.id),
    display_name: typeof data.display_name === "string" ? data.display_name : null,
    email: typeof data.email === "string" ? data.email : null,
    phone: typeof data.phone === "string" ? data.phone : null,
  };
}

export async function getAdminClaimRequests(storeId?: string): Promise<AdminClaimRequest[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  let query = supabase
    .from("store_claim_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const requests = data as StoreClaimRequest[];
  if (requests.length === 0) return [];

  const storeIds = [...new Set(requests.map((r) => r.store_id))];
  const userIds = [...new Set(requests.map((r) => r.requested_by))];

  const [storesRes, profilesRes] = await Promise.all([
    supabase.from("stores").select("id, name").in("id", storeIds),
    supabase.from("profiles").select("id, email, display_name").in("id", userIds),
  ]);

  const storeNames = new Map(
    ((storesRes.data ?? []) as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]),
  );
  const profiles = new Map(
    ((profilesRes.data ?? []) as Array<{ id: string; email: string | null; display_name: string | null }>).map(
      (p) => [p.id, p],
    ),
  );

  return requests.map((r) => ({
    ...r,
    store_name: storeNames.get(r.store_id) ?? null,
    requester_email: profiles.get(r.requested_by)?.email ?? null,
    requester_name: profiles.get(r.requested_by)?.display_name ?? null,
  }));
}

// ── Owner ───────────────────────────────────────────────────────────────────

export async function getMyStore(userId: string): Promise<Store | null> {
  const supabase = await getClient();
  if (!supabase) return null;

  const { data: membership } = await supabase
    .from("store_members")
    .select("store_id")
    .eq("user_id", userId)
    .in("role", ["owner", "manager", "staff"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const storeId = (membership as { store_id?: string } | null)?.store_id;
  if (storeId) {
    const { data: memberStore, error: memberStoreError } = await supabase
      .from("stores")
      .select(STORE_SELECT)
      .eq("id", storeId)
      .eq("status", "claimed")
      .maybeSingle();

    if (!memberStoreError && memberStore) return memberStore as Store;
  }

  const { data, error } = await supabase
    .from("stores")
    .select(STORE_SELECT)
    .eq("owner_id", userId)
    .eq("status", "claimed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as Store;
}

export async function getMyClaimRequests(userId: string): Promise<StoreClaimRequest[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const [pendingResult, historyResult] = await Promise.all([
    supabase
      .from("store_claim_requests")
      .select("*")
      .eq("requested_by", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),

    supabase
      .from("store_claim_requests")
      .select("*")
      .eq("requested_by", userId)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (pendingResult.error || historyResult.error) return [];

  const pendingRequests = (pendingResult.data ?? []) as StoreClaimRequest[];
  const recentHistory = (historyResult.data ?? []) as StoreClaimRequest[];

  return [...pendingRequests, ...recentHistory];
}

export async function getStoreListingsForOwner(storeId: string): Promise<LiveListing[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("listings")
    .select(STORE_LISTING_SELECT)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Array<Record<string, unknown>>)
    .filter((row) => row.slug)
    .map((row) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      slug: row.slug as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      price: Number(row.price),
      category: row.category as string,
      city: row.city as string,
      condition: (row.condition as string | null) ?? null,
      // Real status saxlanılır (pending/rejected daxil) — admin/owner siyahısında görünsün
      status: row.status as LiveListing["status"],
      image_url: (row.image_url as string | null) ?? null,
      image_urls: (row.image_urls as string[] | null) ?? null,
      delivery_available: (row.delivery_available as boolean | null) ?? null,
      view_count: Number(row.view_count ?? 0),
      created_at: row.created_at as string,
      updated_at: (row.updated_at as string | null) ?? null,
    }));
}
