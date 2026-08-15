"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/admin-session";
import { createClient } from "@/lib/supabase/server";
import { normalizeAzPhone } from "@/lib/contact-phone";

type ActionResult = { ok: true } | { ok: false; error: string };
type CreateStoreResult =
  | { ok: true; storeId: string; storeCode: string }
  | { ok: false; error: string };

type StoreApplicationCreation = {
  storeId: string;
  storeCode: string;
  storeName: string;
};

type CreateStoreFromApplicationResult =
  | {
      ok: true;
      storeId: string;
      storeCode: string;
      storeName: string;
      alreadyCreated: boolean;
    }
  | { ok: false; error: string };

type GetStoreApplicationCreationResult =
  | { ok: true; creation: StoreApplicationCreation | null }
  | { ok: false; error: string };
type ClaimCodeResult =
  | { ok: true; claimCode: string; expiresAt: string }
  | { ok: false; error: string };

type ApproveStoreApplicationResult =
  | {
      ok: true;
      storeId: string;
      storeCode: string;
      storeName: string;
      alreadyCreated: boolean;
      claimCode: string | null;
      claimCodeExpiresAt: string | null;
    }
  | {
      ok: false;
      error: string;
      storeCreated?: {
        storeId: string;
        storeCode: string;
        storeName: string;
      };
    };
type OwnerLookupResult =
  | {
      ok: true;
      user: {
        id: string;
        displayName: string | null;
        email: string | null;
        phone: string;
      };
    }
  | { ok: false; error: string };

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message.includes("conversations_phase2_shape_check")) {
      return "Bu mağazanın yazışma tarixçəsi var. Məlumatların qorunması üçün mağazanı tam silmək olmaz. Mağazanı arxivləyin.";
    }
    return message;
  }
  return "Əməliyyat alınmadı.";
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type StoreApplicationImageUrls = {
  logoUrl: string | null;
  coverUrl: string | null;
};

async function notifyStoreApplicationActivationCodeReady(
  supabase: SupabaseServerClient,
  conversationId: string,
): Promise<void> {
  for (const functionName of ["send-push", "send-web-push"]) {
    try {
      const { error } = await supabase.functions.invoke(functionName, {
        body: {
          event: "activation_code_ready",
          conversation_id: conversationId,
        },
      });

      if (error) {
        console.error("Store application activation push failed", {
          conversationId,
          functionName,
          message: error.message,
        });
      }
    } catch (pushError) {
      console.error("Store application activation push failed", {
        conversationId,
        functionName,
        error: pushError,
      });
    }
  }
}

function readStoreApplicationImageUrl(line: string, label: string): string | null {
  if (!line.startsWith(label)) {
    return null;
  }

  const value = line.slice(label.length).trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseStoreApplicationImageUrls(body: string): StoreApplicationImageUrls {
  const imageUrls: StoreApplicationImageUrls = {
    logoUrl: null,
    coverUrl: null,
  };

  for (const line of body.split(/\r?\n/)) {
    imageUrls.logoUrl ??= readStoreApplicationImageUrl(line.trim(), "Logo:");
    imageUrls.coverUrl ??= readStoreApplicationImageUrl(line.trim(), "Örtük şəkli:");
  }

  return imageUrls;
}

async function fetchStoreApplicationImageUrls(
  supabase: SupabaseServerClient,
  conversationId: string,
): Promise<StoreApplicationImageUrls> {
  const { data, error } = await supabase
    .from("messages")
    .select("body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("store application image message lookup failed", {
      conversationId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return { logoUrl: null, coverUrl: null };
  }

  const imageUrls: StoreApplicationImageUrls = {
    logoUrl: null,
    coverUrl: null,
  };

  for (const message of data ?? []) {
    if (typeof message.body !== "string") {
      continue;
    }

    const parsed = parseStoreApplicationImageUrls(message.body);
    imageUrls.logoUrl ??= parsed.logoUrl;
    imageUrls.coverUrl ??= parsed.coverUrl;
  }

  return imageUrls;
}

async function persistStoreApplicationImages(
  supabase: SupabaseServerClient,
  storeId: string,
  conversationId: string,
): Promise<void> {
  const imageUrls = await fetchStoreApplicationImageUrls(supabase, conversationId);

  if (!imageUrls.logoUrl && !imageUrls.coverUrl) {
    return;
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("logo_url, cover_url")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError) {
    console.error("store application image store lookup failed", {
      storeId,
      code: storeError.code,
      message: storeError.message,
      details: storeError.details,
      hint: storeError.hint,
    });

    return;
  }

  const update: { logo_url?: string; cover_url?: string } = {};

  if (imageUrls.logoUrl && !store?.logo_url) {
    update.logo_url = imageUrls.logoUrl;
  }

  if (imageUrls.coverUrl && !store?.cover_url) {
    update.cover_url = imageUrls.coverUrl;
  }

  if (Object.keys(update).length === 0) {
    return;
  }

  const { error: updateError } = await supabase
    .from("stores")
    .update(update)
    .eq("id", storeId);

  if (updateError) {
    console.error("store application image persistence failed", {
      storeId,
      code: updateError.code,
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
    });
  }
}

export async function adminCreateStore(input: {
  name: string;
  category?: string;
  city?: string;
  contactPhone?: string;
  whatsappPhone?: string;
  address?: string;
  description?: string;
  mapUrl?: string;
}): Promise<CreateStoreResult> {
  await requireAdmin();

  const name = input.name.trim();
  const category = input.category?.trim() || null;
  const city = input.city?.trim() || null;
  const address = input.address?.trim() || null;
  const description = input.description?.trim() || null;
  const rawContactPhone = input.contactPhone?.trim() || "";
  const rawWhatsappPhone = input.whatsappPhone?.trim() || "";
  const contactPhone = rawContactPhone ? normalizeAzPhone(rawContactPhone) : null;
  const whatsappPhone = rawWhatsappPhone ? normalizeAzPhone(rawWhatsappPhone) : null;
  const mapUrl = input.mapUrl?.trim() || null;

  if (!name) {
    return { ok: false, error: "Mağaza adını daxil edin." };
  }

  if (rawContactPhone && !contactPhone) {
    return { ok: false, error: "Telefon nömrəsini düzgün daxil edin." };
  }

  if (rawWhatsappPhone && !whatsappPhone) {
    return { ok: false, error: "WhatsApp nömrəsini düzgün daxil edin." };
  }

  if (mapUrl) {
    try {
      const parsedUrl = new URL(mapUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return { ok: false, error: "Xəritə linkini düzgün daxil edin." };
      }
    } catch {
      return { ok: false, error: "Xəritə linkini düzgün daxil edin." };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_store", {
    p_name: name,
    p_category: category,
    p_category_id: null,
    p_city: city,
    p_contact_phone: contactPhone,
    p_whatsapp_phone: whatsappPhone,
    p_address: address,
    p_description: description,
    p_map_url: mapUrl,
  });

  if (error || !data) {
    console.error("adminCreateStore failed", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    return {
      ok: false,
      error: "Mağaza yaradılmadı. Məlumatları yoxlayıb yenidən cəhd edin.",
    };
  }

  const store = data as { id?: unknown; store_code?: unknown };
  if (typeof store.id !== "string" || typeof store.store_code !== "string") {
    console.error("adminCreateStore returned an invalid result", data);
    return {
      ok: false,
      error: "Mağaza yaradıldı, lakin nəticə məlumatları oxunmadı.",
    };
  }

  revalidatePath("/admin/stores");
  return { ok: true, storeId: store.id, storeCode: store.store_code };
}

export async function adminGetStoreApplicationCreation(
  conversationId: string,
): Promise<GetStoreApplicationCreationResult> {
  await requireAdmin();

  const normalizedConversationId = conversationId.trim();
  if (!normalizedConversationId) {
    return { ok: false, error: "Müraciət ID-si tapılmadı." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "admin_get_store_application_creation",
    {
      p_conversation_id: normalizedConversationId,
    },
  );

  if (error) {
    console.error("adminGetStoreApplicationCreation failed", {
      conversationId: normalizedConversationId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      ok: false,
      error: "Müraciətin mağaza nəticəsi yoxlanıla bilmədi.",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return { ok: true, creation: null };
  }

  const typed = row as {
    store_id?: unknown;
    store_code?: unknown;
    store_name?: unknown;
  };

  if (
    typeof typed.store_id !== "string" ||
    typeof typed.store_code !== "string" ||
    typeof typed.store_name !== "string"
  ) {
    console.error(
      "adminGetStoreApplicationCreation returned an invalid result",
      row,
    );

    return {
      ok: false,
      error: "Müraciətin mağaza nəticəsi oxuna bilmədi.",
    };
  }

  return {
    ok: true,
    creation: {
      storeId: typed.store_id,
      storeCode: typed.store_code,
      storeName: typed.store_name,
    },
  };
}

export async function adminCreateStoreFromApplication(
  conversationId: string,
  input: {
    name: string;
    category?: string;
    city?: string;
    contactPhone?: string;
    whatsappPhone?: string;
    address?: string;
    description?: string;
    mapUrl?: string;
  },
): Promise<CreateStoreFromApplicationResult> {
  await requireAdmin();

  const normalizedConversationId = conversationId.trim();
  const name = input.name.trim();
  const category = input.category?.trim() || null;
  const city = input.city?.trim() || null;
  const address = input.address?.trim() || null;
  const description = input.description?.trim() || null;
  const rawContactPhone = input.contactPhone?.trim() || "";
  const rawWhatsappPhone = input.whatsappPhone?.trim() || "";
  const contactPhone = rawContactPhone
    ? normalizeAzPhone(rawContactPhone)
    : null;
  const whatsappPhone = rawWhatsappPhone
    ? normalizeAzPhone(rawWhatsappPhone)
    : null;
  const mapUrl = input.mapUrl?.trim() || null;

  if (!normalizedConversationId) {
    return { ok: false, error: "Müraciət ID-si tapılmadı." };
  }

  if (!name) {
    return { ok: false, error: "Mağaza adını daxil edin." };
  }

  if (rawContactPhone && !contactPhone) {
    return {
      ok: false,
      error: "Telefon nömrəsini düzgün daxil edin.",
    };
  }

  if (rawWhatsappPhone && !whatsappPhone) {
    return {
      ok: false,
      error: "WhatsApp nömrəsini düzgün daxil edin.",
    };
  }

  if (mapUrl) {
    try {
      const parsedUrl = new URL(mapUrl);
      if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
      ) {
        return {
          ok: false,
          error: "Xəritə linkini düzgün daxil edin.",
        };
      }
    } catch {
      return {
        ok: false,
        error: "Xəritə linkini düzgün daxil edin.",
      };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "admin_create_store_from_application",
    {
      p_conversation_id: normalizedConversationId,
      p_name: name,
      p_category: category,
      p_category_id: null,
      p_city: city,
      p_contact_phone: contactPhone,
      p_whatsapp_phone: whatsappPhone,
      p_address: address,
      p_description: description,
      p_map_url: mapUrl,
    },
  );

  if (error || !data) {
    console.error("adminCreateStoreFromApplication failed", {
      conversationId: normalizedConversationId,
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });

    return {
      ok: false,
      error:
        "Mağaza yaradılmadı. Məlumatları yoxlayıb yenidən cəhd edin.",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const typed = row as {
    store_id?: unknown;
    store_code?: unknown;
    store_name?: unknown;
    already_created?: unknown;
  };

  if (
    typeof typed.store_id !== "string" ||
    typeof typed.store_code !== "string" ||
    typeof typed.store_name !== "string" ||
    typeof typed.already_created !== "boolean"
  ) {
    console.error(
      "adminCreateStoreFromApplication returned an invalid result",
      row,
    );

    return {
      ok: false,
      error: "Mağaza nəticəsi oxuna bilmədi.",
    };
  }

  await persistStoreApplicationImages(
    supabase,
    typed.store_id,
    normalizedConversationId,
  );

  revalidatePath("/admin/stores");
  revalidatePath("/admin/support");

  return {
    ok: true,
    storeId: typed.store_id,
    storeCode: typed.store_code,
    storeName: typed.store_name,
    alreadyCreated: typed.already_created,
  };
}

export async function adminUpdateStore(
  storeId: string,
  input: {
    name: string;
    category?: string;
    city?: string;
    contactPhone?: string;
    whatsappPhone?: string;
    address?: string;
    description?: string;
    mapUrl?: string;
  },
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("stores")
    .update({
      name: input.name,
      category: input.category || null,
      city: input.city || null,
      contact_phone: input.contactPhone || null,
      whatsapp_phone: input.whatsappPhone || null,
      address: input.address || null,
      description: input.description || null,
      map_url: input.mapUrl?.trim() || null,
    })
    .eq("id", storeId);

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${storeId}`);
  return { ok: true };
}

export async function adminGenerateClaimCode(
  storeId: string,
  validDays = 14,
): Promise<ClaimCodeResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_generate_store_claim_code", {
    p_store_id: storeId,
    p_valid_days: validDays,
  });

  if (error || !data) {
    return { ok: false, error: errorMessage(error) };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const typed = row as { claim_code: string; expires_at: string };
  return { ok: true, claimCode: typed.claim_code, expiresAt: typed.expires_at };
}

export async function adminApproveStoreApplication(
  conversationId: string,
  input: {
    name: string;
    category?: string;
    city?: string;
    contactPhone?: string;
    whatsappPhone?: string;
    address?: string;
    description?: string;
    mapUrl?: string;
  },
  validDays = 14,
): Promise<ApproveStoreApplicationResult> {
  const storeResult = await adminCreateStoreFromApplication(
    conversationId,
    input,
  );

  if (!storeResult.ok) {
    return storeResult;
  }

  /*
   * Eyni müraciət əvvəl işlənibsə məxfi kodu avtomatik yeniləmirik.
   * Plain kod hash-dən geri oxuna bilməz. Admin lazım olduqda
   * adminGenerateClaimCode ilə şüurlu şəkildə yeni kod yaratmalıdır.
   */
  if (storeResult.alreadyCreated) {
    return {
      ok: true,
      storeId: storeResult.storeId,
      storeCode: storeResult.storeCode,
      storeName: storeResult.storeName,
      alreadyCreated: true,
      claimCode: null,
      claimCodeExpiresAt: null,
    };
  }

  const claimCodeResult = await adminGenerateClaimCode(
    storeResult.storeId,
    validDays,
  );

  if (!claimCodeResult.ok) {
    return {
      ok: false,
      error:
        "Mağaza yaradıldı, lakin məxfi sahiblik kodu yaradıla bilmədi. Mağaza səhifəsindən yeni kod yaradın.",
      storeCreated: {
        storeId: storeResult.storeId,
        storeCode: storeResult.storeCode,
        storeName: storeResult.storeName,
      },
    };
  }

  const supabase = await createClient();
  await notifyStoreApplicationActivationCodeReady(
    supabase,
    conversationId,
  );

  revalidatePath("/admin/support");
  revalidatePath(`/admin/stores/${storeResult.storeId}`);

  return {
    ok: true,
    storeId: storeResult.storeId,
    storeCode: storeResult.storeCode,
    storeName: storeResult.storeName,
    alreadyCreated: false,
    claimCode: claimCodeResult.claimCode,
    claimCodeExpiresAt: claimCodeResult.expiresAt,
  };
}

export async function adminFindStoreOwnerCandidateByPhone(phoneInput: string): Promise<OwnerLookupResult> {
  await requireAdmin();
  const normalizedPhone = normalizeAzPhone(phoneInput);
  if (!normalizedPhone) {
    return { ok: false, error: "Telefon nömrəsini tam daxil edin." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, phone")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  if (!data?.id) {
    return { ok: false, error: "Bu telefonla qeydiyyatdan keçmiş istifadəçi tapılmadı." };
  }

  return {
    ok: true,
    user: {
      id: String(data.id),
      displayName: typeof data.display_name === "string" ? data.display_name : null,
      email: typeof data.email === "string" ? data.email : null,
      phone: normalizedPhone,
    },
  };
}

export async function adminAssignStoreOwner(
  storeId: string,
  userId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_assign_store_owner", {
    p_store_id: storeId,
    p_user_id: userId,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${storeId}`);
  return { ok: true };
}

export async function adminTransferStoreOwner(
  storeId: string,
  newUserId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_transfer_store_owner", {
    p_store_id: storeId,
    p_new_user_id: newUserId,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${storeId}`);
  return { ok: true };
}

export async function adminApproveClaimRequest(requestId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_approve_store_claim_request", {
    p_request_id: requestId,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/stores");
  return { ok: true };
}

export async function adminRejectClaimRequest(
  requestId: string,
  adminNote?: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_reject_store_claim_request", {
    p_request_id: requestId,
    p_admin_note: adminNote || null,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/stores");
  return { ok: true };
}

export async function adminRevokeStoreOwner(
  storeId: string,
  reason?: string,
  newStatus: "unclaimed" | "suspended" = "unclaimed",
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_revoke_store_owner", {
    p_store_id: storeId,
    p_reason: reason || null,
    p_new_status: newStatus,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${storeId}`);
  return { ok: true };
}

export async function adminArchiveStore(storeId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_archive_store", {
    p_store_id: storeId,
    p_reason: null,
  });

  if (error) {
    if (error.message.includes("Could not find the function") || error.code === "PGRST202") {
      return {
        ok: false,
        error: "Mağaza arxiv funksiyası üçün SQL migration tətbiq olunmalıdır.",
      };
    }
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${storeId}`);
  return { ok: true };
}

export async function adminAttachListingToStore(
  storeId: string,
  listingId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({ store_id: storeId })
    .eq("id", listingId);

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath(`/admin/stores/${storeId}`);
  return { ok: true };
}

export async function adminDetachListingFromStore(
  storeId: string,
  listingId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({ store_id: null })
    .eq("id", listingId)
    .eq("store_id", storeId);

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath(`/admin/stores/${storeId}`);
  return { ok: true };
}
