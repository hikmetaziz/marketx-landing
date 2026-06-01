export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string | undefined | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: true };
  }

  if (!token?.trim()) {
    return { ok: false, error: "Təhlükəsizlik yoxlaması tələb olunur." };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
    });

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      return { ok: false, error: "Təhlükəsizlik yoxlaması uğursuz oldu." };
    }

    const data = (await response.json()) as TurnstileVerifyResponse;
    if (!data.success) {
      return { ok: false, error: "Təhlükəsizlik yoxlaması keçmədi. Yenidən cəhd edin." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Təhlükəsizlik yoxlaması mümkün olmadı." };
  }
}
