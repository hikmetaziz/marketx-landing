"use client";

import {
  Headset,
  Heart,
  LogOut,
  ClipboardList,
  MessageCircle,
  Plus,
  Shield,
  Store,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { MessageNotificationHost } from "@/components/messaging/MessageNotificationHost";
import { signOutWithCleanup } from "@/lib/auth/sign-out";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

export type UserStore = {
  id: string;
  name: string | null;
  slug: string | null;
} | null;

type UserStoreLookupStatus = "idle" | "loading" | "loaded";

type UserStoreLookup = {
  userId: string | null;
  store: UserStore;
  status: UserStoreLookupStatus;
};

const UNREAD_COUNT_EVENT = "marktx:message-unread-count";
let latestUnreadMessageCount = 0;

type HeaderAuthActionsProps = {
  homepage?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
};

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function HeaderAuthPlaceholder({ mobile }: { mobile: boolean }) {
  if (mobile) {
    return (
      <>
        <div className="h-10 rounded-xl border border-transparent" aria-hidden="true" />
        <div className="h-10 rounded-xl border border-transparent" aria-hidden="true" />
      </>
    );
  }

  return (
    <>
      <div className="h-10 w-[108px] rounded-xl border border-transparent" aria-hidden="true" />
      <div className="h-10 w-[156px] rounded-xl border border-transparent" aria-hidden="true" />
    </>
  );
}

function MessageUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-brand-primary px-1.5 text-[11px] font-black leading-5 text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function HeaderAuthActions({
  homepage = false,
  mobile = false,
  onNavigate,
}: HeaderAuthActionsProps) {
  const hydrated = useHydrated();
  const { user, loading, isAdmin, canAccessSupportPanel, supabase } = useAuthUser();
  const userId = user?.id ?? null;
  const [userStoreLookup, setUserStoreLookup] = useState<UserStoreLookup>({
    userId: null,
    store: null,
    status: "idle",
  });
  const [unreadMessageCount, setUnreadMessageCount] = useState(latestUnreadMessageCount);
  const userStoreRequestForRef = useRef<string | null>(null);
  const userStoreRequestSeqRef = useRef(0);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    user?.phone ??
    null;

  const handleUnreadMessageCountChange = useCallback((count: number) => {
    latestUnreadMessageCount = count;
    setUnreadMessageCount(count);
  }, []);

  useEffect(() => {
    const handleUnreadCountEvent = (event: Event) => {
      const count = (event as CustomEvent<{ count?: unknown }>).detail?.count;
      if (typeof count === "number") {
        latestUnreadMessageCount = count;
        setUnreadMessageCount(count);
      }
    };

    window.addEventListener(UNREAD_COUNT_EVENT, handleUnreadCountEvent);
    return () => {
      window.removeEventListener(UNREAD_COUNT_EVENT, handleUnreadCountEvent);
    };
  }, []);

  const loadUserStore = useCallback(() => {
    const currentSupabase = supabase;
    const currentUserId = userId;
    if (!currentSupabase || !currentUserId) {
      return;
    }

    if (
      (userStoreLookup.userId === currentUserId && userStoreLookup.status === "loaded") ||
      userStoreRequestForRef.current === currentUserId
    ) {
      return;
    }

    const requestSeq = userStoreRequestSeqRef.current + 1;
    userStoreRequestSeqRef.current = requestSeq;
    userStoreRequestForRef.current = currentUserId;
    setUserStoreLookup((current) => ({
      userId: currentUserId,
      store: current.userId === currentUserId ? current.store : null,
      status: "loading",
    }));

    void (async () => {
      let nextStore: UserStore = null;

      try {
        const { data: membership } = await currentSupabase
          .from("store_members")
          .select("store_id")
          .eq("user_id", currentUserId)
          .in("role", ["owner", "manager", "staff"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const storeId = (membership as { store_id?: string } | null)?.store_id;
        if (storeId) {
          const { data: storeRow, error } = await currentSupabase
            .from("stores")
            .select("id, name, slug")
            .eq("id", storeId)
            .maybeSingle();

          if (!error && storeRow) {
            nextStore = {
              id: String(storeRow.id),
              name: typeof storeRow.name === "string" ? storeRow.name : null,
              slug: typeof storeRow.slug === "string" ? storeRow.slug : null,
            };
          }
        }

        if (!nextStore) {
          const { data: ownedStore, error: ownedError } = await currentSupabase
            .from("stores")
            .select("id, name, slug")
            .eq("owner_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!ownedError && ownedStore) {
            nextStore = {
              id: String(ownedStore.id),
              name: typeof ownedStore.name === "string" ? ownedStore.name : null,
              slug: typeof ownedStore.slug === "string" ? ownedStore.slug : null,
            };
          }
        }
      } catch {
        nextStore = null;
      }

      if (userStoreRequestSeqRef.current === requestSeq) {
        userStoreRequestForRef.current = null;
        setUserStoreLookup({
          userId: currentUserId,
          store: nextStore,
          status: "loaded",
        });
      }
    })();
  }, [supabase, userId, userStoreLookup.status, userStoreLookup.userId]);

  useEffect(() => {
    if (homepage && mobile && userId) {
      loadUserStore();
    }
  }, [homepage, loadUserStore, mobile, userId]);

  const handleSignOut = async () => {
    if (!supabase) return;
    latestUnreadMessageCount = 0;
    setUnreadMessageCount(0);
    await signOutWithCleanup(supabase);
    onNavigate?.();
    window.location.href = "/";
  };

  const notificationHost = !mobile && user ? (
    <MessageNotificationHost
      supabase={supabase}
      userId={user.id}
      onUnreadCountChange={handleUnreadMessageCountChange}
    />
  ) : null;

  if (!hydrated || loading) {
    return <HeaderAuthPlaceholder mobile={mobile} />;
  }

  const currentUserStore = userStoreLookup.userId === userId ? userStoreLookup.store : null;
  const currentUserStoreLookupStatus =
    userStoreLookup.userId === userId ? userStoreLookup.status : "idle";

  if (homepage) {
    const storeProfileLink = currentUserStore
      ? { href: "/account/store", label: "Mağazam", icon: Store }
      : currentUserStoreLookupStatus === "loading"
        ? { href: "/account/store", label: "Mağazam", icon: Store }
        : { href: "/account/store/apply", label: "Mağaza aç", icon: Store };
    const profileLinks = [
      { href: "/account", label: "Profilim", icon: UserIcon },
      { href: "/account/favorites", label: "Seçilmişlər", icon: Heart },
      { href: "/account/listings", label: "Elanlarım", icon: ClipboardList },
      { href: "/account/messages", label: "Mesajlar", icon: MessageCircle },
      { href: "/account/support", label: "Dəstək", icon: Headset },
      storeProfileLink,
    ] as const;
    const profileInitial = displayName?.trim().charAt(0).toLocaleUpperCase("az-AZ") || "P";

    if (!user) {
      return mobile ? (
        <Link
          href="/login"
          className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-primary-light/30 hover:text-brand-primary-dark"
          onClick={onNavigate}
        >
          <UserIcon className="h-4 w-4 text-brand-muted" aria-hidden="true" />
          Profil
        </Link>
      ) : (
        <Link
          href="/login"
          className="grid h-10 w-10 place-items-center rounded-full bg-brand-navy text-xs font-extrabold text-white transition-colors hover:bg-brand-primary"
          aria-label="Daxil ol"
          title="Daxil ol"
        >
          <UserIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      );
    }

    return (
      <>
        {notificationHost}
        {user ? (
          mobile ? (
            <>
              <Link
                href="/account"
                className="mt-1 block border-t border-brand-border px-3 pb-1 pt-3"
                onClick={onNavigate}
              >
                <span className="block truncate text-sm font-bold text-brand-text">
                  {displayName ?? "Profil"}
                </span>
                <span className="mt-0.5 block text-xs text-brand-muted">Şəxsi hesab</span>
              </Link>
              {profileLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-primary-light/30 hover:text-brand-primary-dark"
                  onClick={onNavigate}
                >
                  <Icon className="h-4 w-4 text-brand-muted" aria-hidden="true" />
                  {label}
                  {href === "/account/messages" ? <MessageUnreadBadge count={unreadMessageCount} /> : null}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-10 items-center gap-2 border-t border-brand-border px-3 text-sm font-semibold text-red-600"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Çıxış
              </button>
            </>
          ) : (
            <details
              className="group relative"
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  loadUserStore();
                }
              }}
            >
              <summary
                className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full bg-brand-navy text-xs font-extrabold text-white transition-colors hover:bg-brand-primary group-open:bg-brand-primary"
                aria-label="Profil menyusunu aç"
                title="Profil"
              >
                {profileInitial}
              </summary>
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[60] w-64 rounded-lg border border-brand-border bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                <Link
                  href="/account"
                  className="block border-b border-brand-border px-3 py-2.5"
                  onClick={onNavigate}
                >
                  <span className="block truncate text-sm font-bold text-brand-text">
                    {displayName ?? "Profil"}
                  </span>
                  <span className="mt-0.5 block text-xs text-brand-muted">Şəxsi hesab</span>
                </Link>
                <nav className="py-1" aria-label="Profil naviqasiyası">
                  {profileLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-primary-light/30 hover:text-brand-primary-dark"
                    >
                      <Icon className="h-4 w-4 text-brand-muted" aria-hidden="true" />
                      {label}
                      {href === "/account/messages" ? <MessageUnreadBadge count={unreadMessageCount} /> : null}
                    </Link>
                  ))}
                </nav>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex min-h-10 w-full items-center gap-2.5 border-t border-brand-border px-3 pt-2 text-sm font-semibold text-red-600"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Çıxış
                </button>
              </div>
            </details>
          )
        ) : null}
      </>
    );
  }

  if (displayName && user) {
    const adminBadge = isAdmin ? (
      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Admin</span>
    ) : null;
    const supportBadge = !isAdmin && canAccessSupportPanel ? (
      <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">Support</span>
    ) : null;

    if (mobile) {
      return (
        <>
          {notificationHost}
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5">
            <span className="text-sm font-semibold text-brand-text">{displayName}</span>
            {adminBadge}
            {supportBadge}
          </div>
          {isAdmin ? (
            <Link
              href="/admin/listings"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-900"
              onClick={onNavigate}
            >
              <Shield className="h-4 w-4" /> Moderasiya
            </Link>
          ) : null}
          {!isAdmin && canAccessSupportPanel ? (
            <Link
              href="/admin/support"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 text-sm font-semibold text-sky-900"
              onClick={onNavigate}
            >
              <Headset className="h-4 w-4" /> Support
            </Link>
          ) : null}
          <Link
            href="/account/messages"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border text-sm font-semibold"
            onClick={onNavigate}
          >
            <MessageCircle className="h-4 w-4" /> Mesajlar
            <MessageUnreadBadge count={unreadMessageCount} />
          </Link>
          <Link
            href="/account/listings"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border text-sm font-semibold"
            onClick={onNavigate}
          >
            <ClipboardList className="h-4 w-4" /> Elanlarım
          </Link>
          <Link
            href="/elan-yarat"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-semibold text-white"
            onClick={onNavigate}
          >
            <Plus className="h-4 w-4" /> Elan yerləşdir
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border text-sm font-semibold"
          >
            <LogOut className="h-4 w-4" /> Çıxış
          </button>
        </>
      );
    }

    return (
      <>
        {notificationHost}
        {!isAdmin ? (
          <div className="hidden max-w-[100px] items-center gap-2 truncate xl:flex">
            <span className="truncate text-sm font-semibold text-brand-text">{displayName}</span>
          </div>
        ) : null}
        {adminBadge}
        {supportBadge}
        {isAdmin ? (
          <Link
            href="/admin/listings"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-300"
          >
            <Shield className="h-4 w-4" />
            Moderasiya
          </Link>
        ) : null}
        {!isAdmin && canAccessSupportPanel ? (
          <Link
            href="/admin/support"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-900 transition-colors hover:border-sky-300"
          >
            <Headset className="h-4 w-4" />
            Support
          </Link>
        ) : null}
        <Link
          href="/account/messages"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden 2xl:inline">Mesajlar</span>
          <MessageUnreadBadge count={unreadMessageCount} />
        </Link>
        <Link
          href="/account/listings"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
        >
          <ClipboardList className="h-4 w-4" />
          <span className="hidden 2xl:inline">Elanlarım</span>
        </Link>
        <Link
          href="/elan-yarat"
          className="btn-primary-premium inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Elan yerləşdir
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          Çıxış
        </button>
      </>
    );
  }

  if (mobile) {
    return (
      <>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border text-sm font-semibold"
          onClick={onNavigate}
        >
          <UserIcon className="h-4 w-4" /> Daxil ol
        </Link>
        <Link
          href="/login?returnTo=/elan-yarat&mode=register"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-semibold text-white"
          onClick={onNavigate}
        >
          <Plus className="h-4 w-4" /> Elan yerləşdir
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
      >
        <UserIcon className="h-4 w-4" strokeWidth={2} />
        Daxil ol
      </Link>
      <Link
        href="/login?returnTo=/elan-yarat&mode=register"
        className="btn-primary-premium inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Elan yerləşdir
      </Link>
    </>
  );
}
