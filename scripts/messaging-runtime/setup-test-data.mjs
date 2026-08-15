import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const CURRENT_ENV = path.join(ROOT, ".env.local");
const STAGING_ENV = path.join(ROOT, ".env.staging.local");
const TEST_ENV = path.join(ROOT, ".env.test.local");
const OUT_DIR = path.join(ROOT, "exports", "messaging-runtime-test");

function parseArgs() {
  const args = new Map();
  for (const entry of process.argv.slice(2)) {
    const [key, value = "true"] = entry.replace(/^--/, "").split("=");
    args.set(key, value);
  }
  return {
    target: args.get("target") ?? "auto",
  };
}

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

function randomPassword() {
  return `${crypto.randomBytes(18).toString("base64url")}aA1!`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function createServiceClient(env) {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase URL or service role key is missing in target env file.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createAnonClient(env) {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase URL or anon key is missing in target env file.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function probeTarget(label, envFile) {
  if (!existsSync(envFile)) return { label, envFile, ok: false, reason: "env file missing" };
  const env = await loadEnv(envFile);
  const supabase = createServiceClient(env);
  const rpc = await supabase.rpc("list_reported_customer_store_conversations", {
    p_limit: 1,
    p_offset: 0,
  });
  const tables = await Promise.all(
    ["profiles", "stores", "store_members", "listings", "conversations"].map(async (table) => {
      const result = await supabase.from(table).select("id", { count: "exact", head: true });
      return [table, !result.error];
    }),
  );
  const missingTables = tables.filter(([, ok]) => !ok).map(([table]) => table);
  const rpcReady = !rpc.error || rpc.error.message === "auth_required" || rpc.error.message === "support_access_denied";
  return {
    label,
    envFile,
    env,
    ok: rpcReady && missingTables.length === 0,
    reason: rpcReady ? (missingTables.length ? `missing tables: ${missingTables.join(", ")}` : "ready") : rpc.error.message,
  };
}

async function chooseTarget(target) {
  const staging = await probeTarget("staging", STAGING_ENV);
  const current = await probeTarget("current", CURRENT_ENV);

  if (target === "staging") {
    if (!staging.ok) throw new Error(`Staging is not ready for Phase B1 runtime tests: ${staging.reason}`);
    return staging;
  }
  if (target === "current") {
    if (!current.ok) throw new Error(`Current project is not ready for Phase B1 runtime tests: ${current.reason}`);
    return current;
  }
  if (staging.ok) return staging;
  if (current.ok) {
    return { ...current, stagingSkippedReason: staging.reason };
  }
  throw new Error(`No usable target. staging=${staging.reason}; current=${current.reason}`);
}

async function createAuthUser(supabase, { email, phone, password, displayName }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      display_name: displayName,
      full_name: displayName,
      email,
      phone,
      marktx_runtime_test: true,
    },
  });
  if (error) throw new Error(`Failed to create auth user ${email}: ${error.message}`);
  return data.user;
}

async function upsertProfile(supabase, { id, email, phone, displayName, role }) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id,
      email,
      phone,
      display_name: displayName,
      role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`Failed to upsert profile ${email}: ${error.message}`);
}

async function createListingNumber(supabase) {
  const { data, error } = await supabase
    .from("listings")
    .select("listing_number")
    .order("listing_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to read listing_number: ${error.message}`);
  return Number(data?.listing_number ?? 1000) + 1;
}

function cleanupSql(ids) {
  const userIds = [ids.customerUserId, ids.storeOwnerUserId, ids.adminUserId].map((id) => `'${id}'::uuid`).join(", ");
  return `-- MarktX messaging runtime test cleanup.
-- Review before running. This removes only the dedicated test rows from run ${ids.runId}.
begin;

delete from public.conversation_reads
where conversation_id in (
  select id from public.conversations
  where store_id = '${ids.storeId}'::uuid
     or customer_user_id in (${userIds})
);

delete from public.messages
where conversation_id in (
  select id from public.conversations
  where store_id = '${ids.storeId}'::uuid
     or customer_user_id in (${userIds})
);

delete from public.conversation_access_audit
where conversation_id in (
  select id from public.conversations
  where store_id = '${ids.storeId}'::uuid
     or customer_user_id in (${userIds})
);

delete from public.reports
where conversation_id in (
  select id from public.conversations
  where store_id = '${ids.storeId}'::uuid
     or customer_user_id in (${userIds})
);

delete from public.conversations
where store_id = '${ids.storeId}'::uuid
   or customer_user_id in (${userIds});

delete from public.listings
where id = '${ids.listingId}'::uuid
  and source = 'messaging_runtime_test';

delete from public.store_members
where id = '${ids.storeMemberId}'::uuid
  and store_id = '${ids.storeId}'::uuid
  and user_id = '${ids.storeOwnerUserId}'::uuid;

delete from public.stores
where id = '${ids.storeId}'::uuid
  and slug = '${ids.storeSlug}';

delete from public.profiles
where id in (${userIds})
  and email like 'marktx-msg-%@example.test';

delete from auth.users
where id in (${userIds})
  and email like 'marktx-msg-%@example.test';

commit;
`;
}

async function main() {
  const { target } = parseArgs();
  const targetInfo = await chooseTarget(target);
  const env = targetInfo.env;
  const service = createServiceClient(env);
  const anon = createAnonClient(env);
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const accounts = {
    customer: {
      email: `marktx-msg-customer-a-${runId}@example.test`,
      phone: `+994511111111`,
      password: randomPassword(),
      displayName: `MarktX Msg Customer A ${runId}`,
      role: "user",
    },
    storeOwner: {
      email: `marktx-msg-store-owner-b-${runId}@example.test`,
      phone: `+994511111112`,
      password: randomPassword(123456),
      displayName: `MarktX Msg Store Owner B ${runId}`,
      role: "user",
    },
    admin: {
      email: `marktx-msg-admin-c-${runId}@example.test`,
      phone: `+994511111113`,
      password: randomPassword(),
      displayName: `MarktX Msg Admin C ${runId}`,
      role: "admin",
    },
  };

  const customerUser = await createAuthUser(service, accounts.customer);
  const storeOwnerUser = await createAuthUser(service, accounts.storeOwner);
  const adminUser = await createAuthUser(service, accounts.admin);

  await upsertProfile(service, { ...accounts.customer, id: customerUser.id });
  await upsertProfile(service, { ...accounts.storeOwner, id: storeOwnerUser.id });
  await upsertProfile(service, { ...accounts.admin, id: adminUser.id });

  const storeSlug = slugify(`messaging-test-store-${runId}`);
  const { data: store, error: storeError } = await service
    .from("stores")
    .insert({
      name: `Messaging Test Store ${runId}`,
      slug: storeSlug,
      description: "Dedicated temporary store for MarktX Phase B1 authenticated messaging runtime tests.",
      category: "Test",
      contact_phone: accounts.storeOwner.phone,
      whatsapp_phone: accounts.storeOwner.phone,
      city: "Bakı",
      owner_id: storeOwnerUser.id,
      created_by: adminUser.id,
      status: "claimed",
    })
    .select("id, slug")
    .single();
  if (storeError) throw new Error(`Failed to create test store: ${storeError.message}`);

  const { data: membership, error: membershipError } = await service
    .from("store_members")
    .insert({
      store_id: store.id,
      user_id: storeOwnerUser.id,
      role: "owner",
    })
    .select("id")
    .single();
  if (membershipError) throw new Error(`Failed to create store membership: ${membershipError.message}`);

  const listingNumber = await createListingNumber(service);
  const listingSlug = slugify(`messaging-test-listing-${runId}`);
  const { data: listing, error: listingError } = await service
    .from("listings")
    .insert({
      user_id: storeOwnerUser.id,
      title: `Messaging Runtime Test Listing ${runId}`,
      price: 1,
      category: "Test",
      city: "Bakı",
      condition: "Yeni",
      description: "Dedicated temporary active listing for MarktX Phase B1 customer-store messaging runtime tests.",
      status: "active",
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
      listing_number: listingNumber,
      slug: listingSlug,
      is_sample: false,
      source: "messaging_runtime_test",
      attributes: { marktx_runtime_test: true, run_id: runId },
      listing_type: "sell",
      price_type: "fixed",
      delivery_type: "pickup",
      condition_code: "new",
      store_id: store.id,
      contact_phone: accounts.storeOwner.phone,
      form_schema_version: 1,
      photo_schema_version: 1,
    })
    .select("id, slug")
    .single();
  if (listingError) throw new Error(`Failed to create test listing: ${listingError.message}`);

  for (const account of Object.values(accounts)) {
    const login = await anon.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error) throw new Error(`Credential sanity check failed for ${account.email}: ${login.error.message}`);
    await anon.auth.signOut();
  }

  const runDir = path.join(OUT_DIR, runId);
  await mkdir(runDir, { recursive: true });
  const cleanupPath = path.join(runDir, "cleanup.sql");
  const ids = {
    runId,
    customerUserId: customerUser.id,
    storeOwnerUserId: storeOwnerUser.id,
    adminUserId: adminUser.id,
    storeId: store.id,
    storeSlug: store.slug,
    storeMemberId: membership.id,
    listingId: listing.id,
    listingSlug: listing.slug,
  };
  await writeFile(cleanupPath, cleanupSql(ids), "utf8");

  const publicUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envText = `# MarktX Phase B1 messaging runtime test credentials.
# Untracked local file. Do not commit. Do not paste passwords into chat.
MARKTX_TEST_TARGET=${targetInfo.label}
MARKTX_TEST_TARGET_URL=${publicUrl}
NEXT_PUBLIC_SUPABASE_URL=${publicUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
MARKTX_TEST_RUN_ID=${runId}

MARKTX_TEST_CUSTOMER_A_EMAIL=${accounts.customer.email}
MARKTX_TEST_CUSTOMER_A_PHONE=${accounts.customer.phone}
MARKTX_TEST_CUSTOMER_A_PASSWORD=${accounts.customer.password}
MARKTX_TEST_CUSTOMER_A_USER_ID=${customerUser.id}

MARKTX_TEST_STORE_OWNER_B_EMAIL=${accounts.storeOwner.email}
MARKTX_TEST_STORE_OWNER_B_PHONE=${accounts.storeOwner.phone}
MARKTX_TEST_STORE_OWNER_B_PASSWORD=${accounts.storeOwner.password}
MARKTX_TEST_STORE_OWNER_B_USER_ID=${storeOwnerUser.id}

MARKTX_TEST_ADMIN_C_EMAIL=${accounts.admin.email}
MARKTX_TEST_ADMIN_C_PHONE=${accounts.admin.phone}
MARKTX_TEST_ADMIN_C_PASSWORD=${accounts.admin.password}
MARKTX_TEST_ADMIN_C_USER_ID=${adminUser.id}

MARKTX_TEST_STORE_ID=${store.id}
MARKTX_TEST_STORE_SLUG=${store.slug}
MARKTX_TEST_LISTING_ID=${listing.id}
MARKTX_TEST_LISTING_SLUG=${listing.slug}
MARKTX_TEST_STORE_MEMBER_ID=${membership.id}
MARKTX_TEST_CLEANUP_SQL=${path.relative(ROOT, cleanupPath).replace(/\\/g, "/")}
`;
  await writeFile(TEST_ENV, envText, { encoding: "utf8", flag: "w" });

  console.log(
    JSON.stringify(
      {
        target: targetInfo.label,
        targetUrlHost: new URL(publicUrl).host,
        stagingSkippedReason: targetInfo.stagingSkippedReason ?? null,
        testAccountEmails: {
          customerA: accounts.customer.email,
          storeOwnerB: accounts.storeOwner.email,
          adminC: accounts.admin.email,
        },
        credentialsFile: ".env.test.local",
        testStoreId: store.id,
        testListingId: listing.id,
        storeMembershipId: membership.id,
        cleanupSql: path.relative(ROOT, cleanupPath).replace(/\\/g, "/"),
        createdRows: {
          authUsers: [customerUser.id, storeOwnerUser.id, adminUser.id],
          profiles: [customerUser.id, storeOwnerUser.id, adminUser.id],
          stores: [store.id],
          storeMembers: [membership.id],
          listings: [listing.id],
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
