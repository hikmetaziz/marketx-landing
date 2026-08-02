import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const TEST_ENV = ".env.test.local";
const CURRENT_ENV = ".env.local";

function randomPassword() {
  return `${crypto.randomBytes(18).toString("base64url")}aA1!`;
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

async function mergeTestEnv(patch) {
  const text = existsSync(TEST_ENV) ? await readFile(TEST_ENV, "utf8") : "";
  const lines = text.split(/\r?\n/);
  const seen = new Set();
  const next = lines.map((line) => {
    const match = line.match(/^([^#=]+)=/);
    if (!match) return line;
    const key = match[1].trim();
    if (!(key in patch)) return line;
    seen.add(key);
    return `${key}=${patch[key]}`;
  });

  for (const [key, value] of Object.entries(patch)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }

  await writeFile(TEST_ENV, `${next.join("\n").replace(/\n+$/u, "")}\n`, "utf8");
}

function serviceClient(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or service-role key in .env.local");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function anonClient(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or anon key");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function clientWithToken(env, accessToken) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function countRows(supabase, table, filter) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

async function profileRoleCounts(supabase) {
  const { data, error } = await supabase.from("profiles").select("role");
  if (error) throw new Error(`profiles role count: ${error.message}`);
  const counts = {};
  for (const row of data ?? []) counts[row.role ?? "null"] = (counts[row.role ?? "null"] ?? 0) + 1;
  return counts;
}

async function findAuthUserByEmail(supabase, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`list auth users: ${error.message}`);
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) break;
  }
  return null;
}

async function ensureSupportAgent(service, test) {
  const runId = test.MARKTX_TEST_RUN_ID;
  const email = test.MARKTX_TEST_SUPPORT_AGENT_D_EMAIL || `marktx-msg-support-agent-d-${runId}@example.test`;
  const phone = test.MARKTX_TEST_SUPPORT_AGENT_D_PHONE || "+994511111114";
  const password = test.MARKTX_TEST_SUPPORT_AGENT_D_PASSWORD || randomPassword();
  let userId = test.MARKTX_TEST_SUPPORT_AGENT_D_USER_ID;

  let user = userId ? null : await findAuthUserByEmail(service, email);
  if (!user && !userId) {
    const created = await service.auth.admin.createUser({
      email,
      phone,
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        display_name: `MarktX Msg Support Agent D ${runId}`,
        marktx_runtime_test: true,
      },
    });
    if (created.error) throw new Error(`create support_agent user: ${created.error.message}`);
    user = created.data.user;
  }

  if (user) userId = user.id;
  if (!userId) throw new Error("support_agent user id unavailable");

  const updateAuth = await service.auth.admin.updateUserById(userId, {
    email,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      display_name: `MarktX Msg Support Agent D ${runId}`,
      marktx_runtime_test: true,
    },
  });
  if (updateAuth.error) throw new Error(`update support_agent auth user: ${updateAuth.error.message}`);

  const { error } = await service.from("profiles").upsert(
    {
      id: userId,
      email,
      phone,
      display_name: `MarktX Msg Support Agent D ${runId}`,
      role: "support_agent",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`upsert support_agent profile: ${error.message}`);

  await mergeTestEnv({
    MARKTX_TEST_SUPPORT_AGENT_D_EMAIL: email,
    MARKTX_TEST_SUPPORT_AGENT_D_PHONE: phone,
    MARKTX_TEST_SUPPORT_AGENT_D_PASSWORD: password,
    MARKTX_TEST_SUPPORT_AGENT_D_USER_ID: userId,
  });

  return { email, phone, userId, password };
}

async function ensureDedicatedRoles(service, test) {
  const rows = [
    [test.MARKTX_TEST_CUSTOMER_A_USER_ID, "user"],
    [test.MARKTX_TEST_STORE_OWNER_B_USER_ID, "user"],
    [test.MARKTX_TEST_ADMIN_C_USER_ID, "admin"],
  ];
  for (const [id, role] of rows) {
    const { error } = await service.from("profiles").update({ role }).eq("id", id);
    if (error) throw new Error(`ensure role ${role} for ${id}: ${error.message}`);
  }
}

async function signIn(env, label, email, password) {
  const client = anonClient(env);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`sign in ${label}: ${error?.message ?? "no session"}`);
  return {
    label,
    userId: data.user.id,
    client: clientWithToken(env, data.session.access_token),
  };
}

function denied(result) {
  return Boolean(result.error);
}

function allowed(result) {
  return !result.error;
}

function assertCheck(checks, name, passed, details = undefined) {
  checks.push({ name, passed: Boolean(passed), details });
}

async function rpc(client, fn, args = {}) {
  return client.rpc(fn, args);
}

async function ensureListingNumber(service) {
  const { data, error } = await service
    .from("listings")
    .select("listing_number")
    .order("listing_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`read listing number: ${error.message}`);
  return Number(data?.listing_number ?? 1000) + 1;
}

async function createUnreportedListing(service, test) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/gu, "").slice(0, 14);
  const listingNumber = await ensureListingNumber(service);
  const slug = `messaging-runtime-unreported-${stamp}`;
  const { data, error } = await service
    .from("listings")
    .insert({
      user_id: test.MARKTX_TEST_STORE_OWNER_B_USER_ID,
      title: `Messaging Runtime Unreported Listing ${stamp}`,
      price: 1,
      category: "Test",
      city: "Bakı",
      condition: "Yeni",
      description: "Dedicated temporary listing for unreported customer-store support access denial.",
      status: "active",
      reviewed_by: test.MARKTX_TEST_ADMIN_C_USER_ID,
      reviewed_at: new Date().toISOString(),
      listing_number: listingNumber,
      slug,
      is_sample: false,
      source: "messaging_runtime_test",
      attributes: { marktx_runtime_test: true, support_agent_runtime_check: true },
      listing_type: "sell",
      price_type: "fixed",
      delivery_type: "pickup",
      condition_code: "new",
      store_id: test.MARKTX_TEST_STORE_ID,
      contact_phone: test.MARKTX_TEST_STORE_OWNER_B_PHONE,
      form_schema_version: 1,
      photo_schema_version: 1,
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(`create unreported listing: ${error.message}`);
  return data;
}

async function ensureMessagingFixtures(service, sessions, test) {
  const customer = sessions.customer.client;
  const storeOwner = sessions.storeOwner.client;

  const customerSupport = await rpc(customer, "get_or_create_customer_support_conversation", {
    p_support_topic: "technical_problem",
    p_subject: "Runtime support-agent customer support check",
  });
  if (customerSupport.error) throw new Error(`customer_support create: ${customerSupport.error.message}`);

  const customerSupportMessage = await rpc(customer, "send_conversation_message", {
    p_conversation_id: customerSupport.data,
    p_body: "Runtime customer support check message",
    p_sender_context: null,
  });
  if (customerSupportMessage.error) throw new Error(`customer_support message: ${customerSupportMessage.error.message}`);

  const storeSupport = await rpc(storeOwner, "get_or_create_store_support_conversation", {
    p_store_id: test.MARKTX_TEST_STORE_ID,
    p_support_topic: "technical_problem",
    p_subject: "Runtime support-agent store support check",
  });
  if (storeSupport.error) throw new Error(`store_support create: ${storeSupport.error.message}`);

  const storeSupportMessage = await rpc(storeOwner, "send_conversation_message", {
    p_conversation_id: storeSupport.data,
    p_body: "Runtime store support check message",
    p_sender_context: null,
  });
  if (storeSupportMessage.error) throw new Error(`store_support message: ${storeSupportMessage.error.message}`);

  const reportedCustomerStore = await rpc(customer, "get_or_create_customer_store_conversation", {
    p_store_id: test.MARKTX_TEST_STORE_ID,
    p_listing_id: test.MARKTX_TEST_LISTING_ID,
    p_subject: "Runtime reported customer-store check",
  });
  if (reportedCustomerStore.error) throw new Error(`reported customer_store create: ${reportedCustomerStore.error.message}`);

  const reportedMessage = await rpc(customer, "send_conversation_message", {
    p_conversation_id: reportedCustomerStore.data,
    p_body: "Runtime reported customer-store check message",
    p_sender_context: null,
  });
  if (reportedMessage.error) throw new Error(`reported customer_store message: ${reportedMessage.error.message}`);

  const { data: reportedRow, error: reportedReadError } = await service
    .from("conversations")
    .select("id, reported_at")
    .eq("id", reportedCustomerStore.data)
    .single();
  if (reportedReadError) throw new Error(`read reported customer_store: ${reportedReadError.message}`);

  if (!reportedRow.reported_at) {
    const report = await rpc(customer, "report_conversation", {
      p_conversation_id: reportedCustomerStore.data,
      p_reported_user_id: test.MARKTX_TEST_STORE_OWNER_B_USER_ID,
      p_reason: "spam",
      p_details: "Dedicated runtime authorization check.",
    });
    if (report.error) throw new Error(`report customer_store: ${report.error.message}`);
  }

  const unreportedListing = await createUnreportedListing(service, test);
  const unreportedCustomerStore = await rpc(customer, "get_or_create_customer_store_conversation", {
    p_store_id: test.MARKTX_TEST_STORE_ID,
    p_listing_id: unreportedListing.id,
    p_subject: "Runtime unreported customer-store check",
  });
  if (unreportedCustomerStore.error) {
    throw new Error(`unreported customer_store create: ${unreportedCustomerStore.error.message}`);
  }

  return {
    customerSupportId: customerSupport.data,
    storeSupportId: storeSupport.data,
    reportedCustomerStoreId: reportedCustomerStore.data,
    unreportedCustomerStoreId: unreportedCustomerStore.data,
    unreportedListingId: unreportedListing.id,
  };
}

function containsUnsafeQueueKeys(rows) {
  const unsafeNames = new Set([
    "body",
    "message_body",
    "message_bodies",
    "message_history",
    "messages",
    "last_message",
    "email",
    "customer_email",
    "store_member_email",
    "phone",
    "customer_phone",
    "store_member_phone",
    "password",
    "token",
    "credentials",
    "secret",
  ]);
  return (rows ?? []).flatMap((row) => Object.keys(row).filter((key) => unsafeNames.has(key.toLowerCase())));
}

async function attemptRoleChange(client, userId, role) {
  return client.from("profiles").update({ role }).eq("id", userId).select("id, role").maybeSingle();
}

async function readRole(service, userId) {
  const { data, error } = await service.from("profiles").select("role").eq("id", userId).single();
  if (error) throw new Error(`read role ${userId}: ${error.message}`);
  return data.role;
}

async function main() {
  const current = await loadEnv(CURRENT_ENV);
  const test = await loadEnv(TEST_ENV);
  const service = serviceClient(current);
  const runtimeEnv = { ...current, ...test };
  const checks = [];

  const preCounts = {
    conversations: await countRows(service, "conversations"),
    messages: await countRows(service, "messages"),
    reports: await countRows(service, "reports"),
    conversation_access_audit: await countRows(service, "conversation_access_audit"),
    profiles_by_role: await profileRoleCounts(service),
  };

  await ensureDedicatedRoles(service, test);
  const supportAgent = await ensureSupportAgent(service, test);

  const sessions = {
    customer: await signIn(runtimeEnv, "ordinary user", test.MARKTX_TEST_CUSTOMER_A_EMAIL, test.MARKTX_TEST_CUSTOMER_A_PASSWORD),
    storeOwner: await signIn(runtimeEnv, "store owner", test.MARKTX_TEST_STORE_OWNER_B_EMAIL, test.MARKTX_TEST_STORE_OWNER_B_PASSWORD),
    admin: await signIn(runtimeEnv, "admin", test.MARKTX_TEST_ADMIN_C_EMAIL, test.MARKTX_TEST_ADMIN_C_PASSWORD),
    supportAgent: await signIn(runtimeEnv, "support_agent", supportAgent.email, supportAgent.password),
  };
  const anonymous = { label: "anonymous", client: anonClient(runtimeEnv) };

  const fixtures = await ensureMessagingFixtures(service, sessions, test);

  const supportQueueArgs = { p_limit: 25, p_offset: 0 };
  const roles = {
    anonymous,
    ordinary: sessions.customer,
    storeOwner: sessions.storeOwner,
    admin: sessions.admin,
    supportAgent: sessions.supportAgent,
  };

  const queueResults = {};
  for (const [label, session] of Object.entries(roles)) {
    queueResults[label] = {
      support: await rpc(session.client, "list_admin_support_conversations", supportQueueArgs),
      customerStore: await rpc(session.client, "list_reported_customer_store_conversations", supportQueueArgs),
    };
  }

  assertCheck(checks, "ordinary_user_support_queue_denied", denied(queueResults.ordinary.support));
  assertCheck(checks, "ordinary_user_customer_store_queue_denied", denied(queueResults.ordinary.customerStore));
  assertCheck(checks, "store_owner_support_queue_denied", denied(queueResults.storeOwner.support));
  assertCheck(checks, "store_owner_customer_store_queue_denied", denied(queueResults.storeOwner.customerStore));
  assertCheck(checks, "anonymous_support_queue_denied", denied(queueResults.anonymous.support));
  assertCheck(checks, "anonymous_customer_store_queue_denied", denied(queueResults.anonymous.customerStore));
  assertCheck(checks, "admin_support_queue_allowed", allowed(queueResults.admin.support));
  assertCheck(checks, "admin_customer_store_queue_allowed", allowed(queueResults.admin.customerStore));
  assertCheck(checks, "support_agent_support_queue_allowed", allowed(queueResults.supportAgent.support));
  assertCheck(checks, "support_agent_customer_store_queue_allowed", allowed(queueResults.supportAgent.customerStore));

  const supportRows = queueResults.supportAgent.support.data ?? [];
  const customerStoreRows = queueResults.supportAgent.customerStore.data ?? [];
  assertCheck(
    checks,
    "support_agent_support_queue_contains_customer_and_store_support",
    supportRows.some((row) => row.id === fixtures.customerSupportId && row.conversation_type === "customer_support") &&
      supportRows.some((row) => row.id === fixtures.storeSupportId && row.conversation_type === "store_support"),
  );
  assertCheck(
    checks,
    "support_agent_customer_store_queue_contains_reported_summary",
    customerStoreRows.some((row) => row.id === fixtures.reportedCustomerStoreId),
  );

  const unsafeKeys = [...containsUnsafeQueueKeys(supportRows), ...containsUnsafeQueueKeys(customerStoreRows)];
  assertCheck(checks, "support_queues_metadata_only", unsafeKeys.length === 0, unsafeKeys);

  const auditBeforeReported = await countRows(service, "conversation_access_audit", (query) =>
    query.eq("conversation_id", fixtures.reportedCustomerStoreId),
  );
  const reportedDetail = await rpc(sessions.supportAgent.client, "get_audited_customer_store_conversation", {
    p_conversation_id: fixtures.reportedCustomerStoreId,
    p_access_reason: "reported",
    p_metadata: { source: "support_agent_runtime_check" },
  });
  const auditAfterReported = await countRows(service, "conversation_access_audit", (query) =>
    query.eq("conversation_id", fixtures.reportedCustomerStoreId),
  );
  assertCheck(checks, "reported_customer_store_audited_detail_allowed", allowed(reportedDetail));
  assertCheck(checks, "reported_customer_store_audit_row_created", auditAfterReported > auditBeforeReported);

  const auditBeforeStoreSupport = await countRows(service, "conversation_access_audit", (query) =>
    query.eq("conversation_id", fixtures.storeSupportId),
  );
  const storeSupportDetail = await rpc(sessions.supportAgent.client, "get_audited_store_support_conversation", {
    p_conversation_id: fixtures.storeSupportId,
    p_access_reason: "support_assignment",
    p_metadata: { source: "support_agent_runtime_check" },
  });
  const auditAfterStoreSupport = await countRows(service, "conversation_access_audit", (query) =>
    query.eq("conversation_id", fixtures.storeSupportId),
  );
  assertCheck(checks, "store_support_audited_detail_allowed", allowed(storeSupportDetail));
  assertCheck(checks, "store_support_audit_row_created", auditAfterStoreSupport > auditBeforeStoreSupport);

  const unreportedDetail = await rpc(sessions.supportAgent.client, "get_audited_customer_store_conversation", {
    p_conversation_id: fixtures.unreportedCustomerStoreId,
    p_access_reason: "reported",
    p_metadata: { source: "support_agent_runtime_check" },
  });
  assertCheck(checks, "unreported_customer_store_audited_detail_denied", denied(unreportedDetail), unreportedDetail.error?.message);

  const supportAdminCreateStore = await rpc(sessions.supportAgent.client, "admin_create_store", {
    p_name: "Runtime forbidden support-agent store create",
    p_category: "Test",
    p_category_id: null,
    p_city: "Bakı",
    p_contact_phone: null,
    p_whatsapp_phone: null,
    p_address: null,
    p_description: null,
    p_map_url: null,
  });
  const supportClaimCode = await rpc(sessions.supportAgent.client, "admin_generate_store_claim_code", {
    p_store_id: test.MARKTX_TEST_STORE_ID,
    p_valid_days: 1,
  });
  assertCheck(checks, "support_agent_admin_create_store_denied", denied(supportAdminCreateStore));
  assertCheck(checks, "support_agent_admin_claim_code_denied", denied(supportClaimCode));

  const ordinaryRoleBefore = await readRole(service, sessions.customer.userId);
  const supportRoleBefore = await readRole(service, sessions.supportAgent.userId);
  await attemptRoleChange(sessions.customer.client, sessions.customer.userId, "support_agent");
  await attemptRoleChange(sessions.supportAgent.client, sessions.supportAgent.userId, "admin");
  const ordinaryRoleAfter = await readRole(service, sessions.customer.userId);
  const supportRoleAfter = await readRole(service, sessions.supportAgent.userId);
  assertCheck(checks, "ordinary_user_cannot_assign_support_agent", ordinaryRoleAfter === ordinaryRoleBefore && ordinaryRoleAfter === "user");
  assertCheck(checks, "support_agent_cannot_assign_admin", supportRoleAfter === supportRoleBefore && supportRoleAfter === "support_agent");

  const postCounts = {
    conversations: await countRows(service, "conversations"),
    messages: await countRows(service, "messages"),
    reports: await countRows(service, "reports"),
    conversation_access_audit: await countRows(service, "conversation_access_audit"),
    profiles_by_role: await profileRoleCounts(service),
  };

  const failed = checks.filter((check) => !check.passed);
  const result = {
    project_ref: "vrtnxdexofpiapbodxkx",
    verification_sql_shape:
      "single SELECT over a WITH checks CTE; earlier CLI output with one row came from the previous multi-SELECT file, not DO assertion blocks",
    support_agent_test_identity: {
      email: supportAgent.email,
      user_id: supportAgent.userId,
    },
    fixtures: {
      customer_support_conversation_id: fixtures.customerSupportId,
      store_support_conversation_id: fixtures.storeSupportId,
      reported_customer_store_conversation_id: fixtures.reportedCustomerStoreId,
      unreported_customer_store_conversation_id: fixtures.unreportedCustomerStoreId,
    },
    counts: { pre: preCounts, post: postCounts },
    checks,
    final_status: failed.length === 0 ? "PASS" : "FAIL",
  };

  console.log(JSON.stringify(result, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
