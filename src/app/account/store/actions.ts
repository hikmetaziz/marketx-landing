"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedUser } from "@/lib/supabase/session";
import { getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/env";
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
const STORE_IMAGE_INVALID_MESSAGE =
  "Mağaza şəkli təsdiqlənmədi. Yenidən seçib cəhd edin.";

function validateStoreImageUrl(
  value: string,
  userId: string,
  storeId: string,
  kind: "logo" | "cover",
): string | null {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  try {
    const parsed = new URL(value);
    const expectedOrigin = new URL(supabaseUrl).origin;
    const expectedPrefix =
      `/storage/v1/object/public/listing-images/${userId}/stores/${storeId}/${kind}-`;
    const fileName = parsed.pathname.slice(expectedPrefix.length);

    if (
      parsed.origin !== expectedOrigin ||
      !parsed.pathname.startsWith(expectedPrefix) ||
      !/^[0-9a-f-]{36}\.jpg$/i.test(fileName) ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

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
    logoUrl?: string;
    coverUrl?: string;
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

  const { data: canEditStore, error: membershipError } = await supabase.rpc(
    "marktx_store_member_has_role",
    {
      p_store_id: normalizedStoreId,
      p_user_id: user.id,
      p_allowed_roles: ["owner"],
    },
  );

  if (membershipError) {
    return { ok: false, error: STORE_EDIT_PERMISSION_MESSAGE };
  }

  if (canEditStore !== true) {
    return { ok: false, error: STORE_EDIT_PERMISSION_MESSAGE };
  }

  const logoUrl = input.logoUrl
    ? validateStoreImageUrl(input.logoUrl, user.id, normalizedStoreId, "logo")
    : undefined;
  const coverUrl = input.coverUrl
    ? validateStoreImageUrl(input.coverUrl, user.id, normalizedStoreId, "cover")
    : undefined;

  if ((input.logoUrl && !logoUrl) || (input.coverUrl && !coverUrl)) {
    return { ok: false, error: STORE_IMAGE_INVALID_MESSAGE };
  }

  const { data: currentStore, error: currentStoreError } = await supabase
    .from("public_store_profiles")
    .select("id, slug")
    .eq("id", normalizedStoreId)
    .maybeSingle();

  if (currentStoreError || !currentStore) {
    return { ok: false, error: STORE_EDIT_PERMISSION_MESSAGE };
  }

  const { data: updatedStoreData, error } = await supabase.rpc(
    "update_my_claimed_store",
    {
      p_store_id: normalizedStoreId,
      p_name: input.name.trim(),
      p_description: input.description?.trim() || null,
      p_contact_phone: input.contactPhone?.trim() || null,
      p_whatsapp_phone: input.whatsappPhone?.trim() || null,
      p_address: input.address?.trim() || null,
      p_city: input.city?.trim() || null,
      p_map_url: input.mapUrl?.trim() || null,
      p_logo_url: logoUrl ?? null,
      p_cover_url: coverUrl ?? null,
    },
  );

  if (error) {
    const lowerMessage = error.message.toLowerCase();
    if (
      lowerMessage.includes("not authorized") ||
      lowerMessage.includes("not authenticated")
    ) {
      return { ok: false, error: STORE_EDIT_PERMISSION_MESSAGE };
    }

    if (
      lowerMessage.includes("invalid store logo") ||
      lowerMessage.includes("invalid store cover")
    ) {
      return { ok: false, error: STORE_IMAGE_INVALID_MESSAGE };
    }

    return { ok: false, error: errorMessage(error) };
  }

  const updatedStore = Array.isArray(updatedStoreData)
    ? updatedStoreData[0]
    : updatedStoreData;

  if (!updatedStore) {
    return { ok: false, error: STORE_EDIT_PERMISSION_MESSAGE };
  }

  if (
    (logoUrl && updatedStore.logo_url !== logoUrl) ||
    (coverUrl && updatedStore.cover_url !== coverUrl)
  ) {
    return {
      ok: false,
      error: "Mağaza şəkilləri yadda saxlanmadı. Yenidən cəhd edin.",
    };
  }

  revalidatePath("/account/store");
  revalidatePath("/stores");
  revalidatePath(`/stores/${updatedStore.slug || currentStore.slug}`);
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
