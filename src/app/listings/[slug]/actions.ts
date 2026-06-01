"use server";

import { formatContactPhoneDisplay, getContactPhoneTelHref } from "@/lib/contact-phone";
import { getListingBySlug } from "@/lib/listings/live-listings";
import { getRateLimitClientKey } from "@/lib/rate-limit/client-key";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type RevealListingPhoneResult =
  | { ok: true; phone: string; tel: string }
  | { ok: false; reason: "not_found" | "sold" | "unavailable" | "no_phone" | "rate_limited" };

type IncrementListingViewResult = { ok: true; viewCount: number } | { ok: false };

export async function incrementListingView(listingId: string): Promise<IncrementListingViewResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false };
  }

  try {
    const supabase = await createClient();
    const clientKey = await getRateLimitClientKey();
    const { data, error } = await supabase.rpc("increment_listing_view", {
      p_listing_id: listingId,
      p_client_key: clientKey,
    });

    if (error || data == null) {
      return { ok: false };
    }

    return { ok: true, viewCount: Number(data) };
  } catch {
    return { ok: false };
  }
}

export async function revealListingPhone(slug: string): Promise<RevealListingPhoneResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unavailable" };
  }

  const listing = await getListingBySlug(slug);

  if (!listing) {
    return { ok: false, reason: "not_found" };
  }

  if (listing.status === "sold") {
    return { ok: false, reason: "sold" };
  }

  if (listing.status !== "active") {
    return { ok: false, reason: "unavailable" };
  }

  try {
    const supabase = await createClient();
    const clientKey = await getRateLimitClientKey();
    const { data, error } = await supabase.rpc("reveal_listing_phone", {
      p_slug: slug,
      p_client_key: clientKey,
    });

    if (error) {
      if (error.message.includes("rate_limit_exceeded")) {
        return { ok: false, reason: "rate_limited" };
      }
      return { ok: false, reason: "unavailable" };
    }

    if (!data || typeof data !== "string") {
      return { ok: false, reason: "no_phone" };
    }

    return {
      ok: true,
      phone: formatContactPhoneDisplay(data),
      tel: getContactPhoneTelHref(data),
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
