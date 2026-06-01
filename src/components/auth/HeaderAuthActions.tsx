"use client";

import { LogOut, ClipboardList, Plus, Shield, User as UserIcon } from "lucide-react";
import Link from "next/link";

import { useAuthUser } from "@/lib/supabase/use-auth-user";

type HeaderAuthActionsProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function HeaderAuthActions({ mobile = false, onNavigate }: HeaderAuthActionsProps) {
  const { user, loading, isAdmin, supabase } = useAuthUser();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    null;

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    onNavigate?.();
    window.location.href = "/";
  };

  if (loading) {
    return null;
  }

  if (displayName && user) {
    const adminBadge = isAdmin ? (
      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Admin</span>
    ) : null;

    if (mobile) {
      return (
        <>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5">
            <span className="text-sm font-semibold text-brand-text">{displayName}</span>
            {adminBadge}
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
          <Link
            href="/account/listings"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border text-sm font-semibold"
            onClick={onNavigate}
          >
            <ClipboardList className="h-4 w-4" /> Elanlarım
          </Link>
          <Link
            href="/create-listing"
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
        {!isAdmin ? (
          <div className="hidden max-w-[100px] items-center gap-2 truncate xl:flex">
            <span className="truncate text-sm font-semibold text-brand-text">{displayName}</span>
          </div>
        ) : null}
        {adminBadge}
        {isAdmin ? (
          <Link
            href="/admin/listings"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-300"
          >
            <Shield className="h-4 w-4" />
            Moderasiya
          </Link>
        ) : null}
        <Link
          href="/account/listings"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
        >
          <ClipboardList className="h-4 w-4" />
          <span className="hidden 2xl:inline">Elanlarım</span>
        </Link>
        <Link
          href="/create-listing"
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
          href="/login?returnTo=/create-listing&mode=register"
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
        href="/login?returnTo=/create-listing&mode=register"
        className="btn-primary-premium inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Elan yerləşdir
      </Link>
    </>
  );
}
