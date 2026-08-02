/**
 * Client-side payment/banking credential safety classifier.
 * Does not log message bodies. Server enforcement is a separate phase.
 */

export type PaymentSafetyLevel = "ALLOW" | "WARN_AND_ALLOW" | "BLOCK";

export type PaymentSafetyCategory =
  | "none"
  | "card_or_iban"
  | "cvv"
  | "pin"
  | "otp"
  | "banking_password"
  | "card_photo"
  | "card_auth_combo"
  | "remote_access";

export type PaymentSafetyResult = {
  level: PaymentSafetyLevel;
  category: PaymentSafetyCategory;
};

export const PAYMENT_WARN_TITLE = "Platformadan kənar ödəniş";
export const PAYMENT_WARN_TEXT =
  "MarktX ödənişi qəbul etmir və bu əməliyyata zəmanət vermir. Yalnız kart nömrəsi və ya IBAN paylaşın. CVV, PIN, SMS kodu və bank şifrəsini heç vaxt paylaşmayın.";

export const PAYMENT_BLOCK_TITLE = "Həssas bank məlumatı";
export const PAYMENT_BLOCK_TEXT =
  "CVV, PIN, SMS/OTP kodu, bank şifrəsi və kart şəkli paylaşılmamalıdır. MarktX əməkdaşı və mağaza bu məlumatları tələb etmir.";

function showPaymentSafetyDialog(input: {
  title: string;
  text: string;
  primaryLabel: string;
  secondaryLabel?: string;
}): Promise<boolean> {
  if (typeof document === "undefined") {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      resolve(value);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") settle(false);
    };

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.42);padding:16px;";

    const panel = document.createElement("div");
    panel.style.cssText =
      "width:min(440px,100%);border-radius:18px;background:#fff;padding:22px;box-shadow:0 24px 80px rgba(15,23,42,.28);font-family:inherit;color:#111827;";

    const title = document.createElement("h2");
    title.textContent = input.title;
    title.style.cssText = "margin:0 0 10px;font-size:20px;line-height:1.25;font-weight:800;";

    const text = document.createElement("p");
    text.textContent = input.text;
    text.style.cssText = "margin:0;color:#475569;font-size:14px;line-height:1.55;white-space:pre-line;";

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;justify-content:flex-end;gap:10px;margin-top:20px;flex-wrap:wrap;";

    if (input.secondaryLabel) {
      const secondary = document.createElement("button");
      secondary.type = "button";
      secondary.textContent = input.secondaryLabel;
      secondary.style.cssText =
        "border:1px solid #e2e8f0;border-radius:12px;background:#fff;color:#334155;padding:10px 14px;font-weight:800;cursor:pointer;";
      secondary.addEventListener("click", () => settle(false));
      actions.append(secondary);
    }

    const primary = document.createElement("button");
    primary.type = "button";
    primary.textContent = input.primaryLabel;
    primary.style.cssText =
      "border:0;border-radius:12px;background:#7c3aed;color:#fff;padding:10px 14px;font-weight:900;cursor:pointer;";
    primary.addEventListener("click", () => settle(true));
    actions.append(primary);

    panel.append(title, text, actions);
    overlay.append(panel);
    document.body.append(overlay);
    document.addEventListener("keydown", onKeyDown);
    primary.focus();
  });
}

export function confirmPaymentSafetyWarning(): Promise<boolean> {
  return showPaymentSafetyDialog({
    title: PAYMENT_WARN_TITLE,
    text: PAYMENT_WARN_TEXT,
    secondaryLabel: "DÃ¼zÉ™liÅŸ et",
    primaryLabel: "AnladÄ±m, gÃ¶ndÉ™r",
  });
}

export function showPaymentSafetyBlockNotice(): Promise<void> {
  return showPaymentSafetyDialog({
    title: PAYMENT_BLOCK_TITLE,
    text: PAYMENT_BLOCK_TEXT,
    primaryLabel: "DÃ¼zÉ™liÅŸ et",
  }).then(() => undefined);
}

function normalizePaymentText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ə/g, "e")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9а-яё\s+/.-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

const CVV_TERMS = [
  "cvv",
  "cvc",
  "cid",
  "cav2",
  "security code",
  "card security code",
  "kartin arxa kodu",
  "kart arxa kod",
  "guvenlik kodu",
  "güvenlik kodu",
  "код безопасности",
  "код cvv",
  "код cvc",
];

CVV_TERMS.push("код безопасности", "код cvv", "код cvc");

const PIN_TERMS = [
  " pin ",
  "pin kod",
  "pin code",
  "пин",
  "пин-код",
  "пин код",
  "пинкод",
];

const OTP_TERMS = [
  "otp",
  "sms kod",
  "sms code",
  "smscode",
  "tesdiq kod",
  "tesdiq kodu",
  "dogrulama kod",
  "doğrulama kodu",
  "verification code",
  "auth code",
  "authentication code",
  "one time password",
  "one-time password",
  "kod iz sms",
  "код из sms",
  "код из смс",
  "смс код",
  "sms-код",
  "подтверждения код",
  "код подтверждения",
];

OTP_TERMS.push("код из sms", "код из смс", "смс код", "код подтверждения");

const BANKING_PASSWORD_TERMS = [
  "internet banking password",
  "online banking password",
  "mobile banking password",
  "bank password",
  "banking password",
  "bank sifresi",
  "bank sifre",
  "bankacilik sifre",
  "mobil bankacilik sifre",
  "mobil bankacilik sifreni",
  "bank parolu",
  "internet bank parol",
  "mobil bank parol",
  "банк пароль",
  "пароль банка",
  "интернет банк пароль",
  "мобильный банк пароль",
];

BANKING_PASSWORD_TERMS.push(
  "банк пароль",
  "пароль банка",
  "мобильный банк пароль",
  "пароль мобильного банка",
  "пароль от мобильного банка",
);

const CARD_PHOTO_TERMS = [
  "kartin sekli",
  "kart sekli",
  "kartin fotosu",
  "kart fotosu",
  "kartin arxa terefi",
  "kartin arxa terefinin sekli",
  "kartin on ve arxa",
  "kartin on arxa",
  "kart arxa teref",
  "kartin uz terefi",
  "kart foto",
  "card photo",
  "photo of the card",
  "front of the card",
  "back of the card",
  "фото карты",
  "фото карточки",
  "лицевую сторону карты",
  "обратную сторону карты",
  "карточки фото",
];

CARD_PHOTO_TERMS.push("фото карты", "фото карточки", "лицевую сторону карты", "обратную сторону карты");

const REMOTE_ACCESS_TERMS = [
  "anydesk",
  "teamviewer",
  "remote desktop",
  "ekran paylas",
  "ekrani paylas",
  "screen share",
  "удаленный доступ",
  "удалённый доступ",
  "поделиться экраном",
];

const REQUEST_OR_SHARE_TERMS = [
  "gonder",
  "gonderin",
  "gonderm",
  "deyin",
  "yazin",
  "at",
  "atin",
  "paylas",
  "paylasin",
  "soyle",
  "soyleyin",
  "send",
  "tell",
  "share",
  "write",
  "enter",
  "give",
  "отправ",
  "пришл",
  "скаж",
  "напиш",
];

const BANKING_CONTEXT_TERMS = [
  "bank",
  "bankdan",
  "mobil bank",
  "internet bank",
  "bank tetbiq",
  "bank app",
  "banking",
  "online banking",
  "mobile banking",
  "odeyis",
  "odeme",
  "payment",
  "transfer",
  "kocurme",
  "kartdan karta",
  "card to card",
  "банк",
  "банков",
  "платеж",
  "перевод",
];

const CARD_WARN_TERMS = [
  "kartin nomresi",
  "kartin nomrenizi",
  "kart numarasi",
  "kart numarani",
  "kart nomresi",
  "kart nomre",
  "kart nomrenizi",
  "kart nomreni",
  "card number",
  "kredi karti",
  "kredit kart",
  "kartdan karta",
  "kartdan-karta",
  "card to card",
  "iban",
  "hesab nomresi",
  "hesab nomre",
  "bank hesab",
  "odeyis ucun kart",
  "odeme icin kart",
  "номер карты",
  "номер карт",
  "номер счета",
  "номер счёта",
];

CARD_WARN_TERMS.push("номер карты", "номер карт", "номер счета", "номер счёта");

const EXPIRY_TERMS = [
  "son istifade",
  "son istifadə",
  "bitme tarixi",
  "skt",
  "expiry",
  "expiration",
  "exp date",
  "срок действия",
  "срок годности карты",
];

/** Digits-only sequences that look like PAN candidates (13–19). */
function extractDigitRuns(raw: string): string[] {
  return (raw.match(/(?:\d[\s.-]?){13,19}/g) ?? [])
    .map((part) => part.replace(/\D/g, ""))
    .filter((part) => part.length >= 13 && part.length <= 19);
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function hasCardNumberLike(raw: string): boolean {
  return extractDigitRuns(raw).some((run) => luhnValid(run));
}

function hasIbanLike(normalized: string, raw: string): boolean {
  if (normalized.includes("iban")) return true;
  return /\b[a-z]{2}\d{2}[a-z0-9]{11,30}\b/i.test(raw.replace(/\s+/g, ""));
}

function hasRequestOrShareContext(normalized: string): boolean {
  return includesAny(normalized, REQUEST_OR_SHARE_TERMS);
}

function hasBankingContext(normalized: string): boolean {
  return includesAny(normalized, BANKING_CONTEXT_TERMS);
}

function hasPinRisk(normalized: string): boolean {
  const hasPin = includesAny(normalized, PIN_TERMS) || /\bpin\b/.test(normalized);
  if (!hasPin) return false;
  if (normalized.includes("pin kodlu") || normalized.includes("mehsulun pin") || normalized.includes("product pin")) {
    return false;
  }
  return hasRequestOrShareContext(normalized) || hasBankingContext(normalized);
}

function hasOtpRisk(normalized: string): boolean {
  if (normalized.includes("otp") || normalized.includes("one time password") || normalized.includes("one-time password")) {
    return true;
  }

  const hasAuthCode = includesAny(normalized, OTP_TERMS);
  if (!hasAuthCode) return false;

  return hasRequestOrShareContext(normalized) || hasBankingContext(normalized);
}

function hasRemoteAccessRisk(normalized: string): boolean {
  return includesAny(normalized, REMOTE_ACCESS_TERMS) && (hasRequestOrShareContext(normalized) || hasBankingContext(normalized));
}

/**
 * Classify payment/banking credential risk for a message body.
 * Never logs the input.
 */
export function classifyPaymentSafety(input: string): PaymentSafetyResult {
  const raw = input ?? "";
  const normalized = ` ${normalizePaymentText(raw)} `;

  if (!normalized.trim()) {
    return { level: "ALLOW", category: "none" };
  }

  if (includesAny(normalized, CVV_TERMS)) {
    return { level: "BLOCK", category: "cvv" };
  }
  if (hasPinRisk(normalized)) {
    return { level: "BLOCK", category: "pin" };
  }
  if (hasOtpRisk(normalized)) {
    return { level: "BLOCK", category: "otp" };
  }
  if (includesAny(normalized, BANKING_PASSWORD_TERMS)) {
    return { level: "BLOCK", category: "banking_password" };
  }
  if (includesAny(normalized, CARD_PHOTO_TERMS)) {
    return { level: "BLOCK", category: "card_photo" };
  }
  if (hasRemoteAccessRisk(normalized)) {
    return { level: "BLOCK", category: "remote_access" };
  }

  const cardLike = hasCardNumberLike(raw) || includesAny(normalized, CARD_WARN_TERMS) || hasIbanLike(normalized, raw);
  const expiryLike = includesAny(normalized, EXPIRY_TERMS);
  if (cardLike && expiryLike) {
    return { level: "BLOCK", category: "card_auth_combo" };
  }

  if (cardLike) {
    return { level: "WARN_AND_ALLOW", category: "card_or_iban" };
  }

  return { level: "ALLOW", category: "none" };
}
