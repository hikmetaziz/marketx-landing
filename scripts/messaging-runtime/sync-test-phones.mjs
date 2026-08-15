import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const CURRENT_ENV = path.join(ROOT, ".env.local");
const TEST_ENV = path.join(ROOT, ".env.test.local");

const TARGETS = {
  customerA: {
    label: "Customer A",
    emailKey: "MARKTX_TEST_CUSTOMER_A_EMAIL",
    phoneKey: "MARKTX_TEST_CUSTOMER_A_PHONE",
    passwordKey: "MARKTX_TEST_CUSTOMER_A_PASSWORD",
    userIdKey: "MARKTX_TEST_CUSTOMER_A_USER_ID",
    phone: "+994511111111",
  },
  storeOwnerB: {
    label: "Store Owner B",
    emailKey: "MARKTX_TEST_STORE_OWNER_B_EMAIL",
    phoneKey: "MARKTX_TEST_STORE_OWNER_B_PHONE",
    passwordKey: "MARKTX_TEST_STORE_OWNER_B_PASSWORD",
    userIdKey: "MARKTX_TEST_STORE_OWNER_B_USER_ID",
    phone: "+994511111112",
  },
  adminC: {
    label: "Admin C",
    emailKey: "MARKTX_TEST_ADMIN_C_EMAIL",
    phoneKey: "MARKTX_TEST_ADMIN_C_PHONE",
    passwordKey: "MARKTX_TEST_ADMIN_C_PASSWORD",
    userIdKey: "MARKTX_TEST_ADMIN_C_USER_ID",
    phone: "+994511111113",
  },
};

function assertTestEmail(email, label) {
  if (!/^marktx-msg-.+@example\.test$/.test(email ?? "")) {
    throw new Error(`${label} is not a dedicated messaging test account.`);
  }
}

async function loadEnv(file) {
  if (!existsSync(file)) throw new Error(`${path.basename(file)} is missing.`);
  const text = await readFile(file, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return { env, text };
}

function replaceEnvValue(text, key, value) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const linePattern = new RegExp(`^${escaped}=.*$`, "m");
  if (linePattern.test(text)) {
    return text.replace(linePattern, `${key}=${value}`);
  }
  return `${text.replace(/\s*$/, "")}\n${key}=${value}\n`;
}

function createServiceClient(env) {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase URL or service role key is missing in .env.local.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createAnonClient(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase URL or anon key is missing in .env.test.local.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function updateAuthUser(service, userId, email, phone, label) {
  const { data: existing, error: readError } = await service.auth.admin.getUserById(userId);
  if (readError) throw new Error(`Failed to read ${label} auth user: ${readError.message}`);
  if (existing.user?.email !== email) {
    throw new Error(`${label} auth user id does not match the expected test email.`);
  }

  const metadata = {
    ...(existing.user.user_metadata ?? {}),
    email,
    phone,
    marktx_runtime_test: true,
  };
  const { error } = await service.auth.admin.updateUserById(userId, {
    phone,
    phone_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw new Error(`Failed to update ${label} auth phone: ${error.message}`);
}

async function main() {
  const { env: currentEnv } = await loadEnv(CURRENT_ENV);
  const { env: testEnv, text: testEnvText } = await loadEnv(TEST_ENV);

  const service = createServiceClient(currentEnv);
  const anon = createAnonClient(testEnv);
  let nextTestEnvText = testEnvText;

  const updatedAccounts = [];
  for (const target of Object.values(TARGETS)) {
    const email = testEnv[target.emailKey];
    const userId = testEnv[target.userIdKey];
    if (!email || !userId) throw new Error(`${target.label} test env values are missing.`);
    assertTestEmail(email, target.label);

    await updateAuthUser(service, userId, email, target.phone, target.label);

    const { error: profileError } = await service
      .from("profiles")
      .update({ phone: target.phone, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .eq("email", email);
    if (profileError) throw new Error(`Failed to update ${target.label} profile phone: ${profileError.message}`);

    nextTestEnvText = replaceEnvValue(nextTestEnvText, target.phoneKey, target.phone);
    updatedAccounts.push({ label: target.label, email, userId, phone: target.phone });
  }

  const storeId = testEnv.MARKTX_TEST_STORE_ID;
  const storeSlug = testEnv.MARKTX_TEST_STORE_SLUG;
  const listingId = testEnv.MARKTX_TEST_LISTING_ID;
  const listingSlug = testEnv.MARKTX_TEST_LISTING_SLUG;
  const storeOwnerPhone = TARGETS.storeOwnerB.phone;
  const storeOwnerUserId = testEnv[TARGETS.storeOwnerB.userIdKey];
  if (!storeId || !storeSlug || !listingId || !listingSlug || !storeOwnerUserId) {
    throw new Error("Test store/listing env values are missing.");
  }

  const { error: storeError } = await service
    .from("stores")
    .update({ contact_phone: storeOwnerPhone, whatsapp_phone: storeOwnerPhone })
    .eq("id", storeId)
    .eq("slug", storeSlug)
    .eq("owner_id", storeOwnerUserId);
  if (storeError) throw new Error(`Failed to update test store phone: ${storeError.message}`);

  const { data: listing, error: listingReadError } = await service
    .from("listings")
    .select("id, slug, store_id, user_id, source")
    .eq("id", listingId)
    .eq("slug", listingSlug)
    .eq("store_id", storeId)
    .eq("user_id", storeOwnerUserId)
    .eq("source", "messaging_runtime_test")
    .maybeSingle();
  if (listingReadError) throw new Error(`Failed to verify test listing: ${listingReadError.message}`);
  if (!listing) throw new Error("Test listing guard failed; refusing to update listing contact phone.");

  const { error: listingContactError } = await service
    .from("listing_contacts")
    .upsert({ listing_id: listingId, contact_phone: storeOwnerPhone }, { onConflict: "listing_id" });
  if (listingContactError) {
    throw new Error(`Failed to upsert test listing contact phone: ${listingContactError.message}`);
  }

  await writeFile(TEST_ENV, nextTestEnvText, "utf8");

  const { data: resolvedEmail, error: resolveError } = await anon.rpc("resolve_auth_email_for_phone", {
    p_phone: storeOwnerPhone,
  });
  if (resolveError) throw new Error(`Phone fallback resolver failed: ${resolveError.message}`);
  if (resolvedEmail !== testEnv[TARGETS.storeOwnerB.emailKey]) {
    throw new Error("Phone fallback resolver did not return the Store Owner B test email.");
  }

  const { error: loginError } = await anon.auth.signInWithPassword({
    email: testEnv[TARGETS.storeOwnerB.emailKey],
    password: testEnv[TARGETS.storeOwnerB.passwordKey],
  });
  if (loginError) throw new Error(`Store Owner B password sanity check failed: ${loginError.message}`);
  await anon.auth.signOut();

  console.log(
    JSON.stringify(
      {
        updatedAccounts,
        updatedStore: { id: storeId, slug: storeSlug, contactPhone: storeOwnerPhone },
        updatedListingContact: { listingId, listingSlug, contactPhone: storeOwnerPhone },
        credentialsFile: ".env.test.local",
        storeOwnerLoginPhone: "511111112",
        fallbackResolver: "ok",
        passwordSanityCheck: "ok",
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
