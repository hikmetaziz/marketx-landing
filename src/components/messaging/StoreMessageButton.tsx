"use client";

import { Loader2, MessageCircle, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getOrCreateCustomerStoreConversation } from "@/lib/messaging";
import { isActiveStoreMember } from "@/lib/stores/membership";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

type StoreMessageButtonProps = {
  storeId: string;
  storeName: string;
};

export function StoreMessageButton({ storeId, storeName }: StoreMessageButtonProps) {
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

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-muted md:w-auto"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Yüklənir...
      </button>
    );
  }

  if (!isAuthenticated || !user || !supabase) {
    const returnTo = pathname || "/stores";
    return (
      <Link
        href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark md:w-auto"
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-muted md:w-auto"
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-primary transition-colors hover:border-brand-primary/40 hover:bg-brand-primary/5 md:w-auto"
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
      listingId: null,
      subject: storeName,
    });

    setPending(false);

    if (error || !conversationId) {
      setErrorMessage(error ?? "Söhbət açılmadı.");
      return;
    }

    router.push(`/account/messages/${conversationId}`);
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-70 md:w-auto"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        Mağazaya yaz
      </button>
      {errorMessage ? <p className="max-w-48 text-xs font-semibold text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
