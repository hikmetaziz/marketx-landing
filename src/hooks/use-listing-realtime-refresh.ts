"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { subscribeToListing, subscribeToUserListings } from "@/lib/listings/listings-realtime";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

export function useListingDetailRealtimeRefresh(listingId: string) {
  const router = useRouter();
  const { supabase } = useAuthUser();

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !listingId) {
      return;
    }

    return subscribeToListing(supabase, listingId, () => {
      router.refresh();
    });
  }, [listingId, router, supabase]);
}

export function useMyListingsRealtimeRefresh() {
  const router = useRouter();
  const { supabase, user, loading, isAuthenticated } = useAuthUser();

  useEffect(() => {
    if (!isSupabaseConfigured() || loading || !isAuthenticated || !supabase || !user) {
      return;
    }

    return subscribeToUserListings(supabase, user.id, () => {
      router.refresh();
    });
  }, [isAuthenticated, loading, router, supabase, user]);
}
