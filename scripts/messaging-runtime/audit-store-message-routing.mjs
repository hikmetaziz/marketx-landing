import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

async function loadEnv(file) {
  const text = await readFile(file, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function main() {
  const env = await loadEnv(".env.local");
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id, conversation_type, store_id, customer_user_id, listing_id, status, last_message_at, updated_at")
    .eq("conversation_type", "customer_store")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (conversationsError) throw conversationsError;

  const storeIds = [...new Set((conversations ?? []).map((row) => row.store_id).filter(Boolean))];
  const listingIds = [...new Set((conversations ?? []).map((row) => row.listing_id).filter(Boolean))];
  const conversationIds = (conversations ?? []).map((row) => row.id);

  const [storesRes, membersRes, listingsRes, messagesRes] = await Promise.all([
    storeIds.length
      ? supabase.from("stores").select("id, name, slug, status, owner_id").in("id", storeIds)
      : Promise.resolve({ data: [], error: null }),
    storeIds.length
      ? supabase.from("store_members").select("id, store_id, user_id, role").in("store_id", storeIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? supabase.from("listings").select("id, title, slug, store_id, user_id").in("id", listingIds)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length
      ? supabase.from("messages").select("id, conversation_id, sender_id, created_at").in("conversation_id", conversationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [storesRes, membersRes, listingsRes, messagesRes]) {
    if (result.error) throw result.error;
  }

  const storeById = new Map((storesRes.data ?? []).map((store) => [store.id, store]));
  const listingById = new Map((listingsRes.data ?? []).map((listing) => [listing.id, listing]));
  const membersByStore = new Map();
  for (const member of membersRes.data ?? []) {
    const next = membersByStore.get(member.store_id) ?? [];
    next.push(member);
    membersByStore.set(member.store_id, next);
  }
  const messageCountByConversation = new Map();
  for (const message of messagesRes.data ?? []) {
    messageCountByConversation.set(
      message.conversation_id,
      (messageCountByConversation.get(message.conversation_id) ?? 0) + 1,
    );
  }

  const rows = (conversations ?? []).map((conversation) => {
    const store = storeById.get(conversation.store_id);
    const listing = conversation.listing_id ? listingById.get(conversation.listing_id) : null;
    const members = membersByStore.get(conversation.store_id) ?? [];
    return {
      conversationId: conversation.id,
      status: conversation.status,
      store: store
        ? {
            id: store.id,
            name: store.name,
            slug: store.slug,
            status: store.status,
            hasOwnerId: Boolean(store.owner_id),
          }
        : null,
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            slug: listing.slug,
            listingStoreMatchesConversation: listing.store_id === conversation.store_id,
          }
        : null,
      storeMemberCount: members.length,
      storeMemberRoles: members.map((member) => member.role),
      messageCount: messageCountByConversation.get(conversation.id) ?? 0,
      updatedAt: conversation.updated_at,
    };
  });

  console.log(JSON.stringify({ customerStoreConversationCount: conversations?.length ?? 0, rows }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
