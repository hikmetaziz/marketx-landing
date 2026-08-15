"use client";

import { ClipboardList, Headset, Heart, LogOut, MessageCircle, Store, User } from "lucide-react";
import Link from "next/link";

import { signOutWithCleanup } from "@/lib/auth/sign-out";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

type AccountSubnavProps = {
  active: "favorites" | "listings" | "messages" | "support" | "store";
};

export function AccountSubnav({ active }: AccountSubnavProps) {
  const { user, loading, supabase } = useAuthUser();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    user?.phone ??
    "Profil";

  const linkClass = (key: AccountSubnavProps["active"]) =>
    `inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors md:min-h-10 md:px-3.5 md:py-2 md:text-sm ${
      active === key
        ? "border-brand-primary/30 bg-brand-primary-light/40 text-brand-primary"
        : "border-brand-border bg-white text-brand-text hover:border-brand-primary/30 hover:text-brand-primary"
    }`;

  const handleSignOut = async () => {
    if (!supabase) return;
    await signOutWithCleanup(supabase);
    window.location.href = "/";
  };

  return (
    <div className="mb-5 space-y-3 md:mb-6">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-border bg-white px-3 py-2.5 md:min-h-14 md:px-4 md:py-3">
        <div className="inline-flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light/50 text-brand-primary">
            <User className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-bold text-brand-text">
            {loading ? "Profil" : displayName}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={!supabase}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-brand-border bg-white px-3 text-xs font-semibold text-brand-text transition-colors hover:border-brand-primary/30 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50 md:min-h-10 md:px-3.5 md:text-sm"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Çıxış
        </button>
      </div>

      <nav
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:pb-0 [&::-webkit-scrollbar]:hidden"
        aria-label="Kabinet naviqasiyası"
      >
        <Link href="/account/favorites" className={linkClass("favorites")}>
          <Heart className="h-4 w-4" aria-hidden="true" />
          Seçilmişlər
        </Link>
        <Link href="/account/listings" className={linkClass("listings")}>
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Elanlarım
        </Link>
        <Link href="/account/messages" className={linkClass("messages")}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Mesajlar
        </Link>
        <Link href="/account/support" className={linkClass("support")}>
          <Headset className="h-4 w-4" aria-hidden="true" />
          Dəstək
        </Link>
        <Link href="/account/store" className={linkClass("store")}>
          <Store className="h-4 w-4" aria-hidden="true" />
          Mağazam
        </Link>
      </nav>
    </div>
  );
}
