"use server";

import { formatContactPhoneDisplay, getContactPhoneTelHref } from "@/lib/contact-phone";
import { getListingBySlug } from "@/lib/listings/live-listings";
import { getRateLimitClientKey } from "@/lib/rate-limit/client-key";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/session";

type RevealListingPhoneResult =
  | { ok: true; phone: string; tel: string }
  | { ok: false; reason: "not_found" | "sold" | "unavailable" | "no_phone" | "rate_limited" };

type IncrementListingViewResult = { ok: true; viewCount: number } | { ok: false };

const REPORT_REASONS = ["spam", "incorrect_information", "fraud", "prohibited", "other"] as const;

type ReportReason = (typeof REPORT_REASONS)[number];

type ReportListingResult =
  | { ok: true }
  | {
      ok: false;
      reason: "auth" | "invalid" | "not_found" | "owner" | "unavailable" | "duplicate" | "failed";
      error: string;
    };

function isReportReason(value: string): value is ReportReason {
  return REPORT_REASONS.includes(value as ReportReason);
}

export async function reportListing(
  listingId: string,
  reason: string,
  details: string,
): Promise<ReportListingResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "failed", error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, reason: "auth", error: "Şikayət göndərmək üçün daxil olun." };
  }

  const normalizedReason = reason.trim();
  if (!isReportReason(normalizedReason)) {
    return { ok: false, reason: "invalid", error: "Şikayət səbəbini seçin." };
  }

  const normalizedDetails = details.trim();
  if (normalizedDetails.length > 1000) {
    return { ok: false, reason: "invalid", error: "Ətraflı məlumat 1000 simvoldan uzun ola bilməz." };
  }

  try {
    const supabase = await createClient();
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, user_id, status")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return { ok: false, reason: "not_found", error: "Elan tapılmadı." };
    }

    if (listing.user_id === user.id) {
      return { ok: false, reason: "owner", error: "Öz elanınızı şikayət edə bilməzsiniz." };
    }

    if (listing.status !== "active" && listing.status !== "sold") {
      return { ok: false, reason: "unavailable", error: "Bu elan üçün şikayət göndərmək mümkün deyil." };
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "listing",
      listing_id: listingId,
      reason: normalizedReason,
      details: normalizedDetails || null,
    });

    if (!error) {
      return { ok: true };
    }

    if (error.code === "23505") {
      return { ok: false, reason: "duplicate", error: "Bu elan üçün artıq şikayət göndərmisiniz." };
    }

    return { ok: false, reason: "failed", error: "Şikayət göndərilmədi. Bir az sonra yenidən cəhd edin." };
  } catch {
    return { ok: false, reason: "failed", error: "Şikayət göndərilmədi. Bir az sonra yenidən cəhd edin." };
  }
}

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
