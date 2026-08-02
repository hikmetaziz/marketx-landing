import type { SupabaseClient } from "@supabase/supabase-js";

const ACTIVE_STORE_MEMBER_ROLES = ["owner", "manager", "staff"] as const;
const CLAIMED_STORE_STATUS = "claimed";

export const LISTING_CREATION_PERMISSION_MESSAGE =
  "Elan yerləşdirmək üçün mağaza girişiniz admin tərəfindən aktivləşdirilməlidir.";

export type ListingCreationStoreAccess =
  | { ok: true; storeId: string; storeName: string | null }
  | { ok: false; error: string };

export async function isActiveStoreMember(
  supabase: SupabaseClient,
  storeId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("store_members")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .in("role", [...ACTIVE_STORE_MEMBER_ROLES])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Store membership check failed:", error.message);
    return false;
  }

  return Boolean(data);
}

async function getClaimedStore(
  supabase: SupabaseClient,
  storeId: string,
): Promise<{ id: string; name: string | null } | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, status")
    .eq("id", storeId)
    .eq("status", CLAIMED_STORE_STATUS)
    .maybeSingle();

  if (error) {
    console.warn("Claimed store check failed:", error.message);
    return null;
  }

  if (!data) return null;
  return {
    id: String(data.id),
    name: typeof data.name === "string" ? data.name : null,
  };
}

export async function canCreateListingForStore(
  supabase: SupabaseClient,
  storeId: string,
  userId: string,
): Promise<boolean> {
  const [store, member] = await Promise.all([
    getClaimedStore(supabase, storeId),
    isActiveStoreMember(supabase, storeId, userId),
  ]);

  return Boolean(store && member);
}

export async function getListingCreationStoreAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<ListingCreationStoreAccess> {
  const { data, error } = await supabase
    .from("store_members")
    .select("store_id, role")
    .eq("user_id", userId)
    .in("role", [...ACTIVE_STORE_MEMBER_ROLES])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Listing creation membership lookup failed:", error.message);
    return { ok: false, error: LISTING_CREATION_PERMISSION_MESSAGE };
  }

  const storeId = typeof data?.store_id === "string" ? data.store_id : "";
  if (!storeId) {
    return { ok: false, error: LISTING_CREATION_PERMISSION_MESSAGE };
  }

  const store = await getClaimedStore(supabase, storeId);
  if (!store) {
    return { ok: false, error: LISTING_CREATION_PERMISSION_MESSAGE };
  }

  return { ok: true, storeId: store.id, storeName: store.name };
}
