import { requireAdmin } from "@/lib/supabase/admin-session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
