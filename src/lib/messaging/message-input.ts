export const MESSAGE_BODY_MAX_LENGTH = 1000;

export type MessageBodyValidation =
  | { ok: true; body: string }
  | { ok: false; error: string; reason: "empty" | "too_long" };

export function normalizeMessageBody(input: string): string {
  return input.trim();
}

export function validateMessageBody(input: string): MessageBodyValidation {
  const body = normalizeMessageBody(input);
  if (!body) {
    return { ok: false, reason: "empty", error: "Mesaj boş ola bilməz." };
  }
  if (body.length > MESSAGE_BODY_MAX_LENGTH) {
    return {
      ok: false,
      reason: "too_long",
      error: `Mesaj ${MESSAGE_BODY_MAX_LENGTH} simvoldan uzun ola bilməz.`,
    };
  }
  return { ok: true, body };
}

export function canSubmitMessage(input: string, pending: boolean, canSend = true): boolean {
  return canSend && !pending && validateMessageBody(input).ok;
}
