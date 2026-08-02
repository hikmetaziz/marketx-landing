"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  addListingFavorite,
  isListingFavorited,
  removeListingFavorite,
} from "@/lib/listings/supabase-favorites";
import { subscribeToListingFavorite } from "@/lib/listings/favorites-realtime";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

export function useLiveListingFavorite(listingId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { supabase, user, loading: authLoading, isAuthenticated } = useAuthUser();
  const [favorited, setFavorited] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const favoritesAvailable = isSupabaseConfigured();
  const canFetchFavorites =
    favoritesAvailable && isAuthenticated && !authLoading && Boolean(supabase && user);

  const userId = user?.id;

  useEffect(() => {
    if (!canFetchFavorites || !supabase || !userId) {
      return;
    }

    let mounted = true;

    void isListingFavorited(supabase, listingId, userId).then((value) => {
      if (mounted) {
        setFavorited(value);
        setLoaded(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [canFetchFavorites, listingId, supabase, userId]);

  useEffect(() => {
    if (!canFetchFavorites || !supabase || !userId) {
      return;
    }

    return subscribeToListingFavorite(supabase, userId, listingId, (nextFavorited) => {
      setFavorited(nextFavorited);
      setLoaded(true);
    });
  }, [canFetchFavorites, listingId, supabase, userId]);

  const requireLogin = useCallback(() => {
    const returnTo = pathname || "/listings";
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [pathname, router]);

  const toggleFavorite = useCallback(async () => {
    if (!favoritesAvailable || !isAuthenticated || !supabase || !user) {
      requireLogin();
      return;
    }

    setErrorMessage("");
    setActionLoading(true);
    try {
      if (favorited) {
        const result = await removeListingFavorite(supabase, listingId, user.id);
        if (result.ok) {
          setFavorited(false);
        } else {
          setErrorMessage("FavoritdÉ™n Ã§Ä±xarmaq mÃ¼mkÃ¼n olmadÄ±.");
        }
      } else {
        const result = await addListingFavorite(supabase, listingId, user.id);
        if (result.ok) {
          setFavorited(true);
        } else if (result.reason === "self_favorite") {
          setErrorMessage("Öz elanınızı favoritə əlavə edə bilməzsiniz.");
        } else {
          setErrorMessage("FavoritÉ™ É™lavÉ™ etmÉ™k mÃ¼mkÃ¼n olmadÄ±.");
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
    errorMessage,
    canUseFavorites: canFetchFavorites && loaded,
    needsLogin: favoritesAvailable && !authLoading && !isAuthenticated,
    favoritesAvailable,
  };
}

