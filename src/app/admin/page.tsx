import { redirect } from "next/navigation";

import { getAdminUser, requireSupportPanelAccess } from "@/lib/supabase/admin-session";

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (admin) {
    redirect("/admin/listings");
  }

  await requireSupportPanelAccess();
  redirect("/admin/support");
}
