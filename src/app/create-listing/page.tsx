import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateListingForm } from "@/components/listings/CreateListingForm";
import { PageShell } from "@/components/layout/PageShell";
import { createPageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export const metadata: Metadata = createPageMetadata({
  title: "Elan yerləşdir",
  description: "MarktX veb saytında elan yerləşdirin.",
  path: "/create-listing",
  noIndex: true,
});

export default async function CreateListingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?returnTo=/create-listing&mode=register");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?returnTo=/create-listing&mode=register");
  }

  return (
    <PageShell title="Elan yerləşdir" subtitle="Məhsulunuzu bir neçə addımda satışa çıxarın." wide>
      <CreateListingForm />
    </PageShell>
  );
}
