import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/PageShell";
import { StoreAccessTabs } from "@/components/store/StoreAccessTabs";
import { NewStoreApplicationForm } from "@/components/store/NewStoreApplicationForm";
import { createPageMetadata } from "@/lib/seo";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export const metadata: Metadata = createPageMetadata({
  title: "Yeni mağaza müraciəti",
  description: "MarktX-də yeni mağaza açmaq üçün müraciət.",
  path: "/account/store/apply",
  noIndex: true,
});

export default async function NewStoreApplicationPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent("/account/store/apply")}`);
  }

  return (
    <PageShell
      title="Yeni mağaza müraciəti"
      subtitle="Məlumatları göndərin. MarktX komandası yoxladıqdan sonra mağazanı ayrıca yaradacaq."
    >
      <StoreAccessTabs active="apply" />
      <NewStoreApplicationForm />
    </PageShell>
  );
}
