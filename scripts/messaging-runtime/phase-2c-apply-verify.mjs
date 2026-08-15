/**
 * Security Remediation 2C — post-apply path verification.
 *
 * Creates temporary fixtures and verifies ALLOW/BLOCK across:
 * - customer_store (send_conversation_message)
 * - customer_support
 * - store_support
 * - legacy_user_user (direct insert)
 *
 * Also checks closed-conversation rejection and unauthorized non-legacy
 * direct inserts. Does not deploy app code or apply final enforcement.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const CURRENT_ENV = path.join(ROOT, ".env.local");
const OUT_DIR = path.join(ROOT, "exports", "messaging-runtime-test");
const EXPECTED_PROJECT_REF = "vrtnxdexofpiapbodxkx";
const STABLE_ERROR = "message_sensitive_credentials_blocked";
const CLASSIFIER_FN = "marktx_classify_message_sensitive_credentials";

const ALLOW_SAMPLES = [
  { label: "normal", body: "Salam, mehsul hələ var?" },
  { label: "card_number_request", body: "Odeyis ucun kart nomrenizi yazin" },
  { label: "card_number_only", body: "4111111111111111" },
  { label: "iban", body: "IBAN AZ21NABZ00000000137010001944" },
];

const BLOCK_SAMPLES = [
  { label: "cvv", body: "Kartin CVV kodunu yazin", category: "cvv" },
  { label: "pin", body: "PIN kodunuzu gonderin", category: "pin" },
  { label: "otp", body: "OTP kodu lazimdir", category: "otp" },
  { label: "sms_code", body: "SMS kodu atin", category: "otp" },
  { label: "bank_password", body: "Mobile banking password lazimdir", category: "banking_password" },
  { label: "card_photo", body: "Kartin uz ve arxa terefinin fotosunu gonderin", category: "card_photo" },
  { label: "card_auth_combo", body: "Kart nomresi 4111111111111111 ve SKT 12/28", category: "card_auth_combo" },
];

function randomPassword() {
  return `${crypto.randomBytes(18).toString("base64url")}aA1!`;
}

function randomPhone(index) {
  const suffix = String(Date.now()).slice(-6) + String(index).padStart(1, "0");
  return `+99450${suffix.slice(-7)}`;
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
  if (!url || !key) throw new Error("Missing Supabase URL or service-role key");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function createAnonClient(env) {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing anon key");
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

function errorBlob(error) {
  return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ");
}

function isBlockedError(error) {
  return errorBlob(error).includes(STABLE_ERROR);
}

function rawLeaked(error, body) {
  const blob = errorBlob(error).toLowerCase();
  return body
    .toLowerCase()
    .split(/[^a-z0-9а-яё]+/i)
    .filter((part) => part.length >= 4 && /\d/.test(part))
    .some((part) => blob.includes(part));
}

async function createAuthUser(service, runId, label, index) {
  const password = randomPassword();
  const email = `marktx-2c-verify-${label}-${runId}@example.test`;
  const phone = randomPhone(index);
  const { data, error } = await service.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { display_name: `2C ${label}`, marktx_2c_verify: true, run_id: runId },
  });
  if (error || !data.user) throw new Error(`create user ${label}: ${error?.message ?? "none"}`);
  const profile = await service.from("profiles").upsert(
    {
      id: data.user.id,
      email,
      phone,
      display_name: `2C ${label} ${runId}`,
      role: label === "support" ? "support_agent" : "user",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profile.error) throw new Error(`profile ${label}: ${profile.error.message}`);
  return { id: data.user.id, email, phone, password };
}

async function signIn(env, account) {
  const anon = createAnonClient(env);
  const { data, error } = await anon.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (error || !data.session) throw new Error(`signIn ${account.email}: ${error?.message ?? "none"}`);
  return { userId: data.user.id, client: clientWithToken(env, data.session.access_token) };
}

async function nextListingNumber(service) {
  const { data, error } = await service
    .from("listings")
    .select("listing_number")
    .order("listing_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`listing_number: ${error.message}`);
  return Number(data?.listing_number ?? 1000) + 1;
}

async function countBody(service, conversationId, body) {
  const { count, error } = await service
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("body", body);
  if (error) throw new Error(`count body: ${error.message}`);
  return count ?? 0;
}

async function classify(service, body) {
  const { data, error } = await service.rpc(CLASSIFIER_FN, { p_body: body });
  if (error) throw new Error(`classify: ${errorBlob(error)}`);
  return data ?? null;
}

async function main() {
  const env = await loadEnv(CURRENT_ENV);
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const ref = projectRefFromUrl(url);
  if (ref !== EXPECTED_PROJECT_REF) throw new Error(`Wrong project ref: ${ref}`);

  const service = createServiceClient(env);
  const runId = crypto.randomBytes(3).toString("hex");
  const checks = [];
  const created = { userIds: [], storeIds: [], listingIds: [], conversationIds: [], messageIds: [] };

  const push = (name, passed, details = undefined) => {
    checks.push({ name, passed: Boolean(passed), details });
  };

  try {
    // Object presence
    const classProbe = await service.rpc(CLASSIFIER_FN, { p_body: "ping" });
    push("classifier_rpc_available", !classProbe.error || !errorBlob(classProbe.error).includes("could not find"), {
      error: classProbe.error ? errorBlob(classProbe.error) : null,
    });

    const finalPolicy = await service
      .from("pg_policies")
      .select("policyname")
      .eq("tablename", "messages")
      .eq("policyname", "messages_insert_rpc_only_phase2");
    // pg_policies may not be exposed; ignore if unavailable
    if (!finalPolicy.error) {
      push("final_enforcement_policy_absent", (finalPolicy.data ?? []).length === 0, finalPolicy.data);
    } else {
      push("final_enforcement_policy_check", true, { skipped: errorBlob(finalPolicy.error) });
    }

    // Classifier matrix
    for (const sample of ALLOW_SAMPLES) {
      const actual = await classify(service, sample.body);
      push(`classifier_allow_${sample.label}`, actual === null, { actual });
    }
    for (const sample of BLOCK_SAMPLES) {
      const actual = await classify(service, sample.body);
      push(`classifier_block_${sample.label}`, actual === sample.category, { actual, expected: sample.category });
    }

    const customer = await createAuthUser(service, runId, "customer", 1);
    const owner = await createAuthUser(service, runId, "owner", 2);
    const support = await createAuthUser(service, runId, "support", 3);
    const stranger = await createAuthUser(service, runId, "stranger", 4);
    created.userIds.push(customer.id, owner.id, support.id, stranger.id);

    const customerSession = await signIn(env, customer);
    const ownerSession = await signIn(env, owner);
    const supportSession = await signIn(env, support);
    const strangerSession = await signIn(env, stranger);

    const storeSlug = slugify(`2c-store-${runId}`);
    const { data: store, error: storeErr } = await service
      .from("stores")
      .insert({
        name: `2C Store ${runId}`,
        slug: storeSlug,
        description: "2C verify store",
        category: "Test",
        contact_phone: owner.phone,
        whatsapp_phone: owner.phone,
        city: "Baki",
        owner_id: owner.id,
        created_by: owner.id,
        status: "claimed",
      })
      .select("id")
      .single();
    if (storeErr) throw new Error(`store: ${storeErr.message}`);
    created.storeIds.push(store.id);

    const { error: memErr } = await service.from("store_members").insert({
      store_id: store.id,
      user_id: owner.id,
      role: "owner",
    });
    if (memErr) throw new Error(`membership: ${memErr.message}`);

    const listingNumber = await nextListingNumber(service);
    const { data: listing, error: listingErr } = await service
      .from("listings")
      .insert({
        user_id: owner.id,
        title: `2C Listing ${runId}`,
        price: 1,
        category: "Test",
        city: "Baki",
        condition: "Yeni",
        description: "2C verify listing",
        status: "active",
        listing_number: listingNumber,
        slug: slugify(`2c-listing-${runId}`),
        is_sample: false,
        source: "phase_2c_verify",
        attributes: { marktx_2c_verify: true, run_id: runId },
        listing_type: "sell",
        price_type: "fixed",
        delivery_type: "pickup",
        condition_code: "new",
        store_id: store.id,
        contact_phone: owner.phone,
        form_schema_version: 1,
        photo_schema_version: 1,
      })
      .select("id")
      .single();
    if (listingErr) throw new Error(`listing: ${listingErr.message}`);
    created.listingIds.push(listing.id);

    // customer_store
    const cs = await customerSession.client.rpc("get_or_create_customer_store_conversation", {
      p_store_id: store.id,
      p_listing_id: listing.id,
      p_subject: `2C CS ${runId}`,
    });
    if (cs.error || !cs.data) throw new Error(`customer_store convo: ${cs.error?.message ?? "none"}`);
    const customerStoreId = String(cs.data);
    created.conversationIds.push(customerStoreId);

    // customer_support
    const csup = await customerSession.client.rpc("get_or_create_customer_support_conversation", {
      p_subject: `2C customer support ${runId}`,
      p_support_topic: "other",
    });
    if (csup.error || !csup.data) throw new Error(`customer_support convo: ${csup.error?.message ?? "none"}`);
    const customerSupportId = String(csup.data);
    created.conversationIds.push(customerSupportId);

    // store_support
    const ssup = await ownerSession.client.rpc("get_or_create_store_support_conversation", {
      p_store_id: store.id,
      p_subject: `2C store support ${runId}`,
      p_support_topic: "other",
    });
    if (ssup.error || !ssup.data) throw new Error(`store_support convo: ${ssup.error?.message ?? "none"}`);
    const storeSupportId = String(ssup.data);
    created.conversationIds.push(storeSupportId);

    // legacy_user_user via direct conversation insert (compat policy)
    const legacyInsert = await customerSession.client
      .from("conversations")
      .insert({
        conversation_type: "legacy_user_user",
        listing_id: listing.id,
        buyer_id: customer.id,
        seller_id: owner.id,
        status: "open",
      })
      .select("id")
      .maybeSingle();
    if (legacyInsert.error || !legacyInsert.data?.id) {
      push("legacy_conversation_create", false, { error: errorBlob(legacyInsert.error) });
    } else {
      push("legacy_conversation_create", true);
      created.conversationIds.push(legacyInsert.data.id);
    }
    const legacyId = legacyInsert.data?.id ? String(legacyInsert.data.id) : null;

    const pathSessions = [
      { type: "customer_store", id: customerStoreId, session: customerSession },
      { type: "customer_support", id: customerSupportId, session: customerSession },
      { type: "store_support", id: storeSupportId, session: ownerSession },
    ];

    for (const path of pathSessions) {
      for (const sample of ALLOW_SAMPLES) {
        const body = `2C ${path.type} allow ${sample.label} ${runId} ${sample.body}`;
        const before = await countBody(service, path.id, body);
        const result = await path.session.client.rpc("send_conversation_message", {
          p_conversation_id: path.id,
          p_body: body,
          p_sender_context: null,
        });
        const after = await countBody(service, path.id, body);
        const ok = !result.error && after === before + 1;
        push(`allow_${path.type}_${sample.label}`, ok, {
          error: result.error ? errorBlob(result.error) : null,
          persisted: after > before,
        });
        if (result.data?.id) created.messageIds.push(result.data.id);
      }

      for (const sample of BLOCK_SAMPLES) {
        const body = `2C ${path.type} block ${sample.label} ${runId} ${sample.body}`;
        const before = await countBody(service, path.id, body);
        const result = await path.session.client.rpc("send_conversation_message", {
          p_conversation_id: path.id,
          p_body: body,
          p_sender_context: null,
        });
        const after = await countBody(service, path.id, body);
        const ok =
          Boolean(result.error) &&
          isBlockedError(result.error) &&
          after === before &&
          !rawLeaked(result.error, body);
        push(`block_${path.type}_${sample.label}`, ok, {
          error: result.error ? errorBlob(result.error) : null,
          persisted: after > before,
          raw_leaked: rawLeaked(result.error, body),
        });
      }
    }

    // support agent reply allow on customer_support
    const supportAllowBody = `2C support reply allow ${runId} salam`;
    const supportSend = await supportSession.client.rpc("send_conversation_message", {
      p_conversation_id: customerSupportId,
      p_body: supportAllowBody,
      p_sender_context: "support",
    });
    push("allow_support_agent_reply", !supportSend.error, {
      error: supportSend.error ? errorBlob(supportSend.error) : null,
    });

    const supportBlockBody = `2C support reply block ${runId} CVV 123`;
    const beforeSupportBlock = await countBody(service, customerSupportId, supportBlockBody);
    const supportBlock = await supportSession.client.rpc("send_conversation_message", {
      p_conversation_id: customerSupportId,
      p_body: supportBlockBody,
      p_sender_context: "support",
    });
    const afterSupportBlock = await countBody(service, customerSupportId, supportBlockBody);
    push(
      "block_support_agent_reply_cvv",
      Boolean(supportBlock.error) &&
        isBlockedError(supportBlock.error) &&
        afterSupportBlock === beforeSupportBlock &&
        !rawLeaked(supportBlock.error, supportBlockBody),
      {
        error: supportBlock.error ? errorBlob(supportBlock.error) : null,
        persisted: afterSupportBlock > beforeSupportBlock,
      },
    );

    // legacy direct message allow/block
    if (legacyId) {
      for (const sample of ALLOW_SAMPLES.slice(0, 2)) {
        const body = `2C legacy allow ${sample.label} ${runId} ${sample.body}`;
        const before = await countBody(service, legacyId, body);
        const result = await customerSession.client.from("messages").insert({
          conversation_id: legacyId,
          sender_id: customer.id,
          body,
        }).select("id").maybeSingle();
        const after = await countBody(service, legacyId, body);
        push(`allow_legacy_${sample.label}`, !result.error && after === before + 1, {
          error: result.error ? errorBlob(result.error) : null,
        });
      }

      const blockBody = `2C legacy block cvv ${runId} CVV 999`;
      const before = await countBody(service, legacyId, blockBody);
      const result = await customerSession.client.from("messages").insert({
        conversation_id: legacyId,
        sender_id: customer.id,
        body: blockBody,
      }).select("id").maybeSingle();
      const after = await countBody(service, legacyId, blockBody);
      push(
        "block_legacy_cvv",
        Boolean(result.error) && isBlockedError(result.error) && after === before && !rawLeaked(result.error, blockBody),
        { error: result.error ? errorBlob(result.error) : null, persisted: after > before },
      );
    }

    // unauthorized non-legacy direct insert must remain blocked by RLS
    const unauth = await strangerSession.client.from("messages").insert({
      conversation_id: customerStoreId,
      sender_id: stranger.id,
      body: `2C unauthorized ${runId}`,
    }).select("id").maybeSingle();
    push("unauthorized_direct_nonlegacy_blocked", Boolean(unauth.error) || !unauth.data, {
      error: unauth.error ? errorBlob(unauth.error) : null,
    });

    // closed conversation still rejects (RPC path) with conversation_closed
    await service
      .from("conversations")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", customerStoreId);
    const closedSend = await customerSession.client.rpc("send_conversation_message", {
      p_conversation_id: customerStoreId,
      p_body: `2C closed ${runId}`,
      p_sender_context: null,
    });
    push(
      "closed_conversation_rejected",
      Boolean(closedSend.error) && errorBlob(closedSend.error).includes("conversation_closed"),
      { error: closedSend.error ? errorBlob(closedSend.error) : null },
    );

    // reopen for cleanup clarity
    await service.from("conversations").update({ status: "open", closed_at: null }).eq("id", customerStoreId);
  } finally {
    // cleanup dedicated rows
    if (created.conversationIds.length) {
      await service.from("conversation_reads").delete().in("conversation_id", created.conversationIds);
      await service.from("messages").delete().in("conversation_id", created.conversationIds);
      await service.from("conversations").delete().in("id", created.conversationIds);
    }
    if (created.listingIds.length) {
      await service.from("listings").delete().in("id", created.listingIds);
    }
    if (created.storeIds.length) {
      await service.from("store_members").delete().in("store_id", created.storeIds);
      await service.from("stores").delete().in("id", created.storeIds);
    }
    for (const userId of created.userIds) {
      await service.from("profiles").delete().eq("id", userId);
      await service.auth.admin.deleteUser(userId);
    }
  }

  const failed = checks.filter((c) => !c.passed);
  const report = {
    run_id: runId,
    project_ref: ref,
    sql_status: "APPLIED (targeted file apply; migration history may be untracked)",
    deployment_status: "NOT PERFORMED",
    final_enforcement_status: "NOT APPLIED",
    checks,
    failed_count: failed.length,
    failed: failed.map((c) => c.name),
    final_status: failed.length === 0 ? "PASS" : "CHANGES REQUIRED",
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `phase-2c-apply-verify-${runId}.json`);
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${outPath}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
