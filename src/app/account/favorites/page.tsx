import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSubnav } from "@/components/account/AccountSubnav";
import { PageShell } from "@/components/layout/PageShell";
import { LiveListingCard } from "@/components/listings/LiveListingCard";
import { getFavoriteListings } from "@/lib/listings/live-listings";
import { createPageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export const metadata: Metadata = createPageMetadata({
  title: "Seçilmiş elanlar",
  description: "MarktX-də seçdiyiniz elanlar.",
  path: "/account/favorites",
  noIndex: true,
});

export default async function AccountFavoritesPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?returnTo=/account/favorites");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?returnTo=/account/favorites");
  }

  const listings = await getFavoriteListings(user.id);

  return (
    <PageShell wide title="Seçilmişlər" subtitle="Bəyəndiyiniz elanları burada izləyə bilərsiniz.">
      <AccountSubnav active="favorites" />
      {listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {listings.map((listing) => (
            <LiveListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-brand-border bg-white p-8 text-center">
          <p className="text-sm text-brand-muted">Hələ seçilmiş elanınız yoxdur.</p>
        </div>
      )}
    </PageShell>
  );
}
