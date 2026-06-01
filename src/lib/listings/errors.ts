import { translateAuthError } from "@/lib/auth";

export function translateSupabaseError(message: string): string {
  const text = message.toLowerCase();

  if (text.includes("row-level security") || text.includes("permission denied")) {
    return "Bu əməliyyat üçün icazəniz yoxdur. Daxil olun.";
  }
  if (text.includes("jwt") || text.includes("session")) {
    return "Sessiya bitib. Yenidən daxil olun.";
  }

  return translateAuthError(message);
}
