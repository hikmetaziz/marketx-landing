import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const CURRENT_ENV = path.join(ROOT, ".env.local");
const OUT_DIR = path.join(ROOT, "exports", "messaging-runtime-test");
const EXPECTED_PROJECT_REF = "vrtnxdexofpiapbodxkx";

function randomPassword() {
  return `${crypto.randomBytes(18).toString("base64url")}aA1!`;
}

function randomPhone(index) {
  const suffix = String(Date.now()).slice(-6) + String(index).padStart(1, "0");
  return `+99451${suffix.slice(-7)}`;
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

async function createAuthUser(service, runId, label, index) {
  const password = randomPassword();
  const email = `marktx-phase-5-1-b-${label}-${runId}@example.test`;
  const phone = randomPhone(index);
  const displayName = `MarktX Phase 5.1-B ${label} ${runId}`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      display_name: displayName,
      marktx_phase_5_1_b: true,
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
      role: "user",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profile.error) throw new Error(`upsert profile ${label}: ${profile.error.message}`);

  return { id: data.user.id, email, phone, password, displayName };
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
  const slug = slugify(`phase-5-1-b-store-${suffix}-${runId}`);
  const { data, error } = await service
    .from("stores")
    .insert({
      name: `Phase 5.1-B Store ${suffix} ${runId}`,
      slug,
      description: "Dedicated temporary store for MarktX Phase 5.1-B authorization runtime tests.",
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
    .select("id, store_id, user_id, role")
    .single();
  if (error) throw new Error(`create membership ${role}: ${error.message}`);
  return data;
}

async function removeMembership(service, id) {
  const { error } = await service.from("store_members").delete().eq("id", id);
  if (error) throw new Error(`remove membership: ${error.message}`);
}

async function createListing(service, runId, suffix, storeId, userId, reviewedBy, phone) {
  const listingNumber = await nextListingNumber(service);
  const slug = slugify(`phase-5-1-b-listing-${suffix}-${runId}`);
  const { data, error } = await service
    .from("listings")
    .insert({
      user_id: userId,
      title: `Phase 5.1-B Listing ${suffix} ${runId}`,
      price: 1,
      category: "Test",
      city: "Baki",
      condition: "Yeni",
      description: "Dedicated temporary active listing for MarktX Phase 5.1-B authorization runtime tests.",
      status: "active",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      listing_number: listingNumber,
      slug,
      is_sample: false,
      source: "phase_5_1_b_authorization_test",
      attributes: { marktx_phase_5_1_b: true, run_id: runId },
      listing_type: "sell",
      price_type: "fixed",
      delivery_type: "pickup",
      condition_code: "new",
      store_id: storeId,
      contact_phone: phone,
      form_schema_version: 1,
      photo_schema_version: 1,
    })
    .select("id, slug, store_id, user_id")
    .single();
  if (error) throw new Error(`create listing ${suffix}: ${error.message}`);
  return data;
}

async function rpc(client, fn, args = {}) {
  return client.rpc(fn, args);
}

async function readConversation(client, conversationId) {
  return client
    .from("conversations")
    .select("id, conversation_type, customer_user_id, store_id, listing_id, buyer_id, seller_id, status")
    .eq("id", conversationId)
    .maybeSingle();
}

async function listStoreInbox(client, storeId) {
  return client
    .from("conversations")
    .select("id, conversation_type, customer_user_id, store_id, listing_id")
    .eq("store_id", storeId)
    .in("conversation_type", ["customer_store", "store_support"])
    .order("created_at", { ascending: true });
}

async function readMessages(client, conversationId) {
  return client
    .from("messages")
    .select("id, conversation_id, sender_id, sender_context, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
}

function allowed(result) {
  return !result.error && result.data !== null;
}

function deniedRead(result) {
  return !result.error && result.data === null;
}

function deniedList(result) {
  return !result.error && Array.isArray(result.data) && result.data.length === 0;
}

function deniedError(result) {
  return Boolean(result.error);
}

function assertCheck(checks, name, passed, details = undefined) {
  checks.push({ name, passed: Boolean(passed), details });
}

function summarizeError(result) {
  return result.error ? { code: result.error.code ?? null, message: result.error.message } : null;
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

async function directConversationInsert(session, payload) {
  return session.client.from("conversations").insert(payload).select("id").maybeSingle();
}

async function directMessageInsert(session, payload) {
  return session.client.from("messages").insert(payload).select("id").maybeSingle();
}

function cleanupSql(ids) {
  const userIds = ids.userIds.map((id) => `'${id}'::uuid`).join(", ");
  const storeIds = ids.storeIds.map((id) => `'${id}'::uuid`).join(", ");
  const listingIds = ids.listingIds.map((id) => `'${id}'::uuid`).join(", ");
  return `-- MarktX Phase 5.1-B authorization runtime cleanup.
-- Review before running. This targets only dedicated test rows from run ${ids.runId}.
begin;

delete from public.conversation_reads
where conversation_id in (
  select id from public.conversations
  where store_id in (${storeIds})
     or customer_user_id in (${userIds})
);

delete from public.messages
where conversation_id in (
  select id from public.conversations
  where store_id in (${storeIds})
     or customer_user_id in (${userIds})
);

delete from public.conversations
where store_id in (${storeIds})
   or customer_user_id in (${userIds});

delete from public.listings
where id in (${listingIds})
  and source = 'phase_5_1_b_authorization_test';

delete from public.store_members
where store_id in (${storeIds})
  and user_id in (${userIds});

delete from public.stores
where id in (${storeIds})
  and slug like 'phase-5-1-b-store-%';

delete from public.profiles
where id in (${userIds})
  and email like 'marktx-phase-5-1-b-%@example.test';

delete from auth.users
where id in (${userIds})
  and email like 'marktx-phase-5-1-b-%@example.test';

commit;
`;
}

async function main() {
  if (!existsSync(CURRENT_ENV)) throw new Error(".env.local is missing.");
  const env = await loadEnv(CURRENT_ENV);
  const publicUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const projectRef = projectRefFromUrl(publicUrl);
  if (projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(`Supabase project ref mismatch: ${projectRef}`);
  }

  const service = createServiceClient(env);
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const checks = [];

  const customerA = await createAuthUser(service, runId, "customer-a", 1);
  const customerX = await createAuthUser(service, runId, "customer-x", 2);
  const storeMemberB = await createAuthUser(service, runId, "store-member-b", 3);
  const storeMemberC = await createAuthUser(service, runId, "store-member-c", 4);
  const ownerIdOnly = await createAuthUser(service, runId, "owner-id-only", 5);
  const tempStaff = await createAuthUser(service, runId, "temp-staff", 6);

  const storeB = await createStore(service, runId, "b", ownerIdOnly.id, storeMemberB.id, storeMemberB.phone);
  const storeC = await createStore(service, runId, "c", storeMemberC.id, storeMemberC.id, storeMemberC.phone);
  const membershipB = await createMembership(service, storeB.id, storeMemberB.id, "owner");
  const membershipC = await createMembership(service, storeC.id, storeMemberC.id, "owner");
  const staffMembership = await createMembership(service, storeB.id, tempStaff.id, "staff");
  const listingB = await createListing(service, runId, "b", storeB.id, storeMemberB.id, storeMemberB.id, storeMemberB.phone);
  const directCustomerStoreListingB = await createListing(service, runId, "b-direct-customer-store", storeB.id, storeMemberB.id, storeMemberB.id, storeMemberB.phone);
  const directCustomerSupportListingB = await createListing(service, runId, "b-direct-customer-support", storeB.id, storeMemberB.id, storeMemberB.id, storeMemberB.phone);
  const directStoreSupportListingB = await createListing(service, runId, "b-direct-store-support", storeB.id, storeMemberB.id, storeMemberB.id, storeMemberB.phone);
  const directNullTypeListingB = await createListing(service, runId, "b-direct-null-type", storeB.id, storeMemberB.id, storeMemberB.id, storeMemberB.phone);
  const directOmittedTypeListingB = await createListing(service, runId, "b-direct-omitted-type", storeB.id, storeMemberB.id, storeMemberB.id, storeMemberB.phone);
  const legacyListingB = await createListing(service, runId, "b-legacy", storeB.id, storeMemberB.id, storeMemberB.id, storeMemberB.phone);
  const listingC = await createListing(service, runId, "c", storeC.id, storeMemberC.id, storeMemberC.id, storeMemberC.phone);

  const sessions = {
    customerA: await signIn(env, customerA),
    customerX: await signIn(env, customerX),
    storeMemberB: await signIn(env, storeMemberB),
    storeMemberC: await signIn(env, storeMemberC),
    ownerIdOnly: await signIn(env, ownerIdOnly),
    tempStaff: await signIn(env, tempStaff),
  };

  const conversationAStoreB = await createCustomerStoreConversation(
    sessions.customerA,
    storeB.id,
    listingB.id,
    "Phase 5.1-B Customer A to Store B",
  );
  const conversationXStoreB = await createCustomerStoreConversation(
    sessions.customerX,
    storeB.id,
    listingB.id,
    "Phase 5.1-B Customer X to Store B",
  );
  const conversationAStoreC = await createCustomerStoreConversation(
    sessions.customerA,
    storeC.id,
    listingC.id,
    "Phase 5.1-B Customer A to Store C",
  );
  const customerSupportConversation = await rpc(sessions.customerA.client, "get_or_create_customer_support_conversation", {
    p_support_topic: "technical_problem",
    p_subject: "Phase 5.1-B1 customer support RPC check",
  });
  const storeSupportConversation = await rpc(sessions.storeMemberB.client, "get_or_create_store_support_conversation", {
    p_store_id: storeB.id,
    p_support_topic: "technical_problem",
    p_subject: "Phase 5.1-B1 store support RPC check",
  });

  const firstMessage = await sendConversationMessage(sessions.customerA, conversationAStoreB, "Phase 5.1-B customer message");
  if (firstMessage.error) throw new Error(`send initial customer message: ${firstMessage.error.message}`);

  const customerAOwnRead = await readConversation(sessions.customerA.client, conversationAStoreB);
  const customerAXRead = await readConversation(sessions.customerA.client, conversationXStoreB);
  const customerASendToX = await sendConversationMessage(sessions.customerA, conversationXStoreB, "Unauthorized customer send attempt");
  const guessedId = crypto.randomUUID();
  const guessedRead = await readConversation(sessions.customerA.client, guessedId);
  const guessedSend = await sendConversationMessage(sessions.customerA, guessedId, "Guessed UUID send attempt");

  assertCheck(checks, "customer_a_can_read_own_customer_store_conversation", allowed(customerAOwnRead));
  assertCheck(checks, "customer_a_cannot_read_customer_x_conversation", deniedRead(customerAXRead), summarizeError(customerAXRead));
  assertCheck(checks, "customer_a_cannot_send_to_customer_x_conversation", deniedError(customerASendToX), summarizeError(customerASendToX));
  assertCheck(checks, "guessed_conversation_uuid_read_denied_or_not_found", deniedRead(guessedRead), summarizeError(guessedRead));
  assertCheck(checks, "guessed_conversation_uuid_send_denied_or_not_found", deniedError(guessedSend), summarizeError(guessedSend));

  const storeBReadOwn = await readConversation(sessions.storeMemberB.client, conversationAStoreB);
  const storeBReply = await sendConversationMessage(sessions.storeMemberB, conversationAStoreB, "Phase 5.1-B store reply");
  const storeBInbox = await listStoreInbox(sessions.storeMemberB.client, storeB.id);
  const storeBReadStoreC = await readConversation(sessions.storeMemberB.client, conversationAStoreC);
  const storeCReadStoreB = await readConversation(sessions.storeMemberC.client, conversationAStoreB);
  const storeCInboxForB = await listStoreInbox(sessions.storeMemberC.client, storeB.id);

  assertCheck(checks, "store_member_b_can_read_store_b_conversation", allowed(storeBReadOwn));
  assertCheck(checks, "store_member_b_can_reply_to_store_b_conversation", allowed(storeBReply), summarizeError(storeBReply));
  assertCheck(
    checks,
    "store_member_b_store_b_inbox_contains_store_b_conversation",
    !storeBInbox.error && storeBInbox.data.some((row) => row.id === conversationAStoreB),
    summarizeError(storeBInbox),
  );
  assertCheck(checks, "store_member_b_cannot_read_store_c_conversation", deniedRead(storeBReadStoreC), summarizeError(storeBReadStoreC));
  assertCheck(checks, "store_member_c_cannot_read_store_b_conversation", deniedRead(storeCReadStoreB), summarizeError(storeCReadStoreB));
  assertCheck(checks, "store_member_c_cannot_list_store_b_inbox", deniedList(storeCInboxForB), summarizeError(storeCInboxForB));

  const staffReadBefore = await readConversation(sessions.tempStaff.client, conversationAStoreB);
  const staffSendBefore = await sendConversationMessage(sessions.tempStaff, conversationAStoreB, "Phase 5.1-B staff reply before removal");
  await removeMembership(service, staffMembership.id);
  const staffReadAfterRemoval = await readConversation(sessions.tempStaff.client, conversationAStoreB);
  const staffSendAfterRemoval = await sendConversationMessage(sessions.tempStaff, conversationAStoreB, "Phase 5.1-B staff reply after removal");
  const staffMembershipRestored = await createMembership(service, storeB.id, tempStaff.id, "staff");
  const staffReadAfterReadd = await readConversation(sessions.tempStaff.client, conversationAStoreB);
  const staffSendAfterReadd = await sendConversationMessage(sessions.tempStaff, conversationAStoreB, "Phase 5.1-B staff reply after re-add");

  assertCheck(checks, "temp_staff_access_allowed_before_removal", allowed(staffReadBefore) && allowed(staffSendBefore));
  assertCheck(checks, "temp_staff_read_denied_immediately_after_removal", deniedRead(staffReadAfterRemoval), summarizeError(staffReadAfterRemoval));
  assertCheck(checks, "temp_staff_send_denied_immediately_after_removal", deniedError(staffSendAfterRemoval), summarizeError(staffSendAfterRemoval));
  assertCheck(checks, "temp_staff_access_restored_after_readd", allowed(staffReadAfterReadd) && allowed(staffSendAfterReadd));

  const canonicalConversation = await service
    .from("conversations")
    .select("id, conversation_type, store_id, listing_id, customer_user_id")
    .eq("id", conversationAStoreB)
    .single();
  if (canonicalConversation.error) throw new Error(`read canonical conversation: ${canonicalConversation.error.message}`);
  const canonicalListing = await service.from("listings").select("id, store_id").eq("id", listingB.id).single();
  if (canonicalListing.error) throw new Error(`read canonical listing: ${canonicalListing.error.message}`);
  const mismatchCreate = await rpc(sessions.customerA.client, "get_or_create_customer_store_conversation", {
    p_store_id: storeB.id,
    p_listing_id: listingC.id,
    p_subject: "Phase 5.1-B mismatch attempt",
  });
  const ownerIdOnlyRead = await readConversation(sessions.ownerIdOnly.client, conversationAStoreB);

  assertCheck(checks, "customer_store_store_id_is_canonical", canonicalConversation.data.store_id === storeB.id);
  assertCheck(checks, "customer_store_listing_id_belongs_to_same_store", canonicalListing.data.store_id === canonicalConversation.data.store_id);
  assertCheck(checks, "mismatched_listing_store_rpc_rejected", deniedError(mismatchCreate), summarizeError(mismatchCreate));
  assertCheck(checks, "access_does_not_depend_on_stores_owner_id", deniedRead(ownerIdOnlyRead), summarizeError(ownerIdOnlyRead));
  assertCheck(checks, "approved_customer_support_rpc_still_works", !customerSupportConversation.error && Boolean(customerSupportConversation.data), summarizeError(customerSupportConversation));
  assertCheck(checks, "approved_store_support_rpc_still_works", !storeSupportConversation.error && Boolean(storeSupportConversation.data), summarizeError(storeSupportConversation));

  const directConversationSubject = `Phase 5.1-B direct customer_store bypass attempt ${runId}`;
  const directConversationBypass = await directConversationInsert(sessions.customerA, {
    conversation_type: "customer_store",
    customer_user_id: customerX.id,
    store_id: storeB.id,
    listing_id: directCustomerStoreListingB.id,
    buyer_id: customerA.id,
    seller_id: storeMemberB.id,
    subject: directConversationSubject,
    status: "open",
    last_message_at: new Date().toISOString(),
  });
  const directConversationCreated = await service
    .from("conversations")
    .select("id")
    .eq("subject", directConversationSubject)
    .maybeSingle();
  if (directConversationCreated.error) throw new Error(`verify direct conversation insert: ${directConversationCreated.error.message}`);

  const directCustomerSupportSubject = `Phase 5.1-B direct customer_support bypass attempt ${runId}`;
  const directCustomerSupportBypass = await directConversationInsert(sessions.customerA, {
    conversation_type: "customer_support",
    customer_user_id: customerA.id,
    listing_id: directCustomerSupportListingB.id,
    buyer_id: customerA.id,
    seller_id: storeMemberB.id,
    subject: directCustomerSupportSubject,
    support_topic: "technical_problem",
    status: "open",
  });
  const directCustomerSupportCreated = await service
    .from("conversations")
    .select("id")
    .eq("subject", directCustomerSupportSubject)
    .maybeSingle();
  if (directCustomerSupportCreated.error) throw new Error(`verify direct customer_support insert: ${directCustomerSupportCreated.error.message}`);

  const directStoreSupportSubject = `Phase 5.1-B direct store_support bypass attempt ${runId}`;
  const directStoreSupportBypass = await directConversationInsert(sessions.customerA, {
    conversation_type: "store_support",
    customer_user_id: customerA.id,
    store_id: storeB.id,
    listing_id: directStoreSupportListingB.id,
    buyer_id: customerA.id,
    seller_id: storeMemberB.id,
    subject: directStoreSupportSubject,
    support_topic: "technical_problem",
    status: "open",
  });
  const directStoreSupportCreated = await service
    .from("conversations")
    .select("id")
    .eq("subject", directStoreSupportSubject)
    .maybeSingle();
  if (directStoreSupportCreated.error) throw new Error(`verify direct store_support insert: ${directStoreSupportCreated.error.message}`);

  const directNullTypeSubject = `Phase 5.1-B direct null type bypass attempt ${runId}`;
  const directNullTypeBypass = await directConversationInsert(sessions.customerA, {
    conversation_type: null,
    customer_user_id: customerA.id,
    store_id: storeB.id,
    listing_id: directNullTypeListingB.id,
    buyer_id: customerA.id,
    seller_id: storeMemberB.id,
    subject: directNullTypeSubject,
    status: "open",
  });
  const directNullTypeCreated = await service
    .from("conversations")
    .select("id")
    .eq("subject", directNullTypeSubject)
    .maybeSingle();
  if (directNullTypeCreated.error) throw new Error(`verify direct null type insert: ${directNullTypeCreated.error.message}`);

  const directOmittedTypeSubject = `Phase 5.1-B direct omitted type with store fields attempt ${runId}`;
  const directOmittedTypeBypass = await directConversationInsert(sessions.customerA, {
    customer_user_id: customerA.id,
    store_id: storeB.id,
    listing_id: directOmittedTypeListingB.id,
    buyer_id: customerA.id,
    seller_id: storeMemberB.id,
    subject: directOmittedTypeSubject,
    status: "open",
  });
  const directOmittedTypeCreated = await service
    .from("conversations")
    .select("id")
    .eq("subject", directOmittedTypeSubject)
    .maybeSingle();
  if (directOmittedTypeCreated.error) throw new Error(`verify direct omitted type insert: ${directOmittedTypeCreated.error.message}`);

  const legacyConversation = await directConversationInsert(sessions.customerA, {
    listing_id: legacyListingB.id,
    buyer_id: customerA.id,
    seller_id: storeMemberB.id,
  });
  const legacyMessage = legacyConversation.data?.id
    ? await directMessageInsert(sessions.customerA, {
        conversation_id: legacyConversation.data.id,
        sender_id: customerA.id,
        body: `Phase 5.1-B legacy direct message ${runId}`,
      })
    : { data: null, error: new Error("legacy conversation was not created") };

  const directMessageBody = `Phase 5.1-B direct unauthorized message attempt ${runId}`;
  const directMessageUnauthorized = await directMessageInsert(sessions.customerA, {
    conversation_id: conversationXStoreB,
    sender_id: customerA.id,
    sender_context: "customer",
    body: directMessageBody,
  });
  const directMessageCreated = await service
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationXStoreB)
    .eq("body", directMessageBody)
    .maybeSingle();
  if (directMessageCreated.error) throw new Error(`verify direct message insert: ${directMessageCreated.error.message}`);
  const directReadRows = await readMessages(sessions.customerA.client, conversationXStoreB);

  assertCheck(
    checks,
    "unauthorized_direct_customer_store_conversation_insert_blocked",
    deniedError(directConversationBypass) && !directConversationCreated.data,
    directConversationBypass.error
      ? summarizeError(directConversationBypass)
      : {
          created_id: directConversationCreated.data?.id ?? directConversationBypass.data?.id ?? null,
          proposed_action: "tighten insert policy or apply equivalent RPC-only guard",
        },
  );
  assertCheck(
    checks,
    "unauthorized_direct_customer_support_conversation_insert_blocked",
    deniedError(directCustomerSupportBypass) && !directCustomerSupportCreated.data,
    directCustomerSupportBypass.error
      ? summarizeError(directCustomerSupportBypass)
      : { created_id: directCustomerSupportCreated.data?.id ?? directCustomerSupportBypass.data?.id ?? null },
  );
  assertCheck(
    checks,
    "unauthorized_direct_store_support_conversation_insert_blocked",
    deniedError(directStoreSupportBypass) && !directStoreSupportCreated.data,
    directStoreSupportBypass.error
      ? summarizeError(directStoreSupportBypass)
      : { created_id: directStoreSupportCreated.data?.id ?? directStoreSupportBypass.data?.id ?? null },
  );
  assertCheck(
    checks,
    "explicit_null_conversation_type_nonlegacy_shape_blocked",
    deniedError(directNullTypeBypass) && !directNullTypeCreated.data,
    directNullTypeBypass.error
      ? summarizeError(directNullTypeBypass)
      : { created_id: directNullTypeCreated.data?.id ?? directNullTypeBypass.data?.id ?? null },
  );
  assertCheck(
    checks,
    "omitted_conversation_type_with_store_fields_blocked",
    deniedError(directOmittedTypeBypass) && !directOmittedTypeCreated.data,
    directOmittedTypeBypass.error
      ? summarizeError(directOmittedTypeBypass)
      : { created_id: directOmittedTypeCreated.data?.id ?? directOmittedTypeBypass.data?.id ?? null },
  );
  assertCheck(
    checks,
    "legacy_user_user_direct_insert_compatibility_preserved",
    !legacyConversation.error && Boolean(legacyConversation.data?.id),
    summarizeError(legacyConversation),
  );
  assertCheck(
    checks,
    "legacy_user_user_direct_message_compatibility_preserved",
    !legacyMessage.error && Boolean(legacyMessage.data?.id),
    summarizeError(legacyMessage),
  );
  assertCheck(
    checks,
    "unauthorized_direct_message_insert_blocked",
    deniedError(directMessageUnauthorized) && !directMessageCreated.data,
    directMessageUnauthorized.error
      ? summarizeError(directMessageUnauthorized)
      : {
          created_id: directMessageCreated.data?.id ?? directMessageUnauthorized.data?.id ?? null,
          proposed_action: "tighten messages insert policy or keep all customer_store writes RPC-only",
        },
  );
  assertCheck(
    checks,
    "unauthorized_direct_read_after_write_attempt_no_message_leak",
    !directReadRows.error && directReadRows.data.length === 0,
    summarizeError(directReadRows),
  );

  const runDir = path.join(OUT_DIR, runId);
  await mkdir(runDir, { recursive: true });
  const cleanupPath = path.join(runDir, "phase-5-1-b-cleanup.sql");
  await writeFile(
    cleanupPath,
    cleanupSql({
      runId,
      userIds: [customerA.id, customerX.id, storeMemberB.id, storeMemberC.id, ownerIdOnly.id, tempStaff.id],
      storeIds: [storeB.id, storeC.id],
      listingIds: [
        listingB.id,
        directCustomerStoreListingB.id,
        directCustomerSupportListingB.id,
        directStoreSupportListingB.id,
        directNullTypeListingB.id,
        directOmittedTypeListingB.id,
        legacyListingB.id,
        listingC.id,
      ],
    }),
    "utf8",
  );

  const failed = checks.filter((check) => !check.passed);
  const result = {
    project_ref: projectRef,
    run_id: runId,
    dedicated_records: {
      users: {
        customer_a: { email: customerA.email, id: customerA.id },
        customer_x: { email: customerX.email, id: customerX.id },
        store_member_b: { email: storeMemberB.email, id: storeMemberB.id },
        store_member_c: { email: storeMemberC.email, id: storeMemberC.id },
        owner_id_only: { email: ownerIdOnly.email, id: ownerIdOnly.id },
        temp_staff: { email: tempStaff.email, id: tempStaff.id },
      },
      stores: {
        store_b: { id: storeB.id, slug: storeB.slug, owner_id: storeB.owner_id, membership_id: membershipB.id },
        store_c: { id: storeC.id, slug: storeC.slug, owner_id: storeC.owner_id, membership_id: membershipC.id },
      },
      listings: {
        listing_b: { id: listingB.id, slug: listingB.slug, store_id: listingB.store_id },
        direct_customer_store_listing_b: { id: directCustomerStoreListingB.id, slug: directCustomerStoreListingB.slug, store_id: directCustomerStoreListingB.store_id },
        direct_customer_support_listing_b: { id: directCustomerSupportListingB.id, slug: directCustomerSupportListingB.slug, store_id: directCustomerSupportListingB.store_id },
        direct_store_support_listing_b: { id: directStoreSupportListingB.id, slug: directStoreSupportListingB.slug, store_id: directStoreSupportListingB.store_id },
        direct_null_type_listing_b: { id: directNullTypeListingB.id, slug: directNullTypeListingB.slug, store_id: directNullTypeListingB.store_id },
        direct_omitted_type_listing_b: { id: directOmittedTypeListingB.id, slug: directOmittedTypeListingB.slug, store_id: directOmittedTypeListingB.store_id },
        legacy_listing_b: { id: legacyListingB.id, slug: legacyListingB.slug, store_id: legacyListingB.store_id },
        listing_c: { id: listingC.id, slug: listingC.slug, store_id: listingC.store_id },
      },
      conversations: {
        customer_a_store_b: conversationAStoreB,
        customer_x_store_b: conversationXStoreB,
        customer_a_store_c: conversationAStoreC,
        customer_support: customerSupportConversation.data ? String(customerSupportConversation.data) : null,
        store_support: storeSupportConversation.data ? String(storeSupportConversation.data) : null,
        legacy_user_user: legacyConversation.data?.id ?? null,
      },
      restored_staff_membership_id: staffMembershipRestored.id,
      cleanup_sql: path.relative(ROOT, cleanupPath).replace(/\\/g, "/"),
    },
    checks,
    sql_status: "NOT APPLIED",
    deployment_status: "NOT PERFORMED",
    enforcement_status: "NOT APPLIED",
    final_status: failed.length === 0 ? "PASS" : "FAIL",
  };

  const resultPath = path.join(runDir, "phase-5-1-b-result.json");
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...result, result_json: path.relative(ROOT, resultPath).replace(/\\/g, "/") }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
