import type { SupabaseClient } from "@supabase/supabase-js";

const STORE_EDIT_ROLES = ["owner", "manager", "staff"] as const;

export type StoreListingRole = (typeof STORE_EDIT_ROLES)[number];

export type ListingManagementAccess = {
  canEdit: boolean;
  canArchive: boolean;
  role: "personal_owner" | StoreListingRole | null;
};

type ListingOwnership = {
  user_id: string | null;
  store_id: string | null;
};

export async function getActiveStoreMembershipStoreIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("store_members")
    .select("store_id")
    .eq("user_id", userId)
    .in("role", [...STORE_EDIT_ROLES]);

  if (error) {
    console.warn("Store membership listing lookup failed:", error.message);
    return [];
  }

  return [...new Set((data ?? []).map((row) => row.store_id).filter((id): id is string => typeof id === "string"))];
}

async function getExactStoreRole(
  supabase: SupabaseClient,
  storeId: string,
  userId: string,
): Promise<StoreListingRole | null> {
  const { data, error } = await supabase
    .from("store_members")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .in("role", [...STORE_EDIT_ROLES])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Store listing role check failed:", error.message);
    return null;
  }

  const role = data?.role;
  return role === "owner" || role === "manager" || role === "staff" ? role : null;
}

export async function getListingManagementAccess(
  supabase: SupabaseClient,
  listing: ListingOwnership,
  userId: string,
): Promise<ListingManagementAccess> {
  if (listing.store_id) {
    const role = await getExactStoreRole(supabase, listing.store_id, userId);
    const canArchive = role === "owner" || role === "manager";
    return {
      canEdit: role != null,
      canArchive,
      role,
    };
  }

  const isPersonalOwner = listing.user_id != null && String(listing.user_id) === String(userId);
  return {
    canEdit: isPersonalOwner,
    canArchive: isPersonalOwner,
    role: isPersonalOwner ? "personal_owner" : null,
  };
}
