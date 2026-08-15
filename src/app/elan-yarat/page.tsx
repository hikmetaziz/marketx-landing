import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateListingForm } from "@/components/listings/CreateListingForm";
import { PageShell } from "@/components/layout/PageShell";
import { fetchCategorySchemaSnapshot } from "@/lib/category-schema/fetch-category-schemas";
import { createPageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/session";
import { getListingCreationStoreAccess } from "@/lib/stores/membership";
import { getMyClaimRequests } from "@/lib/stores/stores";
import { fetchListingTaxonomy } from "@/lib/taxonomy/fetch-listing-taxonomy";

export const metadata: Metadata = createPageMetadata({
  title: "Elan yerləşdir",
  description: "MarktX veb saytında elan yerləşdirin.",
  path: "/elan-yarat",
  noIndex: true,
});

export default async function CreateListingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?returnTo=/elan-yarat&mode=register");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?returnTo=/elan-yarat&mode=register");
  }

  const supabase = await createClient();
  const storeAccess = await getListingCreationStoreAccess(supabase, user.id);

  if (!storeAccess.ok) {
    const myClaimRequests = await getMyClaimRequests(user.id);
    const hasPendingClaim = myClaimRequests.some((request) => request.status === "pending");
    const primaryCtaText = hasPendingClaim ? "Müraciətin vəziyyətinə bax" : "Mağaza sahibliyinə müraciət et";

    return (
      <PageShell title="Elan yerləşdir" subtitle="Mağaza girişi tələb olunur." wide>
        <div className="card-premium mx-auto max-w-2xl rounded-xl p-4 text-center hover:translate-y-0 md:rounded-2xl md:p-6">
          <p className="text-base font-semibold text-brand-text">
            {hasPendingClaim ? "Mağaza giriş müraciətiniz yoxlanılır." : storeAccess.error}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            Sahiblik müraciəti yalnız mağaza sahibi üçündür. Menecer və əməkdaş girişi mövcud mağaza idarəetmə
            prosesi ilə verilməlidir.
          </p>
          <Link
            href="/account/store/claim"
            className="btn-primary-premium mt-5 inline-flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white md:w-auto"
          >
            {primaryCtaText}
          </Link>
        </div>
      </PageShell>
    );
  }

  const [taxonomy, categorySchemaSnapshot] = await Promise.all([
    fetchListingTaxonomy(),
    fetchCategorySchemaSnapshot(),
  ]);

  return (
    <PageShell title="Elan yerləşdir" subtitle="Məhsulunuzu bir neçə addımda satışa çıxarın." wide>
      <CreateListingForm
        taxonomy={taxonomy}
        categorySchemaSnapshot={categorySchemaSnapshot}
        storeAccess={storeAccess}
      />
    </PageShell>
  );
}
