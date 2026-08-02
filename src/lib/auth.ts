import { CONTACT_PHONE_VALIDATION_MESSAGE, normalizeContactPhone } from "@/lib/contact-phone";

export function translateAuthError(message: unknown): string {
  const text = String(message ?? "").toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "Yanlış telefon nömrəsi və ya parol. Əvvəl «Qeydiyyat» edin.";
  }
  if (text.includes("email not confirmed")) {
    return "Email təsdiqlənməyib. Poçt qutunuzdakı təsdiq linkinə klik edin.";
  }
  if (text.includes("phone not confirmed")) {
    return "Telefon nömrəsi təsdiqlənməyib. Təsdiq addımını tamamlayın.";
  }
  if (text.includes("phone provider") || text.includes("phone login") || text.includes("unsupported phone")) {
    return "Telefonla giris Supabase-de aktiv deyil. Phone provider settings-i yoxlayin.";
  }
  if (
    text.includes("user already registered") ||
    text.includes("already been registered") ||
    text.includes("already exists")
  ) {
    return "Bu telefon və ya email artıq qeydiyyatdadır. «Daxil ol» istifadə edin.";
  }
  if (text.includes("password should be at least") || text.includes("weak password")) {
    return "Parol ən azı 6 simvol olmalıdır.";
  }
  if (text.includes("unable to validate email") || text.includes("invalid email")) {
    return "Email formatı yanlışdır.";
  }
  if (
    text.includes("invalid phone") ||
    text.includes("phone number is invalid") ||
    text.includes("unable to validate phone")
  ) {
    return "Yanlış telefon nömrəsi və ya parol. Əvvəl «Qeydiyyat» edin.";
  }
  if (text.includes("signup is disabled")) {
    return "Qeydiyyat bağlıdır. Supabase Authentication yoxlayın.";
  }
  if (text.includes("network") || text.includes("fetch")) {
    return "İnternet və ya Supabase bağlantısı yoxdur.";
  }

  return "Xəta baş verdi. Yenidən cəhd edin.";
}

export function validateEmail(email: unknown): string | null {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return "Email ünvanını daxil edin.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "Email formatı yanlışdır.";
  }
  return null;
}

export function validateFullName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Ad və soyad daxil edin.";
  if (trimmed.length < 3) return "Ad və soyad çox qısadır.";
  if (!/^[\p{L}\s'-]+$/u.test(trimmed)) {
    return "Ad və soyadda yalnız hərf istifadə edin.";
  }
  return null;
}

export function validatePhoneNumber(phone: string): string | null {
  if (!phone.trim()) return "Telefon nömrəsi daxil edin.";
  if (!normalizeContactPhone(phone)) {
    return CONTACT_PHONE_VALIDATION_MESSAGE;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return "Parol ən azı 6 simvol olmalıdır.";
  }
  return null;
}

export function isAuthConfirmed(
  user: {
    email_confirmed_at?: string | null;
    phone_confirmed_at?: string | null;
    confirmed_at?: string | null;
  } | null,
): boolean {
  if (!user) return false;
  return Boolean(user.confirmed_at ?? user.email_confirmed_at ?? user.phone_confirmed_at);
}

export function isEmailConfirmed(
  user: {
    email_confirmed_at?: string | null;
    phone_confirmed_at?: string | null;
    confirmed_at?: string | null;
  } | null,
): boolean {
  return isAuthConfirmed(user);
}
