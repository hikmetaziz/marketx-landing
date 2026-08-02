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
  const test = await loadEnv(".env.test.local");
  const supabase = createClient(test.NEXT_PUBLIC_SUPABASE_URL, test.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const login = await supabase.auth.signInWithPassword({
    email: test.MARKTX_TEST_STORE_OWNER_B_EMAIL,
    password: test.MARKTX_TEST_STORE_OWNER_B_PASSWORD,
  });
  if (login.error) throw login.error;

  const allVisible = await supabase
    .from("conversations")
    .select("id, conversation_type, customer_user_id, store_id, listing_id, status, last_message_at")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const storeVisible = await supabase
    .from("conversations")
    .select("id, conversation_type, customer_user_id, store_id, listing_id, status, last_message_at")
    .eq("store_id", test.MARKTX_TEST_STORE_ID)
    .in("conversation_type", ["customer_store", "store_support"])
    .order("last_message_at", { ascending: false, nullsFirst: false });

  await supabase.auth.signOut();

  console.log(
    JSON.stringify(
      {
        ownerUserId: login.data.user.id,
        allVisible: {
          count: allVisible.data?.length ?? 0,
          error: allVisible.error?.message ?? null,
          rows: allVisible.data ?? [],
        },
        storeVisible: {
          count: storeVisible.data?.length ?? 0,
          error: storeVisible.error?.message ?? null,
          rows: storeVisible.data ?? [],
        },
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
