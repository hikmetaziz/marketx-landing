export function translateAuthError(message: string): string {
  const text = message.toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "Yanlış email və ya parol. Əvvəl «Qeydiyyat» edin.";
  }
  if (text.includes("email not confirmed")) {
    return "Email təsdiqlənməyib. Poçt qutunuzdakı təsdiq linkinə klik edin.";
  }
  if (text.includes("user already registered")) {
    return "Bu email artıq qeydiyyatdadır. «Daxil ol» istifadə edin.";
  }
  if (text.includes("password should be at least") || text.includes("weak password")) {
    return "Parol ən azı 8 simvol, hərf və xüsusi simvol olmalıdır.";
  }
  if (text.includes("unable to validate email") || text.includes("invalid email")) {
    return "Email formatı yanlışdır.";
  }
  if (text.includes("signup is disabled")) {
    return "Qeydiyyat bağlıdır. Supabase Authentication yoxlayın.";
  }
  if (text.includes("network") || text.includes("fetch")) {
    return "İnternet və ya Supabase bağlantısı yoxdur.";
  }

  return "Xəta baş verdi. Yenidən cəhd edin.";
}

export function validateEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return "Email daxil edin.";
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

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return "Parol ən azı 6 simvol olmalıdır.";
  }
  return null;
}

export function isEmailConfirmed(user: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null): boolean {
  if (!user) return false;
  return Boolean(user.email_confirmed_at ?? user.confirmed_at);
}
