import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const CURRENT_ENV = path.join(ROOT, ".env.local");
const OUT_DIR = path.join(ROOT, "exports", "messaging-runtime-test");
const MOBILE_ROOT = "F:/projects/mobile_apps/marktx-app";
const EXPECTED_PROJECT_REF = "vrtnxdexofpiapbodxkx";

function randomPassword() {
  return `${crypto.randomBytes(18).toString("base64url")}aA1!`;
}

function randomPhone(index) {
  const suffix = `${Date.now()}${index}`.slice(-7);
  return `+99451${suffix}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
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

function projectRefFromUrl(url) {
  return new URL(url).host.split(".")[0];
}

function createServiceClient(env) {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or service-role key in .env.local.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function createAnonClient(env) {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or anon key.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function clientWithToken(env, accessToken) {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function createAuthUser(service, runId, label, index, role = "user") {
  const password = randomPassword();
  const email = `marktx-phase-5-1-c-${label}-${runId}@example.test`;
  const phone = randomPhone(index);
  const displayName = `MarktX Phase 5.1-C ${label} ${runId}`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      display_name: displayName,
      marktx_phase_5_1_c: true,
      run_id: runId,
    },
  });
  if (error || !data.user) throw new Error(`create auth user ${label}: ${error?.message ?? "no user"}`);

  const profile = await service.from("profiles").upsert(
    {
      id: data.user.id,
      email,
      phone,
      display_name: displayName,
      role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profile.error) throw new Error(`upsert profile ${label}: ${profile.error.message}`);

  return { id: data.user.id, email, phone, password, displayName, role };
}

async function signIn(env, account) {
  const anon = createAnonClient(env);
  const { data, error } = await anon.auth.signInWithPassword({ email: account.email, password: account.password });
  if (error || !data.session) throw new Error(`sign in ${account.email}: ${error?.message ?? "no session"}`);
  return {
    userId: data.user.id,
    client: clientWithToken(env, data.session.access_token),
  };
}

async function nextListingNumber(service) {
  const { data, error } = await service
    .from("listings")
    .select("listing_number")
    .order("listing_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`read listing_number: ${error.message}`);
  return Number(data?.listing_number ?? 1000) + 1;
}

async function createStore(service, runId, suffix, ownerId, createdBy, phone) {
  const slug = slugify(`phase-5-1-c-store-${suffix}-${runId}`);
  const { data, error } = await service
    .from("stores")
    .insert({
      name: `Phase 5.1-C Store ${suffix} ${runId}`,
      slug,
      description: "Dedicated temporary store for MarktX Phase 5.1-C admin privacy runtime tests.",
      category: "Test",
      contact_phone: phone,
      whatsapp_phone: phone,
      city: "Baki",
      owner_id: ownerId,
      created_by: createdBy,
      status: "claimed",
    })
    .select("id, slug, owner_id")
    .single();
  if (error) throw new Error(`create store ${suffix}: ${error.message}`);
  return data;
}

async function createMembership(service, storeId, userId, role = "owner") {
  const { data, error } = await service
    .from("store_members")
    .insert({ store_id: storeId, user_id: userId, role })
    .select("id")
    .single();
  if (error) throw new Error(`create membership ${role}: ${error.message}`);
  return data;
}

async function createListing(service, runId, suffix, storeId, userId, reviewedBy, phone) {
  const listingNumber = await nextListingNumber(service);
  const slug = slugify(`phase-5-1-c-listing-${suffix}-${runId}`);
  const { data, error } = await service
    .from("listings")
    .insert({
      user_id: userId,
      title: `Phase 5.1-C Listing ${suffix} ${runId}`,
      price: 1,
      category: "Test",
      city: "Baki",
      condition: "Yeni",
      description: "Dedicated temporary active listing for MarktX Phase 5.1-C admin privacy runtime tests.",
      status: "active",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      listing_number: listingNumber,
      slug,
      is_sample: false,
      source: "phase_5_1_c_admin_privacy_test",
      attributes: { marktx_phase_5_1_c: true, run_id: runId },
      listing_type: "sell",
      price_type: "fixed",
      delivery_type: "pickup",
      condition_code: "new",
      store_id: storeId,
      contact_phone: phone,
      form_schema_version: 1,
      photo_schema_version: 1,
    })
    .select("id, slug, store_id")
    .single();
  if (error) throw new Error(`create listing ${suffix}: ${error.message}`);
  return data;
}

async function rpc(client, fn, args = {}) {
  return client.rpc(fn, args);
}

async function createCustomerStoreConversation(session, storeId, listingId, subject) {
  const result = await rpc(session.client, "get_or_create_customer_store_conversation", {
    p_store_id: storeId,
    p_listing_id: listingId,
    p_subject: subject,
  });
  if (result.error || !result.data) throw new Error(`create customer_store conversation: ${result.error?.message ?? "no id"}`);
  return String(result.data);
}

async function sendConversationMessage(session, conversationId, body) {
  return rpc(session.client, "send_conversation_message", {
    p_conversation_id: conversationId,
    p_body: body,
    p_sender_context: null,
  });
}

async function closeConversation(session, conversationId) {
  return rpc(session.client, "close_conversation", { p_conversation_id: conversationId });
}

async function listReportedQueue(session) {
  return rpc(session.client, "list_reported_customer_store_conversations", { p_limit: 100, p_offset: 0 });
}

async function listSupportQueue(session) {
  return rpc(session.client, "list_admin_support_conversations", { p_limit: 100, p_offset: 0 });
}

async function auditedCustomerStore(session, conversationId, reason = "reported") {
  return rpc(session.client, "get_audited_customer_store_conversation", {
    p_conversation_id: conversationId,
    p_access_reason: reason,
    p_metadata: { source: "phase_5_1_c_runtime_check" },
  });
}

async function auditedStoreSupport(session, conversationId, reason = "support_assignment") {
  return rpc(session.client, "get_audited_store_support_conversation", {
    p_conversation_id: conversationId,
    p_access_reason: reason,
    p_metadata: { source: "phase_5_1_c_runtime_check" },
  });
}

async function readConversation(client, conversationId) {
  return client
    .from("conversations")
    .select("id, conversation_type, customer_user_id, store_id, listing_id, status, closed_at")
    .eq("id", conversationId)
    .maybeSingle();
}

async function readMessages(client, conversationId) {
  return client
    .from("messages")
    .select("id, conversation_id, sender_id, sender_context, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
}

async function directConversationInsert(session, payload) {
  return session.client.from("conversations").insert(payload).select("id").maybeSingle();
}

async function directMessageInsert(session, payload) {
  return session.client.from("messages").insert(payload).select("id").maybeSingle();
}

async function countAudit(service, conversationId, actorId = null) {
  let query = service.from("conversation_access_audit").select("id", { count: "exact", head: true }).eq("conversation_id", conversationId);
  if (actorId) query = query.eq("actor_id", actorId);
  const { count, error } = await query;
  if (error) throw new Error(`count audit ${conversationId}: ${error.message}`);
  return count ?? 0;
}

async function latestAudit(service, conversationId, actorId) {
  const { data, error } = await service
    .from("conversation_access_audit")
    .select("id, conversation_id, actor_id, access_reason, metadata, created_at")
    .eq("conversation_id", conversationId)
    .eq("actor_id", actorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`latest audit ${conversationId}: ${error.message}`);
  return data;
}

function allowed(result) {
  return !result.error && result.data !== null;
}

function deniedError(result) {
  return Boolean(result.error);
}

function deniedRead(result) {
  return !result.error && result.data === null;
}

function rows(result) {
  return Array.isArray(result.data) ? result.data : [];
}

function summarizeError(result) {
  return result.error ? { code: result.error.code ?? null, message: result.error.message } : null;
}

function containsUnsafeQueueKeys(queueRows) {
  const unsafeNames = new Set([
    "body",
    "message_body",
    "message_bodies",
    "messages",
    "message_history",
    "attachments",
    "attachment_urls",
    "image_urls",
    "phone",
    "customer_phone",
    "store_member_phone",
    "email",
    "customer_email",
    "store_member_email",
    "password",
    "token",
    "secret",
    "credentials",
  ]);
  return queueRows.flatMap((row) => Object.keys(row).filter((key) => unsafeNames.has(key.toLowerCase())));
}

function assertCheck(checks, name, passed, details = undefined) {
  checks.push({ name, passed: Boolean(passed), details });
}

async function attemptRoleChange(client, userId, role) {
  return client.from("profiles").update({ role }).eq("id", userId).select("id, role").maybeSingle();
}

async function readRole(service, userId) {
  const { data, error } = await service.from("profiles").select("role").eq("id", userId).single();
  if (error) throw new Error(`read role ${userId}: ${error.message}`);
  return data.role;
}

async function staticClientChecks() {
  const webChat = await readFile(path.join(ROOT, "src/components/messaging/ChatPanel.tsx"), "utf8");
  const webMessaging = await readFile(path.join(ROOT, "src/lib/messaging/index.ts"), "utf8");
  const mobileChat = await readFile(path.join(MOBILE_ROOT, "app/chat/[id].tsx"), "utf8");
  const mobileMessaging = await readFile(path.join(MOBILE_ROOT, "lib/messaging/index.ts"), "utf8");

  return {
    web: {
      legacyReadOnlyMessage: /conversation\.conversation_type === "legacy_user_user"[\s\S]*Bu k/.test(webChat),
      closedReadOnlyMessage: /conversation\.status === "closed" \|\| conversation\.status === "resolved"/.test(webChat),
      composerGuardedByCanSend: /\{conversation\.can_send \? \(/.test(webChat),
      sendGuardedByCanSend: /!conversation\?\.can_send/.test(webChat),
      noLegacyCreateFallback: !/from\("conversations"\)[\s\S]{0,200}\.insert/.test(webMessaging),
      canonicalCustomerStoreNotLegacy: /const legacy = row\.conversation_type === "legacy_user_user"/.test(webMessaging),
    },
    mobile: {
      legacyReadOnlyMessage: /conversation\.conversation_type === 'legacy_user_user'[\s\S]*Bu k/.test(mobileChat),
      closedReadOnlyMessage: /conversation\.status === 'closed' \|\| conversation\.status === 'resolved'/.test(mobileChat),
      composerGuardedByCanSend: /\{conversation\.can_send \? \(/.test(mobileChat),
      sendGuardedByCanSend: /!conversation\?\.can_send/.test(mobileChat),
      noLegacyCreateFallback: /Yeni şəxsi yazışma yaradılmır/.test(mobileMessaging) && !/from\('conversations'\)[\s\S]{0,200}\.insert/.test(mobileMessaging),
      canonicalFallbackOnlyForAbsentType: /row\.conversation_type \?\? 'legacy_user_user'/.test(mobileMessaging),
    },
  };
}

function cleanupSql(ids) {
  const userIds = ids.userIds.map((id) => `'${id}'::uuid`).join(", ");
  const storeIds = ids.storeIds.map((id) => `'${id}'::uuid`).join(", ");
  const listingIds = ids.listingIds.map((id) => `'${id}'::uuid`).join(", ");
  return `-- MarktX Phase 5.1-C admin privacy runtime cleanup.
-- Review before running. This targets only dedicated test rows from run ${ids.runId}.
begin;

delete from public.conversation_reads
where conversation_id in (
  select id from public.conversations
  where store_id in (${storeIds})
     or customer_user_id in (${userIds})
     or buyer_id in (${userIds})
);

delete from public.messages
where conversation_id in (
  select id from public.conversations
  where store_id in (${storeIds})
     or customer_user_id in (${userIds})
     or buyer_id in (${userIds})
);

delete from public.conversation_access_audit
where conversation_id in (
  select id from public.conversations
  where store_id in (${storeIds})
     or customer_user_id in (${userIds})
     or buyer_id in (${userIds})
);

delete from public.reports
where conversation_id in (
  select id from public.conversations
  where store_id in (${storeIds})
     or customer_user_id in (${userIds})
     or buyer_id in (${userIds})
);

delete from public.conversations
where store_id in (${storeIds})
   or customer_user_id in (${userIds})
   or buyer_id in (${userIds});

delete from public.listings
where id in (${listingIds})
  and source = 'phase_5_1_c_admin_privacy_test';

delete from public.store_members
where store_id in (${storeIds})
  and user_id in (${userIds});

delete from public.stores
where id in (${storeIds})
  and slug like 'phase-5-1-c-store-%';

delete from public.profiles
where id in (${userIds})
  and email like 'marktx-phase-5-1-c-%@example.test';

delete from auth.users
where id in (${userIds})
  and email like 'marktx-phase-5-1-c-%@example.test';

commit;
`;
}

async function main() {
  if (!existsSync(CURRENT_ENV)) throw new Error(".env.local is missing.");
  const env = await loadEnv(CURRENT_ENV);
  const publicUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const projectRef = projectRefFromUrl(publicUrl);
  if (projectRef !== EXPECTED_PROJECT_REF) throw new Error(`Supabase project ref mismatch: ${projectRef}`);

  const service = createServiceClient(env);
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const checks = [];

  const customerA = await createAuthUser(service, runId, "customer-a", 1);
  const unrelatedUser = await createAuthUser(service, runId, "ordinary-x", 2);
  const storeMemberB = await createAuthUser(service, runId, "store-member-b", 3);
  const storeMemberC = await createAuthUser(service, runId, "store-member-c", 4);
  const admin = await createAuthUser(service, runId, "admin", 5, "admin");
  const supportAgent = await createAuthUser(service, runId, "support-agent", 6, "support_agent");
  const moderator = await createAuthUser(service, runId, "moderator", 7, "moderator");

  const storeB = await createStore(service, runId, "b", storeMemberB.id, admin.id, storeMemberB.phone);
  const storeC = await createStore(service, runId, "c", storeMemberC.id, admin.id, storeMemberC.phone);
  const membershipB = await createMembership(service, storeB.id, storeMemberB.id, "owner");
  const membershipC = await createMembership(service, storeC.id, storeMemberC.id, "owner");
  const listingUnreported = await createListing(service, runId, "unreported", storeB.id, storeMemberB.id, admin.id, storeMemberB.phone);
  const listingReported = await createListing(service, runId, "reported", storeB.id, storeMemberB.id, admin.id, storeMemberB.phone);
  const listingClosedStore = await createListing(service, runId, "closed-store", storeB.id, storeMemberB.id, admin.id, storeMemberB.phone);
  const listingLegacy = await createListing(service, runId, "legacy", storeB.id, storeMemberB.id, admin.id, storeMemberB.phone);

  const sessions = {
    customerA: await signIn(env, customerA),
    unrelatedUser: await signIn(env, unrelatedUser),
    storeMemberB: await signIn(env, storeMemberB),
    storeMemberC: await signIn(env, storeMemberC),
    admin: await signIn(env, admin),
    supportAgent: await signIn(env, supportAgent),
    moderator: await signIn(env, moderator),
  };

  const unreportedCustomerStoreId = await createCustomerStoreConversation(
    sessions.customerA,
    storeB.id,
    listingUnreported.id,
    `Phase 5.1-C unreported customer_store ${runId}`,
  );
  await sendConversationMessage(sessions.customerA, unreportedCustomerStoreId, `Unreported private body ${runId}`);

  const reportedCustomerStoreId = await createCustomerStoreConversation(
    sessions.customerA,
    storeB.id,
    listingReported.id,
    `Phase 5.1-C reported customer_store ${runId}`,
  );
  await sendConversationMessage(sessions.customerA, reportedCustomerStoreId, `Reported private body ${runId}`);
  const report = await rpc(sessions.customerA.client, "report_conversation", {
    p_conversation_id: reportedCustomerStoreId,
    p_reported_user_id: storeMemberB.id,
    p_reason: "spam",
    p_details: "Dedicated Phase 5.1-C runtime report.",
  });
  if (report.error) throw new Error(`report customer_store: ${report.error.message}`);

  const closedCustomerStoreId = await createCustomerStoreConversation(
    sessions.customerA,
    storeB.id,
    listingClosedStore.id,
    `Phase 5.1-C closed customer_store ${runId}`,
  );
  await sendConversationMessage(sessions.customerA, closedCustomerStoreId, `Closed customer_store history ${runId}`);

  const customerSupport = await rpc(sessions.customerA.client, "get_or_create_customer_support_conversation", {
    p_support_topic: "technical_problem",
    p_subject: `Phase 5.1-C customer_support ${runId}`,
  });
  if (customerSupport.error || !customerSupport.data) throw new Error(`customer_support create: ${customerSupport.error?.message ?? "no id"}`);
  const customerSupportId = String(customerSupport.data);
  await sendConversationMessage(sessions.customerA, customerSupportId, `Customer support history ${runId}`);

  const storeSupport = await rpc(sessions.storeMemberB.client, "get_or_create_store_support_conversation", {
    p_store_id: storeB.id,
    p_support_topic: "technical_problem",
    p_subject: `Phase 5.1-C store_support ${runId}`,
  });
  if (storeSupport.error || !storeSupport.data) throw new Error(`store_support create: ${storeSupport.error?.message ?? "no id"}`);
  const storeSupportId = String(storeSupport.data);
  await sendConversationMessage(sessions.storeMemberB, storeSupportId, `Store support history ${runId}`);

  const queueCustomerSupport = await rpc(sessions.customerA.client, "get_or_create_customer_support_conversation", {
    p_support_topic: "other",
    p_subject: `Phase 5.1-C queue customer_support ${runId}`,
  });
  if (queueCustomerSupport.error || !queueCustomerSupport.data) {
    throw new Error(`queue customer_support create: ${queueCustomerSupport.error?.message ?? "no id"}`);
  }
  const queueCustomerSupportId = String(queueCustomerSupport.data);
  await sendConversationMessage(sessions.customerA, queueCustomerSupportId, `Queue customer_support body ${runId}`);

  const queueStoreSupport = await rpc(sessions.storeMemberB.client, "get_or_create_store_support_conversation", {
    p_store_id: storeB.id,
    p_support_topic: "other",
    p_subject: `Phase 5.1-C queue store_support ${runId}`,
  });
  if (queueStoreSupport.error || !queueStoreSupport.data) {
    throw new Error(`queue store_support create: ${queueStoreSupport.error?.message ?? "no id"}`);
  }
  const queueStoreSupportId = String(queueStoreSupport.data);
  await sendConversationMessage(sessions.storeMemberB, queueStoreSupportId, `Queue store_support body ${runId}`);

  const closeCustomerStore = await closeConversation(sessions.customerA, closedCustomerStoreId);
  const closeCustomerSupport = await closeConversation(sessions.customerA, customerSupportId);
  const closeStoreSupport = await closeConversation(sessions.storeMemberB, storeSupportId);

  const legacyConversation = await directConversationInsert(sessions.customerA, {
    listing_id: listingLegacy.id,
    buyer_id: customerA.id,
    seller_id: storeMemberB.id,
  });
  if (legacyConversation.error || !legacyConversation.data?.id) throw new Error(`legacy direct insert: ${legacyConversation.error?.message ?? "no id"}`);
  const legacyConversationId = legacyConversation.data.id;
  const legacyMessage = await directMessageInsert(sessions.customerA, {
    conversation_id: legacyConversationId,
    sender_id: customerA.id,
    body: `Legacy history ${runId}`,
  });
  if (legacyMessage.error) throw new Error(`legacy direct message: ${legacyMessage.error.message}`);

  const adminReportedQueue = await listReportedQueue(sessions.admin);
  const supportReportedQueue = await listReportedQueue(sessions.supportAgent);
  const moderatorReportedQueue = await listReportedQueue(sessions.moderator);
  const ordinaryReportedQueue = await listReportedQueue(sessions.unrelatedUser);
  const storeReportedQueue = await listReportedQueue(sessions.storeMemberB);
  const adminSupportQueue = await listSupportQueue(sessions.admin);
  const supportSupportQueue = await listSupportQueue(sessions.supportAgent);

  const adminReportedRows = rows(adminReportedQueue);
  const supportReportedRows = rows(supportReportedQueue);
  const allQueueRows = [...adminReportedRows, ...supportReportedRows, ...rows(adminSupportQueue), ...rows(supportSupportQueue)];
  const unsafeKeys = containsUnsafeQueueKeys(allQueueRows);

  assertCheck(checks, "unreported_customer_store_absent_from_admin_queue", !adminReportedRows.some((row) => row.id === unreportedCustomerStoreId));
  assertCheck(checks, "reported_customer_store_present_in_admin_queue", adminReportedRows.some((row) => row.id === reportedCustomerStoreId));
  assertCheck(checks, "reported_customer_store_present_in_support_agent_queue", supportReportedRows.some((row) => row.id === reportedCustomerStoreId));
  assertCheck(checks, "moderator_reported_queue_compatibility", !moderatorReportedQueue.error && rows(moderatorReportedQueue).some((row) => row.id === reportedCustomerStoreId), summarizeError(moderatorReportedQueue));
  assertCheck(checks, "ordinary_user_cannot_use_reported_queue", deniedError(ordinaryReportedQueue), summarizeError(ordinaryReportedQueue));
  assertCheck(checks, "store_member_cannot_use_reported_queue", deniedError(storeReportedQueue), summarizeError(storeReportedQueue));
  assertCheck(checks, "queue_payloads_metadata_only", unsafeKeys.length === 0, unsafeKeys);
  assertCheck(
    checks,
    "support_queue_contains_customer_and_store_support_metadata",
    rows(adminSupportQueue).some((row) => row.id === queueCustomerSupportId) &&
      rows(adminSupportQueue).some((row) => row.id === queueStoreSupportId),
    adminSupportQueue.error
      ? summarizeError(adminSupportQueue)
      : {
          returned: rows(adminSupportQueue).length,
          contains_customer_support: rows(adminSupportQueue).some((row) => row.id === queueCustomerSupportId),
          contains_store_support: rows(adminSupportQueue).some((row) => row.id === queueStoreSupportId),
          newest_ids: rows(adminSupportQueue)
            .slice(0, 5)
            .map((row) => ({ id: row.id, conversation_type: row.conversation_type, status: row.status })),
        },
  );

  const adminStoreSupportAuditBefore = await countAudit(service, queueStoreSupportId, admin.id);
  const adminStoreSupportDetail = await auditedStoreSupport(sessions.admin, queueStoreSupportId, "support_assignment");
  const adminStoreSupportAuditAfter = await countAudit(service, queueStoreSupportId, admin.id);
  const adminStoreSupportAudit = await latestAudit(service, queueStoreSupportId, admin.id);
  const supportStoreSupportAuditBefore = await countAudit(service, queueStoreSupportId, supportAgent.id);
  const supportStoreSupportDetail = await auditedStoreSupport(sessions.supportAgent, queueStoreSupportId, "support_assignment");
  const supportStoreSupportAuditAfter = await countAudit(service, queueStoreSupportId, supportAgent.id);
  const supportStoreSupportAudit = await latestAudit(service, queueStoreSupportId, supportAgent.id);
  const ordinaryStoreSupportDetail = await auditedStoreSupport(sessions.unrelatedUser, queueStoreSupportId, "support_assignment");

  assertCheck(checks, "admin_audited_store_support_detail_allowed", allowed(adminStoreSupportDetail), summarizeError(adminStoreSupportDetail));
  assertCheck(checks, "admin_audited_store_support_creates_audit_row", adminStoreSupportAuditAfter > adminStoreSupportAuditBefore);
  assertCheck(
    checks,
    "admin_store_support_audit_row_shape",
    Boolean(
      adminStoreSupportAudit?.actor_id === admin.id &&
        adminStoreSupportAudit.conversation_id === queueStoreSupportId &&
        adminStoreSupportAudit.access_reason === "support_assignment" &&
        adminStoreSupportAudit.created_at &&
        adminStoreSupportAudit.metadata?.source === "phase_5_1_c_runtime_check",
    ),
    adminStoreSupportAudit,
  );
  assertCheck(checks, "support_agent_audited_store_support_detail_allowed", allowed(supportStoreSupportDetail), summarizeError(supportStoreSupportDetail));
  assertCheck(checks, "support_agent_audited_store_support_creates_audit_row", supportStoreSupportAuditAfter > supportStoreSupportAuditBefore);
  assertCheck(
    checks,
    "support_agent_store_support_audit_row_shape",
    Boolean(
      supportStoreSupportAudit?.actor_id === supportAgent.id &&
        supportStoreSupportAudit.conversation_id === queueStoreSupportId &&
        supportStoreSupportAudit.access_reason === "support_assignment" &&
        supportStoreSupportAudit.created_at &&
        supportStoreSupportAudit.metadata?.source === "phase_5_1_c_runtime_check",
    ),
    supportStoreSupportAudit,
  );
  assertCheck(checks, "ordinary_user_store_support_audited_detail_denied", deniedError(ordinaryStoreSupportDetail), summarizeError(ordinaryStoreSupportDetail));

  const adminUnreportedDetailBefore = await countAudit(service, unreportedCustomerStoreId, admin.id);
  const adminUnreportedDetail = await auditedCustomerStore(sessions.admin, unreportedCustomerStoreId, "reported");
  const adminUnreportedDetailAfter = await countAudit(service, unreportedCustomerStoreId, admin.id);
  const supportUnreportedDetail = await auditedCustomerStore(sessions.supportAgent, unreportedCustomerStoreId, "reported");

  assertCheck(checks, "admin_cannot_open_unreported_customer_store_detail", deniedError(adminUnreportedDetail), summarizeError(adminUnreportedDetail));
  assertCheck(checks, "support_agent_cannot_open_unreported_customer_store_detail", deniedError(supportUnreportedDetail), summarizeError(supportUnreportedDetail));
  assertCheck(checks, "failed_unreported_detail_creates_no_audit_row", adminUnreportedDetailAfter === adminUnreportedDetailBefore);

  const adminAuditBefore = await countAudit(service, reportedCustomerStoreId, admin.id);
  const adminReportedDetail = await auditedCustomerStore(sessions.admin, reportedCustomerStoreId, "reported");
  const adminAuditAfter = await countAudit(service, reportedCustomerStoreId, admin.id);
  const adminAudit = await latestAudit(service, reportedCustomerStoreId, admin.id);
  const supportAuditBefore = await countAudit(service, reportedCustomerStoreId, supportAgent.id);
  const supportReportedDetail = await auditedCustomerStore(sessions.supportAgent, reportedCustomerStoreId, "reported");
  const supportAuditAfter = await countAudit(service, reportedCustomerStoreId, supportAgent.id);
  const supportAudit = await latestAudit(service, reportedCustomerStoreId, supportAgent.id);
  const ordinaryReportedDetail = await auditedCustomerStore(sessions.unrelatedUser, reportedCustomerStoreId, "reported");
  const storeReportedDetail = await auditedCustomerStore(sessions.storeMemberB, reportedCustomerStoreId, "reported");
  const failedAuditCountAfter = await countAudit(service, reportedCustomerStoreId, unrelatedUser.id);

  assertCheck(checks, "admin_audited_reported_detail_allowed", allowed(adminReportedDetail), summarizeError(adminReportedDetail));
  assertCheck(checks, "admin_audited_detail_creates_audit_row", adminAuditAfter > adminAuditBefore);
  assertCheck(
    checks,
    "admin_audit_row_shape",
    Boolean(adminAudit?.actor_id === admin.id && adminAudit.conversation_id === reportedCustomerStoreId && adminAudit.access_reason === "reported" && adminAudit.created_at && adminAudit.metadata?.source === "phase_5_1_c_runtime_check"),
    adminAudit,
  );
  assertCheck(checks, "support_agent_audited_reported_detail_allowed", allowed(supportReportedDetail), summarizeError(supportReportedDetail));
  assertCheck(checks, "support_agent_audited_detail_creates_audit_row", supportAuditAfter > supportAuditBefore);
  assertCheck(
    checks,
    "support_agent_audit_row_shape",
    Boolean(supportAudit?.actor_id === supportAgent.id && supportAudit.conversation_id === reportedCustomerStoreId && supportAudit.access_reason === "reported" && supportAudit.created_at && supportAudit.metadata?.source === "phase_5_1_c_runtime_check"),
    supportAudit,
  );
  assertCheck(checks, "ordinary_user_audited_detail_denied", deniedError(ordinaryReportedDetail), summarizeError(ordinaryReportedDetail));
  assertCheck(checks, "store_member_audited_detail_denied", deniedError(storeReportedDetail), summarizeError(storeReportedDetail));
  assertCheck(checks, "failed_unauthorized_detail_creates_no_success_audit_row", failedAuditCountAfter === 0);

  const supportPanelAccess = await rpc(sessions.supportAgent.client, "marktx_can_access_support_panel");
  const supportAdminCreateStore = await rpc(sessions.supportAgent.client, "admin_create_store", {
    p_name: `Phase 5.1-C forbidden support create ${runId}`,
    p_category: "Test",
    p_category_id: null,
    p_city: "Baki",
    p_contact_phone: null,
    p_whatsapp_phone: null,
    p_address: null,
    p_description: null,
    p_map_url: null,
  });
  const supportClaimCode = await rpc(sessions.supportAgent.client, "admin_generate_store_claim_code", {
    p_store_id: storeB.id,
    p_valid_days: 1,
  });
  const supportRoleBefore = await readRole(service, supportAgent.id);
  const roleChange = await attemptRoleChange(sessions.supportAgent.client, supportAgent.id, "admin");
  const supportRoleAfter = await readRole(service, supportAgent.id);

  assertCheck(checks, "support_agent_can_access_support_panel_rpc", supportPanelAccess.data === true, summarizeError(supportPanelAccess));
  assertCheck(checks, "support_agent_admin_create_store_denied", deniedError(supportAdminCreateStore), summarizeError(supportAdminCreateStore));
  assertCheck(checks, "support_agent_claim_code_denied", deniedError(supportClaimCode), summarizeError(supportClaimCode));
  assertCheck(checks, "support_agent_cannot_change_own_role", supportRoleBefore === "support_agent" && supportRoleAfter === "support_agent" && (deniedError(roleChange) || roleChange.data === null), summarizeError(roleChange));

  const closedCustomerStoreRead = await readConversation(sessions.customerA.client, closedCustomerStoreId);
  const closedCustomerStoreMessages = await readMessages(sessions.customerA.client, closedCustomerStoreId);
  const closedCustomerStoreSend = await sendConversationMessage(sessions.customerA, closedCustomerStoreId, "should fail closed customer_store");
  const closedCustomerStoreUnauthorizedRead = await readConversation(sessions.unrelatedUser.client, closedCustomerStoreId);
  const closedCustomerSupportRead = await readConversation(sessions.customerA.client, customerSupportId);
  const closedCustomerSupportMessages = await readMessages(sessions.customerA.client, customerSupportId);
  const closedCustomerSupportSend = await sendConversationMessage(sessions.customerA, customerSupportId, "should fail closed customer_support");
  const closedCustomerSupportUnauthorizedRead = await readConversation(sessions.unrelatedUser.client, customerSupportId);
  const closedStoreSupportRead = await readConversation(sessions.storeMemberB.client, storeSupportId);
  const closedStoreSupportMessages = await readMessages(sessions.storeMemberB.client, storeSupportId);
  const closedStoreSupportSend = await sendConversationMessage(sessions.storeMemberB, storeSupportId, "should fail closed store_support");
  const closedStoreSupportUnauthorizedRead = await readConversation(sessions.unrelatedUser.client, storeSupportId);

  assertCheck(checks, "close_customer_store_succeeded", allowed(closeCustomerStore), summarizeError(closeCustomerStore));
  assertCheck(checks, "closed_customer_store_readable_history_and_send_rejected", closedCustomerStoreRead.data?.status === "closed" && closedCustomerStoreMessages.data?.length > 0 && deniedError(closedCustomerStoreSend), summarizeError(closedCustomerStoreSend));
  assertCheck(checks, "closed_customer_store_unauthorized_read_denied", deniedRead(closedCustomerStoreUnauthorizedRead), summarizeError(closedCustomerStoreUnauthorizedRead));
  assertCheck(checks, "close_customer_support_succeeded", allowed(closeCustomerSupport), summarizeError(closeCustomerSupport));
  assertCheck(checks, "closed_customer_support_readable_history_and_send_rejected", closedCustomerSupportRead.data?.status === "closed" && closedCustomerSupportMessages.data?.length > 0 && deniedError(closedCustomerSupportSend), summarizeError(closedCustomerSupportSend));
  assertCheck(checks, "closed_customer_support_unauthorized_read_denied", deniedRead(closedCustomerSupportUnauthorizedRead), summarizeError(closedCustomerSupportUnauthorizedRead));
  assertCheck(checks, "close_store_support_succeeded", allowed(closeStoreSupport), summarizeError(closeStoreSupport));
  assertCheck(checks, "closed_store_support_readable_history_and_send_rejected", closedStoreSupportRead.data?.status === "closed" && closedStoreSupportMessages.data?.length > 0 && deniedError(closedStoreSupportSend), summarizeError(closedStoreSupportSend));
  assertCheck(checks, "closed_store_support_unauthorized_read_denied", deniedRead(closedStoreSupportUnauthorizedRead), summarizeError(closedStoreSupportUnauthorizedRead));

  const legacyRead = await readConversation(sessions.customerA.client, legacyConversationId);
  const legacyMessages = await readMessages(sessions.customerA.client, legacyConversationId);
  const legacyRpcSend = await sendConversationMessage(sessions.customerA, legacyConversationId, "should fail current legacy RPC send");
  const currentCustomerStoreRead = await readConversation(sessions.customerA.client, reportedCustomerStoreId);
  const staticChecks = await staticClientChecks();

  assertCheck(checks, "legacy_history_readable_by_participant", legacyRead.data?.conversation_type === "legacy_user_user" && legacyMessages.data?.length > 0);
  assertCheck(checks, "current_client_legacy_rpc_send_rejected", deniedError(legacyRpcSend), summarizeError(legacyRpcSend));
  assertCheck(checks, "customer_store_not_mislabeled_as_legacy", currentCustomerStoreRead.data?.conversation_type === "customer_store");
  assertCheck(checks, "web_legacy_read_only_static", Object.values(staticChecks.web).every(Boolean), staticChecks.web);
  assertCheck(checks, "mobile_legacy_read_only_static", Object.values(staticChecks.mobile).every(Boolean), staticChecks.mobile);

  const regressionCustomerStoreSend = await sendConversationMessage(sessions.customerA, reportedCustomerStoreId, "Phase 5.1-C regression customer_store send");
  const regressionCustomerSupportSend = await rpc(sessions.customerA.client, "get_or_create_customer_support_conversation", {
    p_support_topic: "other",
    p_subject: `Phase 5.1-C regression customer_support ${runId}`,
  });
  const regressionCustomerSupportSendMessage = regressionCustomerSupportSend.data
    ? await sendConversationMessage(sessions.customerA, String(regressionCustomerSupportSend.data), "Phase 5.1-C regression customer_support send")
    : { data: null, error: regressionCustomerSupportSend.error };
  const regressionStoreSupport = await rpc(sessions.storeMemberB.client, "get_or_create_store_support_conversation", {
    p_store_id: storeB.id,
    p_support_topic: "other",
    p_subject: `Phase 5.1-C regression store_support ${runId}`,
  });
  const regressionStoreSupportSend = regressionStoreSupport.data
    ? await sendConversationMessage(sessions.storeMemberB, String(regressionStoreSupport.data), "Phase 5.1-C regression store_support send")
    : { data: null, error: regressionStoreSupport.error };
  const directCustomerStoreSubject = `Phase 5.1-C direct customer_store blocked ${runId}`;
  const directCustomerStoreBlocked = await directConversationInsert(sessions.customerA, {
    conversation_type: "customer_store",
    customer_user_id: customerA.id,
    store_id: storeB.id,
    listing_id: listingReported.id,
    buyer_id: customerA.id,
    seller_id: storeMemberB.id,
    subject: directCustomerStoreSubject,
    status: "open",
  });
  const legacyCompat = await directConversationInsert(sessions.unrelatedUser, {
    listing_id: listingLegacy.id,
    buyer_id: unrelatedUser.id,
    seller_id: storeMemberB.id,
  });

  assertCheck(checks, "regression_customer_store_approved_rpc_send", allowed(regressionCustomerStoreSend), summarizeError(regressionCustomerStoreSend));
  assertCheck(checks, "regression_customer_support_approved_rpc_send", allowed(regressionCustomerSupportSendMessage), summarizeError(regressionCustomerSupportSendMessage));
  assertCheck(checks, "regression_store_support_approved_rpc_send", allowed(regressionStoreSupportSend), summarizeError(regressionStoreSupportSend));
  assertCheck(checks, "regression_store_b_member_access", allowed(await readConversation(sessions.storeMemberB.client, reportedCustomerStoreId)));
  assertCheck(checks, "regression_customer_a_own_access", allowed(await readConversation(sessions.customerA.client, reportedCustomerStoreId)));
  assertCheck(checks, "regression_phase_5_1_b_direct_insert_protection", deniedError(directCustomerStoreBlocked), summarizeError(directCustomerStoreBlocked));
  assertCheck(checks, "regression_old_client_strict_legacy_compatibility", allowed(legacyCompat), summarizeError(legacyCompat));

  const runDir = path.join(OUT_DIR, runId);
  await mkdir(runDir, { recursive: true });
  const cleanupPath = path.join(runDir, "phase-5-1-c-cleanup.sql");
  await writeFile(
    cleanupPath,
    cleanupSql({
      runId,
      userIds: [customerA.id, unrelatedUser.id, storeMemberB.id, storeMemberC.id, admin.id, supportAgent.id, moderator.id],
      storeIds: [storeB.id, storeC.id],
      listingIds: [listingUnreported.id, listingReported.id, listingClosedStore.id, listingLegacy.id],
    }),
    "utf8",
  );

  const failed = checks.filter((check) => !check.passed);
  const result = {
    project_ref: projectRef,
    run_id: runId,
    dedicated_records: {
      users: {
        customer_a: { id: customerA.id },
        unrelated_user: { id: unrelatedUser.id },
        store_member_b: { id: storeMemberB.id },
        store_member_c: { id: storeMemberC.id },
        admin: { id: admin.id },
        support_agent: { id: supportAgent.id },
        moderator: { id: moderator.id },
      },
      stores: {
        store_b: { id: storeB.id, slug: storeB.slug, membership_id: membershipB.id },
        store_c: { id: storeC.id, slug: storeC.slug, membership_id: membershipC.id },
      },
      conversations: {
        unreported_customer_store: unreportedCustomerStoreId,
        reported_customer_store: reportedCustomerStoreId,
        closed_customer_store: closedCustomerStoreId,
        customer_support: customerSupportId,
        store_support: storeSupportId,
        queue_customer_support: queueCustomerSupportId,
        queue_store_support: queueStoreSupportId,
        legacy_user_user: legacyConversationId,
      },
      cleanup_sql: path.relative(ROOT, cleanupPath).replace(/\\/g, "/"),
    },
    checks,
    sql_status: "NOT APPLIED",
    deployment_status: "NOT PERFORMED",
    enforcement_status: "NOT APPLIED",
    final_status: failed.length === 0 ? "PASS" : "FAIL",
  };

  const resultPath = path.join(runDir, "phase-5-1-c-result.json");
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...result, result_json: path.relative(ROOT, resultPath).replace(/\\/g, "/") }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
