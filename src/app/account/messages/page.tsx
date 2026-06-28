import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSubnav } from "@/components/account/AccountSubnav";
import { MessagesInboxPanel } from "@/components/messaging/MessagesInboxPanel";
import { PageShell } from "@/components/layout/PageShell";
import { createPageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthenticatedUser } from "@/lib/supabase/session";

export const metadata: Metadata = createPageMetadata({
  title: "Mesajlarım",
  description: "MarktX-də elanlar üzrə söhbətləriniz.",
  path: "/account/messages",
  noIndex: true,
});

export default async function AccountMessagesPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?returnTo=/account/messages");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?returnTo=/account/messages");
  }

  return (
    <PageShell
      wide
      title="Mesajlarım"
      subtitle="Alıcı və satıcılarla eyni söhbətlər mobil tətbiqdə də görünür."
    >
      <AccountSubnav active="messages" />
      <MessagesInboxPanel />
    </PageShell>
  );
}
