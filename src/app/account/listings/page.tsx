import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSubnav } from "@/components/account/AccountSubnav";
import { MyListingsPanel } from "@/components/account/MyListingsPanel";
import { PageShell } from "@/components/layout/PageShell";
import { getMyListings } from "@/lib/listings/my-listings";
import { createPageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export const metadata: Metadata = createPageMetadata({
  title: "Mənim elanlarım",
  description: "MarktX-də yerləşdirdiyiniz elanlar.",
  path: "/account/listings",
  noIndex: true,
});

export default async function MyListingsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?returnTo=/account/listings");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?returnTo=/account/listings");
  }

  const listings = await getMyListings(user.id);

  return (
    <PageShell
      wide
      title="Mənim elanlarım"
      subtitle="Yerləşdirdiyiniz elanları idarə edin."
    >
      <AccountSubnav active="listings" />
      <div className="mb-6">
        <Link
          href="/create-listing"
          className="btn-primary-premium inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        >
          Yeni elan
        </Link>
      </div>
      <MyListingsPanel listings={listings} />
    </PageShell>
  );
}
