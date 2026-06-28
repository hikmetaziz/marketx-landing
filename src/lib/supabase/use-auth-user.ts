"use client";

import type { User } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";

import { isEmailConfirmed } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function toAuthenticatedUser(user: User | null | undefined): User | null {
  if (!user || !isEmailConfirmed(user)) return null;
  return user;
}

type AuthStore = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
};

const SERVER_SNAPSHOT_CONFIGURED: AuthStore = {
  user: null,
  loading: true,
  isAdmin: false,
};

const SERVER_SNAPSHOT_UNCONFIGURED: AuthStore = {
  user: null,
  loading: false,
  isAdmin: false,
};

let store: AuthStore = isSupabaseConfigured()
  ? SERVER_SNAPSHOT_CONFIGURED
  : SERVER_SNAPSHOT_UNCONFIGURED;

const listeners = new Set<() => void>();
let initialized = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function scheduleEmit() {
  if (listeners.size === 0) {
    return;
  }
  queueMicrotask(emit);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!initialized) {
    queueMicrotask(() => initAuthStore());
  }
  return () => listeners.delete(listener);
}

function getSnapshot(): AuthStore {
  return store;
}

function getServerSnapshot(): AuthStore {
  return isSupabaseConfigured() ? SERVER_SNAPSHOT_CONFIGURED : SERVER_SNAPSHOT_UNCONFIGURED;
}

function patchStore(patch: Partial<AuthStore>) {
  if (
    (patch.user === undefined || patch.user === store.user) &&
    (patch.loading === undefined || patch.loading === store.loading) &&
    (patch.isAdmin === undefined || patch.isAdmin === store.isAdmin)
  ) {
    return;
  }

  store = { ...store, ...patch };
  scheduleEmit();
}

function initAuthStore() {
  if (initialized || typeof window === "undefined") {
    return;
  }
  initialized = true;

  if (!isSupabaseConfigured()) {
    patchStore({ loading: false });
    return;
  }

  const supabase = createClient();
  let profileUserId: string | null = null;

  const loadProfile = async (userId: string) => {
    if (profileUserId === userId) {
      return;
    }
    profileUserId = userId;

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    patchStore({ isAdmin: data?.role === "admin" });
  };

  supabase.auth.onAuthStateChange((event, session) => {
    if (
      event !== "INITIAL_SESSION" &&
      event !== "SIGNED_IN" &&
      event !== "SIGNED_OUT" &&
      event !== "TOKEN_REFRESHED"
    ) {
      return;
    }

    const nextUser = toAuthenticatedUser(session?.user);
    const userChanged =
      store.user?.id !== nextUser?.id || store.user?.email !== nextUser?.email;

    if (userChanged) {
      patchStore({
        user: nextUser,
        isAdmin: nextUser ? store.isAdmin : false,
      });
    }

    if (nextUser) {
      if (event !== "TOKEN_REFRESHED" || userChanged) {
        void loadProfile(nextUser.id);
      }
    } else {
      profileUserId = null;
      patchStore({ isAdmin: false });
    }

    if (event === "INITIAL_SESSION") {
      patchStore({ loading: false });
    }
  });
}

function getBrowserSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    return createClient();
  } catch {
    return null;
  }
}

export function useAuthUser() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    supabase: getBrowserSupabase(),
    user: snapshot.user,
    loading: snapshot.loading,
    isAdmin: snapshot.isAdmin,
    isAuthenticated: Boolean(snapshot.user),
  };
}
