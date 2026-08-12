"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUser } from "@/lib/supabase/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const CLAIM_NOT_ALLOWED_MESSAGE =
  "Bu hesabla mağaza sahiblik müraciəti göndərmək mümkün deyil.";
const CLAIM_INVALID_MESSAGE =
  "Mağaza kodu və ya sahiblik təsdiq kodu düzgün deyil, ya da bu müraciət artıq edilib.";
const STORE_EDIT_PERMISSION_MESSAGE =
  "Bu mağazanı redaktə etmək icazəniz yoxdur.";

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Əməliyyat alınmadı.";
}

function storeClaimErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  const lower = message.toLocaleLowerCase("az");

  if (
    lower.includes("claim kodu") ||
    lower.includes("təsdiq kodu") ||
    lower.includes("mağaza tapılmadı") ||
    lower.includes("mağaza artıq sahiblənib") ||
    lower.includes("müraciət qəbul edilmir") ||
    lower.includes("gözləyən müraciətiniz")
  ) {
    return CLAIM_INVALID_MESSAGE;
  }

  return message;
}

export async function submitStoreClaimRequest(input: {
  storeCode: string;
  claimCode?: string;
  phone?: string;
  note?: string;
  evidenceUrl?: string;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamısınız." };
  }

  if (!input.storeCode.trim()) {
    return { ok: false, error: "Mağaza kodunu daxil edin." };
  }

  if (!input.claimCode?.trim()) {
    return { ok: false, error: "Sahiblik təsdiq kodunu daxil edin." };
  }

  const supabase = await createClient();
  const storeCode = input.storeCode.trim();
  const claimCode = input.claimCode.trim();

  // Admin və moderator adi istifadəçi claim flow-dan istifadə etməməlidir.
  // Mövcud store_members üzvlüyü isə ikinci mağazanı aktivləşdirməyə mane olmur.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: "Əməliyyat alınmadı." };
  }

  if (profile?.role === "moderator") {
  return { ok: false, error: CLAIM_NOT_ALLOWED_MESSAGE };
}

  const { data, error } = await supabase.rpc("submit_store_claim_request", {
    p_store_code: storeCode,
    p_claim_code: claimCode,
    p_phone: input.phone?.trim() || null,
    p_note: input.note?.trim() || null,
    p_evidence_url: input.evidenceUrl?.trim() || null,
  });

  if (error) {
    return { ok: false, error: storeClaimErrorMessage(error) };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const message =
    (row as { message?: string } | null)?.message ??
    "Mağaza hesabınıza bağlandı.";

try {
  revalidatePath("/account/store/claim");
  revalidatePath("/account/store");
} catch (revalidateError) {
  console.error("Store claim revalidation failed", revalidateError);
}

  return { ok: true, message };
}

export async function cancelMyClaimRequest(
  requestId: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamısınız." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_store_claim_request", {
    p_request_id: requestId,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/account/store/claim");
  return { ok: true };
}

export async function updateMyStore(
  storeId: string,
  input: {
    name: string;
    description?: string;
    contactPhone?: string;
    whatsappPhone?: string;
    address?: string;
    city?: string;
    mapUrl?: string;
  },
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamısınız." };
  }

  if (!input.name.trim()) {
    return { ok: false, error: "Mağaza adı boş ola bilməz." };
  }

  const supabase = await createClient();
  const normalizedStoreId = storeId.trim();

  if (!normalizedStoreId) {
    return { ok: false, error: "Mağaza məlumatı tapılmadı." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("store_members")
    .select("id")
    .eq("store_id", normalizedStoreId)
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return { ok: false, error: STORE_EDIT_PERMISSION_MESSAGE };
  }

  if (!membership) {
    return { ok: false, error: STORE_EDIT_PERMISSION_MESSAGE };
  }

  // RLS: yalnız exact store_members owner üzvlüyü update edə bilər.
  // Həssas sahələr (owner_id, status, store_code) trigger ilə qorunur.
  const { data: updatedStore, error } = await supabase
    .from("stores")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      whatsapp_phone: input.whatsappPhone?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      map_url: input.mapUrl?.trim() || null,
    })
    .eq("id", normalizedStoreId)
    .eq("status", "claimed")
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  if (!updatedStore) {
    return { ok: false, error: STORE_EDIT_PERMISSION_MESSAGE };
  }

  revalidatePath("/account/store");
  return { ok: true };
}

export async function deleteMyStore(
  storeId: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase konfiqurasiyası tapılmadı." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, error: "Daxil olmamısınız." };
  }

  const normalizedStoreId = storeId.trim();
  if (!normalizedStoreId) {
    return { ok: false, error: "Mağaza məlumatı tapılmadı." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_store", {
    p_store_id: normalizedStoreId,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/account/store");
  revalidatePath("/account/listings");
  revalidatePath("/account/messages");
  revalidatePath("/stores");
  revalidatePath("/listings");

  return {
    ok: true,
    message: "Mağaza deaktiv edildi.",
  };
}
