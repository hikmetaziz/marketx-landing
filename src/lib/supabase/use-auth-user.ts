"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { isEmailConfirmed } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function toAuthenticatedUser(user: User | null | undefined): User | null {
  if (!user || !isEmailConfirmed(user)) return null;
  return user;
}

export function useAuthUser() {
  const supabase = useMemo(() => (isSupabaseConfigured() ? createClient() : null), []);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const loadProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (mounted) {
        setIsAdmin(data?.role === "admin");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        const nextUser = toAuthenticatedUser(session?.user);
        setUser(nextUser);
        if (nextUser) {
          void loadProfile(nextUser.id);
        } else {
          setIsAdmin(false);
        }
      }

      if (event === "INITIAL_SESSION") {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    supabase,
    user,
    loading,
    isAdmin,
    isAuthenticated: Boolean(user),
  };
}
