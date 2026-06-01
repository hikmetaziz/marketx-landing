"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  addListingFavorite,
  isListingFavorited,
  removeListingFavorite,
} from "@/lib/listings/supabase-favorites";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

export function useLiveListingFavorite(listingId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { supabase, user, loading: authLoading, isAuthenticated } = useAuthUser();
  const [favorited, setFavorited] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const favoritesAvailable = isSupabaseConfigured();
  const canFetchFavorites =
    favoritesAvailable && isAuthenticated && !authLoading && Boolean(supabase && user);

  useEffect(() => {
    if (!canFetchFavorites || !supabase || !user) {
      return;
    }

    let mounted = true;

    void isListingFavorited(supabase, listingId, user.id).then((value) => {
      if (mounted) {
        setFavorited(value);
        setLoaded(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [canFetchFavorites, listingId, supabase, user]);

  const requireLogin = useCallback(() => {
    const returnTo = pathname || "/listings";
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [pathname, router]);

  const toggleFavorite = useCallback(async () => {
    if (!favoritesAvailable || !isAuthenticated || !supabase || !user) {
      requireLogin();
      return;
    }

    setActionLoading(true);
    try {
      if (favorited) {
        const result = await removeListingFavorite(supabase, listingId, user.id);
        if (result.ok) {
          setFavorited(false);
        }
      } else {
        const result = await addListingFavorite(supabase, listingId, user.id);
        if (result.ok) {
          setFavorited(true);
        }
      }
    } finally {
      setActionLoading(false);
    }
  }, [
    favorited,
    favoritesAvailable,
    isAuthenticated,
    listingId,
    requireLogin,
    supabase,
    user,
  ]);

  return {
    favorited: canFetchFavorites ? favorited : false,
    toggleFavorite,
    requireLogin,
    loading: authLoading || (canFetchFavorites && !loaded),
    actionLoading,
    canUseFavorites: canFetchFavorites && loaded,
    needsLogin: favoritesAvailable && !authLoading && !isAuthenticated,
    favoritesAvailable,
  };
}
