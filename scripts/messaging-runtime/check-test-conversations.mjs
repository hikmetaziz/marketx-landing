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
  const current = await loadEnv(".env.local");
  const test = await loadEnv(".env.test.local");
  const supabase = createClient(current.NEXT_PUBLIC_SUPABASE_URL ?? current.SUPABASE_URL, current.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const storeId = test.MARKTX_TEST_STORE_ID;
  const customerId = test.MARKTX_TEST_CUSTOMER_A_USER_ID;
  const storeOwnerId = test.MARKTX_TEST_STORE_OWNER_B_USER_ID;

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug, name, owner_id")
    .eq("id", storeId)
    .maybeSingle();
  if (storeError) throw storeError;

  const { data: memberships, error: membershipError } = await supabase
    .from("store_members")
    .select("id, role, user_id")
    .eq("store_id", storeId);
  if (membershipError) throw membershipError;

  const { data: conversations, error: conversationError } = await supabase
    .from("conversations")
    .select("id, conversation_type, customer_user_id, store_id, listing_id, status, last_message_at, updated_at")
    .or(`store_id.eq.${storeId},customer_user_id.eq.${customerId}`);
  if (conversationError) throw conversationError;

  const conversationIds = (conversations ?? []).map((item) => item.id);
  let messages = [];
  if (conversationIds.length > 0) {
    const result = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, created_at")
      .in("conversation_id", conversationIds);
    if (result.error) throw result.error;
    messages = result.data ?? [];
  }

  console.log(
    JSON.stringify(
      {
        store,
        storeOwnerIsMember: (memberships ?? []).some((item) => item.user_id === storeOwnerId),
        membershipCount: memberships?.length ?? 0,
        conversationCount: conversations?.length ?? 0,
        conversations,
        messageCount: messages.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
