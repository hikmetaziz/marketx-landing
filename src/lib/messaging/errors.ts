export type MessagingErrorContext =
  | "open_conversation"
  | "load_inbox"
  | "load_messages"
  | "send_message"
  | "edit_message"
  | "delete_message"
  | "mark_read"
  | "archive_conversation"
  | "block_conversation"
  | "close_conversation"
  | "report_conversation"
  | "upload_attachment"
  | "background_sync";

export type MessagingErrorKind =
  | "authentication"
  | "network"
  | "rate_limit"
  | "permission"
  | "not_found"
  | "conflict"
  | "validation"
  | "conversation_closed"
  | "messaging_blocked"
  | "unknown";

export type MessagingErrorResult = {
  kind: MessagingErrorKind;
  message: string;
  retryable: boolean;
};

type ErrorLike = {
  code?: unknown;
  status?: unknown;
  name?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

const CONTEXT_FALLBACKS: Partial<Record<MessagingErrorContext, string>> = {
  open_conversation: "Söhbət açıla bilmədi. Yenidən cəhd edin.",
  load_inbox: "Söhbətləri yükləmək mümkün olmadı.",
  load_messages: "Mesajları yükləmək mümkün olmadı.",
  send_message: "Mesaj göndərilmədi. Yenidən cəhd edin.",
  edit_message: "Mesaj yenilənmədi. Yenidən cəhd edin.",
  delete_message: "Mesaj silinmədi. Yenidən cəhd edin.",
};

function readErrorLike(error: unknown): ErrorLike {
  if (error && typeof error === "object") {
    return error as ErrorLike;
  }

  return {
    message: error,
  };
}

function readText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStatus(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function baseMessageForContext(context: MessagingErrorContext): string {
  return CONTEXT_FALLBACKS[context] ?? "Əməliyyat zamanı xəta baş verdi. Yenidən cəhd edin.";
}

function permissionMessageForContext(context: MessagingErrorContext): string {
  if (context === "load_messages" || context === "send_message" || context === "mark_read") {
    return "Bu söhbətə giriş icazəniz yoxdur.";
  }

  return "Bu əməliyyatı yerinə yetirmək icazəniz yoxdur.";
}

export function isMessagingAbortError(error: unknown): boolean {
  const source = readErrorLike(error);
  const name = readText(source.name).toLowerCase();
  const message = readText(source.message).toLowerCase();

  return name === "aborterror" || includesAny(message, ["aborterror", "aborted"]);
}

export function mapMessagingError(
  error: unknown,
  context: MessagingErrorContext,
): MessagingErrorResult {
  try {
    const source = readErrorLike(error);
    const code = readText(source.code).toLowerCase();
    const name = readText(source.name).toLowerCase();
    const message = readText(source.message);
    const details = readText(source.details);
    const hint = readText(source.hint);
    const status = readStatus(source.status);
    const combined = [code, name, message, details, hint]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (status === 401 || code === "28000" || includesAny(combined, ["auth_required", "jwt", "session", "not authenticated", "unauthorized"])) {
      return {
        kind: "authentication",
        message: "Sessiyanız bitib. Yenidən daxil olun.",
        retryable: true,
      };
    }

    if (status === 429 || includesAny(combined, ["rate limit", "too many requests", "çox tez-tez", "too many"])) {
      return {
        kind: "rate_limit",
        message: "Çox sayda sorğu göndərildi. Bir qədər sonra yenidən cəhd edin.",
        retryable: true,
      };
    }

    if (includesAny(combined, ["conversation_closed", "new_legacy_messages_disabled", "legacy_close_disabled"])) {
      return {
        kind: "conversation_closed",
        message: "Bu söhbət bağlanıb. Yeni mesaj göndərmək mümkün deyil.",
        retryable: false,
      };
    }

    if (includesAny(combined, ["store_not_messageable"])) {
      return {
        kind: "messaging_blocked",
        message: "Bu mağaza hazırda aktiv deyil və mesaj qəbul etmir.",
        retryable: false,
      };
    }

    if (includesAny(combined, ["store_member_cannot_message_own_store"])) {
      return {
        kind: "messaging_blocked",
        message: "Öz mağazanıza mesaj yazmaq mümkün deyil.",
        retryable: false,
      };
    }

    if (includesAny(combined, ["customer_store_contact_blocked", "message_sensitive_credentials_blocked", "listing_not_messageable"])) {
      return {
        kind: "messaging_blocked",
        message: "Bu söhbətdə mesaj göndərmək mümkün deyil.",
        retryable: false,
      };
    }

    if (status === 403 || code === "42501" || includesAny(combined, ["permission denied", "row-level security", "access_denied", "support_access_denied", "store_access_denied", "conversation_close_denied", "conversation_forbidden"])) {
      return {
        kind: "permission",
        message: permissionMessageForContext(context),
        retryable: false,
      };
    }

    if (status === 404 || includesAny(combined, ["not_found", "not found", "tapılmadı", "message_not_in_conversation"])) {
      return {
        kind: "not_found",
        message:
          context === "edit_message" || context === "delete_message"
            ? "Mesaj tapılmadı və ya artıq silinib."
            : baseMessageForContext(context),
        retryable: false,
      };
    }

    if (status === 409 || code === "23505" || includesAny(combined, ["duplicate key", "unique constraint", "already", "artıq"])) {
      return {
        kind: "conflict",
        message: "Əməliyyat artıq icra olunub və ya məlumat dəyişib.",
        retryable: true,
      };
    }

    if (code === "23503") {
      return {
        kind: "validation",
        message: "Daxil edilmiş məlumatları yoxlayın.",
        retryable: false,
      };
    }

    if (code === "42883" || includesAny(combined, ["function", "does not exist"])) {
      return {
        kind: "unknown",
        message: baseMessageForContext(context),
        retryable: true,
      };
    }

    if (code === "23514" || code === "22023" || includesAny(combined, ["message_body_required", "invalid_support_topic", "invalid_access_reason", "check constraint", "violates check constraint"])) {
      return {
        kind: "validation",
        message: "Daxil edilmiş məlumatları yoxlayın.",
        retryable: false,
      };
    }

    if (isMessagingAbortError(error)) {
      return {
        kind: "network",
        message: "Bağlantı problemi yarandı. İnterneti yoxlayıb yenidən cəhd edin.",
        retryable: true,
      };
    }

    if (status === 408 || status === 0 || includesAny(combined, ["failed to fetch", "networkerror", "network error", "fetch failed", "timeout", "timed out", "load failed"])) {
      return {
        kind: "network",
        message: "Bağlantı problemi yarandı. İnterneti yoxlayıb yenidən cəhd edin.",
        retryable: true,
      };
    }

    return {
      kind: "unknown",
      message: baseMessageForContext(context),
      retryable: true,
    };
  } catch {
    return {
      kind: "unknown",
      message: baseMessageForContext(context),
      retryable: true,
    };
  }
}
