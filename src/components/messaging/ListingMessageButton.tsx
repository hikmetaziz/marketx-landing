"use client";

import { Loader2, MessageCircle, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getOrCreateCustomerStoreConversation } from "@/lib/messaging";
import { isActiveStoreMember } from "@/lib/stores/membership";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import type { PublicListingStatus } from "@/types/live-listing";

type ListingMessageButtonProps = {
  listingId: string;
  storeId: string | null;
  slug: string;
  status: PublicListingStatus;
  subject?: string | null;
};

export function ListingMessageButton({ listingId, storeId, slug, status, subject }: ListingMessageButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { supabase, user, loading, isAuthenticated } = useAuthUser();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [membership, setMembership] = useState<{
    storeId: string;
    userId: string;
    isMember: boolean;
  } | null>(null);
  const userId = user?.id ?? null;
  const membershipMatches = membership?.storeId === storeId && membership.userId === userId;
  const isStoreMember = membershipMatches ? membership.isMember : false;
  const checkingMembership = Boolean(isAuthenticated && supabase && userId && storeId && !membershipMatches);

  useEffect(() => {
    if (!supabase || !userId || !storeId) {
      return;
    }

    let cancelled = false;

    void isActiveStoreMember(supabase, storeId, userId).then((isMember) => {
      if (cancelled) return;
      setMembership({ storeId, userId, isMember });
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, storeId, userId]);

  if (!isSupabaseConfigured() || status === "sold" || !storeId) {
    return null;
  }

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-muted"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Yüklənir...
      </button>
    );
  }

  if (!isAuthenticated || !user || !supabase) {
    const returnTo = pathname || `/elanlar/${slug}`;
    return (
      <Link
        href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
      >
        <MessageCircle className="h-4 w-4" />
        Mağazaya yaz
      </Link>
    );
  }

  if (checkingMembership) {
    return (
      <button
        type="button"
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-muted"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Yüklənir...
      </button>
    );
  }

  if (isStoreMember) {
    return (
      <Link
        href="/account/store"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-primary transition-colors hover:border-brand-primary/40 hover:bg-brand-primary/5"
      >
        <Store className="h-4 w-4" />
        Mağaza paneli
      </Link>
    );
  }

  const handleClick = async () => {
    setErrorMessage("");

    if (isStoreMember) {
      router.push("/account/store");
      return;
    }

    setPending(true);

    const { conversationId, error } = await getOrCreateCustomerStoreConversation(supabase, {
      storeId,
      listingId,
      subject: subject ?? null,
    });

    setPending(false);

    if (error || !conversationId) {
      setErrorMessage(error ?? "Söhbət açılmadı");
      return;
    }

    router.push(`/account/messages/${conversationId}`);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        Mağazaya yaz
      </button>
      {errorMessage ? <p className="text-xs font-semibold text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
