import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/PageShell";
import { StoreAccessTabs } from "@/components/store/StoreAccessTabs";
import { StoreClaimForm } from "@/components/store/StoreClaimForm";
import { createPageMetadata } from "@/lib/seo";
import { getListingCreationStoreAccess } from "@/lib/stores/membership";
import { getMyClaimRequests } from "@/lib/stores/stores";
import { getUserWithProfileRole } from "@/lib/supabase/admin-session";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export const metadata: Metadata = createPageMetadata({
  title: "Mağaza sahibliyinə müraciət et",
  description: "MarktX mağaza sahiblik müraciəti.",
  path: "/account/store/claim",
  noIndex: true,
});

function StateCard({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="card-premium mx-auto max-w-2xl rounded-2xl p-6 text-center hover:translate-y-0">
      <p className="text-base font-semibold text-brand-text">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">
        {description}
      </p>

      {href && action ? (
        <Link
          href={href}
          className="btn-primary-premium mt-5 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        >
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export default async function StoreClaimPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent("/account/store/claim")}`);
  }

  const supabase = await createClient();
  const [adminSession, storeAccess, myRequests] = await Promise.all([
    getUserWithProfileRole(),
    getListingCreationStoreAccess(supabase, user.id),
    getMyClaimRequests(user.id),
  ]);

  const isAdminOrModerator =
    adminSession?.role === "admin" || adminSession?.role === "moderator";

  if (isAdminOrModerator) {
    const isAdmin = adminSession?.role === "admin";

    return (
      <PageShell
        title="Mağaza sahibliyinə müraciət et"
        subtitle="Bu bölmə mağaza sahibliyinə müraciət edən istifadəçilər üçündür."
      >
        <StateCard
          title="Bu bölmə mağaza girişinə müraciət edən istifadəçilər üçündür."
          description={
            isAdmin
              ? "Mağaza yaratmaq, sahiblik kodu vermək və müraciətləri yoxlamaq üçün admin mağaza idarəetməsindən istifadə edin."
              : "Moderator hesabı ilə adi sahiblik müraciəti göndərmək düzgün deyil. Mağaza idarəetməsi üçün admin səlahiyyəti tələb olunur."
          }
          href={isAdmin ? "/admin/stores" : undefined}
          action={isAdmin ? "Mağazaların idarə edilməsinə keç" : undefined}
        />
      </PageShell>
    );
  }

  const hasPendingClaim = myRequests.some(
    (request) => request.status === "pending",
  );

  return (
    <PageShell
      title="Mağaza girişi"
      subtitle={
        storeAccess.ok
          ? "Mövcud mağazanızı idarə edin və ya başqa mağazanı hesabınıza bağlayın."
          : "Mövcud mağazanı hesabınıza bağlayın və ya yeni mağaza üçün müraciət göndərin."
      }
    >
      <StoreAccessTabs active="claim" />

      {storeAccess.ok ? (
        <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-brand-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-text">
              Aktiv mağazanız var
            </p>
            <p className="mt-1 text-sm leading-relaxed text-brand-muted">
              Mövcud mağazanızı paneldən idarə edə bilərsiniz. Başqa mağazanı
              aktivləşdirmək üçün aşağıdakı formadan istifadə edin.
            </p>
          </div>

          <Link
            href="/account/store"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
          >
            Mağaza panelinə keç
          </Link>
        </section>
      ) : null}

      {!storeAccess.ok && !hasPendingClaim ? (
        <section className="mt-5 rounded-2xl border border-brand-border bg-white p-5">
          <p className="text-sm font-semibold text-brand-text">
            Aktiv mağaza girişiniz yoxdur
          </p>
          <p className="mt-1 text-sm leading-relaxed text-brand-muted">
            Sizə mağaza və aktivasiya kodu göndərilibsə, aşağıdakı xanaları
            doldurun.
          </p>
        </section>
      ) : null}

      {hasPendingClaim ? (
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            Gözləyən müraciətiniz var
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-700">
            Admin sizə aktivasiya kodu göndəribsə, müraciətin nəticəsini
            gözləmədən həmin kodla mağazanı aktivləşdirə bilərsiniz.
          </p>
        </section>
      ) : null}

      <section id="claim-form" className="mt-7 scroll-mt-24">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-brand-text">
            {storeAccess.ok
              ? "Başqa mağazanı aktivləşdir"
              : "Mağazanı aktivləşdir"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-brand-muted">
            Mesajda göndərilən mağaza kodu və aktivasiya kodu bu səhifəyə
            keçdikdə avtomatik doldurula bilər.
          </p>
        </div>

        <StoreClaimForm myRequests={myRequests} />
      </section>
    </PageShell>
  );
}

