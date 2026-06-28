import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChatPanel } from "@/components/messaging/ChatPanel";
import { createPageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthenticatedUser } from "@/lib/supabase/session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return createPageMetadata({
    title: "Söhbət",
    description: "MarktX elan söhbəti.",
    path: `/account/messages/${id}`,
    noIndex: true,
  });
}

export default async function AccountMessageChatPage({ params }: Props) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    redirect(`/login?returnTo=${encodeURIComponent(`/account/messages/${id}`)}`);
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(`/account/messages/${id}`)}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <ChatPanel conversationId={id} />
    </div>
  );
}
