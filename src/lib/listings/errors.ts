import { translateAuthError } from "@/lib/auth";

export function translateSupabaseError(message: unknown): string {
  const rawMessage = String(message ?? "");
  const text = rawMessage.toLowerCase();

  if (text.includes("row-level security") || text.includes("permission denied")) {
    return "Bu əməliyyat üçün icazəniz yoxdur. Daxil olun.";
  }
  if (text.includes("jwt") || text.includes("session")) {
    return "Sessiya bitib. Yenidən daxil olun.";
  }
  if (text.includes("foreign key") || text.includes("violates foreign key constraint")) {
    return "Kateqoriya və ya mağaza məlumatı bazada tapılmadı. Səhifəni yeniləyib yenidən cəhd edin.";
  }
  if (text.includes("check constraint") || text.includes("violates check constraint")) {
    return "Elan məlumatlarında uyğun olmayan dəyər var. Seçimləri yoxlayıb yenidən cəhd edin.";
  }
  if (text.includes("duplicate key") || text.includes("unique constraint")) {
    return "Bu elan artıq göndərilib və yoxlanışdadır.";
  }

  return translateAuthError(rawMessage);
}
