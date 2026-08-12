import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/PageShell";
import { StoreDashboardForm } from "@/components/store/StoreDashboardForm";
import { createPageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/session";
import type { Store } from "@/types/store";

export const metadata: Metadata = createPageMetadata({
  title: "Mağaza paneli",
  description: "MarktX mağazalarınızı idarə edin.",
  path: "/account/store",
  noIndex: true,
});

const STORE_SELECT =
  "id, store_code, name, slug, description, category, category_id, contact_phone, whatsapp_phone, address, city, map_url, logo_url, cover_url, owner_id, status, created_by, created_at, updated_at";

type StorePageProps = {
  searchParams: Promise<{
    store?: string | string[];
  }>;
};

export default async function StorePage({
  searchParams,
}: StorePageProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent("/account/store")}`);
  }

  const supabase = await createClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from("store_members")
    .select("store_id, created_at")
    .eq("user_id", user.id)
    .in("role", ["owner", "manager", "staff"])
    .order("created_at", { ascending: false });

  if (membershipsError) {
    throw new Error("Mağaza girişləri yüklənmədi.");
  }

  const membershipStoreIds = [
    ...new Set(
      (memberships ?? [])
        .map((membership) => membership.store_id)
        .filter((storeId): storeId is string => typeof storeId === "string"),
    ),
  ];

  const memberStoresPromise =
    membershipStoreIds.length > 0
      ? supabase
          .from("stores")
          .select(STORE_SELECT)
          .in("id", membershipStoreIds)
          .eq("status", "claimed")
      : Promise.resolve({
          data: [] as Store[],
          error: null,
        });

  const [memberStoresResult, ownedStoresResult] = await Promise.all([
    memberStoresPromise,
    supabase
      .from("stores")
      .select(STORE_SELECT)
      .eq("owner_id", user.id)
      .eq("status", "claimed")
      .order("created_at", { ascending: false }),
  ]);

  if (memberStoresResult.error || ownedStoresResult.error) {
    throw new Error("Mağazalar yüklənmədi.");
  }

  const storeMap = new Map<string, Store>();

  for (const store of [
    ...((memberStoresResult.data ?? []) as Store[]),
    ...((ownedStoresResult.data ?? []) as Store[]),
  ]) {
    storeMap.set(store.id, store);
  }

  const stores = [...storeMap.values()].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );

  if (stores.length === 0) {
    return (
      <PageShell
        title="Mağaza paneli"
        subtitle="Hesabınıza bağlı aktiv mağaza tapılmadı."
      >
        <div className="rounded-xl border border-brand-border bg-white p-4 text-center shadow-sm md:rounded-2xl md:p-6">
          <p className="text-sm leading-relaxed text-brand-muted">
            Mövcud mağazanı aktivasiya kodu ilə hesabınıza bağlaya və ya yeni
            mağaza üçün müraciət göndərə bilərsiniz.
          </p>

          <div className="mt-5 flex flex-col justify-center gap-3 md:flex-row">
            <Link
              href="/account/store/claim"
              className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
            >
              Mağazanı aktivləşdir
            </Link>

            <Link
              href="/account/store/apply"
              className="inline-flex items-center justify-center rounded-xl border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
            >
              Yeni mağaza aç
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const params = await searchParams;
  const requestedStoreId = Array.isArray(params.store)
    ? params.store[0]
    : params.store;

  const selectedStore =
    stores.find((store) => store.id === requestedStoreId) ?? stores[0];

  return (
    <PageShell
      title="Mağaza paneli"
      subtitle={
        stores.length > 1
          ? "Mağazalarınız arasında keçid edin və seçilmiş mağazanı idarə edin."
          : "Mağaza məlumatlarınızı idarə edin."
      }
    >
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-brand-border bg-white p-4 shadow-sm md:mb-6 md:gap-4 md:rounded-2xl md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-text">
              {stores.length > 1 ? "Mağazalarım" : "Aktiv mağaza"}
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              {stores.length} aktiv mağaza
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/account/store/claim"
              className="rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
            >
              Başqa mağazanı aktivləşdir
            </Link>

            <Link
              href="/account/store/apply"
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
            >
              Yeni mağaza aç
            </Link>
          </div>
        </div>

        {stores.length > 1 ? (
          <nav
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Mağazalar"
          >
            {stores.map((store) => {
              const isActive = store.id === selectedStore.id;

              return (
                <Link
                  key={store.id}
                  href={`/account/store?store=${encodeURIComponent(store.id)}`}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-colors md:px-4 md:py-2.5 ${
                    isActive
                      ? "border-brand-primary bg-brand-primary-light/40 text-brand-primary-dark"
                      : "border-brand-border bg-white text-brand-text hover:border-brand-primary/40"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {store.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-xs opacity-70">
                    {store.store_code}
                  </span>
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      <StoreDashboardForm store={selectedStore} />
    </PageShell>
  );
}
