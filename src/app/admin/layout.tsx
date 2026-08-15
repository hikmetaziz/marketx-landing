import { requireSupportPanelAccess } from "@/lib/supabase/admin-session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSupportPanelAccess();
  return children;
}
