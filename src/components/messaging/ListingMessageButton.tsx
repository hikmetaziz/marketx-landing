"use client";

import { Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { getOrCreateConversation } from "@/lib/messaging";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import type { PublicListingStatus } from "@/types/live-listing";

type ListingMessageButtonProps = {
  listingId: string;
  sellerId: string;
  slug: string;
  status: PublicListingStatus;
};

export function ListingMessageButton({ listingId, sellerId, slug, status }: ListingMessageButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { supabase, user, loading, isAuthenticated } = useAuthUser();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isSupabaseConfigured() || status === "sold") {
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
    const returnTo = pathname || `/listings/${slug}`;
    return (
      <Link
        href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
      >
        <MessageCircle className="h-4 w-4" />
        Mesaj yaz
      </Link>
    );
  }

  if (user.id === sellerId) {
    return null;
  }

  const handleClick = async () => {
    setErrorMessage("");
    setPending(true);

    const { conversationId, error } = await getOrCreateConversation(
      supabase,
      listingId,
      user.id,
      sellerId,
    );

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
        Mesaj yaz
      </button>
      {errorMessage ? <p className="text-xs font-semibold text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
