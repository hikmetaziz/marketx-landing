/**
 * Security Remediation 2C — sensitive credential blocking runtime checks.
 *
 * Safe to run before apply: exits with SQL status PREPARED, NOT APPLIED.
 * After apply: classifier matrix + insert/update trigger checks.
 *
 * Does NOT run: supabase db push / migration apply.
 *
 * Usage (from marketx-landing):
 *   node scripts/messaging-runtime/phase-2c-sensitive-credentials-checks.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const CURRENT_ENV = path.join(ROOT, ".env.local");
const OUT_DIR = path.join(ROOT, "exports", "messaging-runtime-test");
const EXPECTED_PROJECT_REF = "vrtnxdexofpiapbodxkx";
const CLASSIFIER_FN = "marktx_classify_message_sensitive_credentials";
const STABLE_ERROR = "message_sensitive_credentials_blocked";

/** @type {{ label: string, body: string, expected: string | null }[]} */
const CLASSIFIER_MATRIX = [
  { label: "card_number_only", body: "Kart nomrem: 4111111111111111", expected: null },
  { label: "card_number_request", body: "Odeyis ucun kart nomrenizi yazin", expected: null },
  { label: "iban_only", body: "IBAN: AZ21NABZ00000000137010001944", expected: null },
  { label: "bank_account", body: "Hesab nomresi 123456789012", expected: null },
  { label: "phone", body: "Telefon: +994501234567", expected: null },
  { label: "price", body: "Qiymet 250 AZN", expected: null },
  { label: "date", body: "Catdirilma 19.07.2026", expected: null },
  { label: "listing_number", body: "Elan nomresi 10482", expected: null },
  { label: "ordinary", body: "Salam, mehsul movcuddur?", expected: null },
  { label: "cvv_request", body: "Kartin CVV kodunu yazin", expected: "cvv" },
  { label: "cvc_share", body: "CVC 123", expected: "cvv" },
  { label: "pin_request", body: "PIN kodunuzu gonderin", expected: "pin" },
  { label: "otp_sms", body: "SMS kodu atin", expected: "otp" },
  { label: "otp_en", body: "Send the OTP / verification code", expected: "otp" },
  { label: "bank_password", body: "Mobile banking password lazimdir", expected: "banking_password" },
  { label: "card_photo", body: "Kartin uz ve arxa terefinin fotosunu gonderin", expected: "card_photo" },
  {
    label: "card_auth_combo",
    body: "Kart nomresi 4111111111111111 ve SKT 12/28",
    expected: "card_auth_combo",
  },
  {
    label: "card_terms_expiry",
    body: "Kart nomrenizi ve son istifade tarixini yazin",
    expected: "card_auth_combo",
  },
];

/**
 * Expected runtime error matrix (after apply).
 * Paths covered by the BEFORE INSERT/UPDATE trigger, not RPC-only checks.
 */
const EXPECTED_ERROR_MATRIX = [
  {
    path: "send_conversation_message (customer_store / support / store_support / admin reply)",
    body: "CVV 123",
    expect: STABLE_ERROR,
    persist: false,
  },
  {
    path: "legacy_user_user direct insert",
    body: "PIN kod 4455",
    expect: STABLE_ERROR,
    persist: false,
  },
  {
    path: "edit_conversation_message (UPDATE body)",
    body: "SMS kodu 948221",
    expect: STABLE_ERROR,
    persist: false,
  },
  {
    path: "any insert with card number only",
    body: "4111111111111111",
    expect: "ALLOW (no sensitive block)",
    persist: true,
  },
  {
    path: "closed conversation",
    body: "salam",
    expect: "conversation_closed (unchanged; evaluated before insert)",
    persist: false,
  },
  {
    path: "empty body",
    body: "   ",
    expect: "message_body_required (RPC) / body check (legacy)",
    persist: false,
  },
];

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

function errorBlob(error) {
  return [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" | ");
}

function containsStableError(error) {
  return errorBlob(error).includes(STABLE_ERROR);
}

function containsRawSecret(error, body) {
  const blob = errorBlob(error).toLowerCase();
  const needles = body
    .toLowerCase()
    .split(/[^a-z0-9а-яё]+/i)
    .filter((part) => part.length >= 4);
  return needles.some((part) => /\d/.test(part) && blob.includes(part));
}

async function classifierExists(service) {
  const { error } = await service.rpc(CLASSIFIER_FN, { p_body: "ping" });
  if (!error) return true;
  const blob = errorBlob(error).toLowerCase();
  if (blob.includes("could not find the function") || blob.includes("pgrst202") || blob.includes("404")) {
    return false;
  }
  // Function exists but returned a SQL/runtime error — still counts as applied.
  if (blob.includes(CLASSIFIER_FN) && blob.includes("does not exist")) return false;
  return true;
}

async function classify(service, body) {
  const { data, error } = await service.rpc(CLASSIFIER_FN, { p_body: body });
  if (error) throw new Error(`classify failed: ${errorBlob(error)}`);
  return data ?? null;
}

async function findAnyConversation(service) {
  const { data, error } = await service
    .from("conversations")
    .select("id, conversation_type, buyer_id, seller_id, customer_user_id")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`find conversation: ${error.message}`);
  return data;
}

async function countMessagesWithBody(service, conversationId, body) {
  const { count, error } = await service
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("body", body);
  if (error) throw new Error(`count messages: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const env = await loadEnv(CURRENT_ENV);
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const ref = projectRefFromUrl(url);
  if (ref !== EXPECTED_PROJECT_REF) {
    throw new Error(`Unexpected project ref ${ref}; expected ${EXPECTED_PROJECT_REF}`);
  }

  const service = createServiceClient(env);
  const runId = crypto.randomBytes(4).toString("hex");
  const results = [];
  const applied = await classifierExists(service);

  const reportBase = {
    run_id: runId,
    project_ref: ref,
    sql_status: applied ? "APPLIED_IN_TARGET" : "PREPARED, NOT APPLIED",
    deployment_status: "NOT PERFORMED_BY_THIS_SCRIPT",
    enforcement_status: "FINAL ENFORCEMENT NOT APPLIED",
    expected_error_matrix: EXPECTED_ERROR_MATRIX,
  };

  if (!applied) {
    const report = {
      ...reportBase,
      final_status: "READY FOR SQL REVIEW",
      note: "Classifier/trigger not present in linked DB. Migration file is prepared only.",
      classifier_matrix: "SKIPPED",
      insert_checks: "SKIPPED",
    };
    await mkdir(OUT_DIR, { recursive: true });
    const outPath = path.join(OUT_DIR, `phase-2c-sensitive-credentials-${runId}.json`);
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
    console.log(`Wrote ${outPath}`);
    return;
  }

  for (const sample of CLASSIFIER_MATRIX) {
    const actual = await classify(service, sample.body);
    const pass = actual === sample.expected;
    results.push({
      kind: "classifier",
      label: sample.label,
      expected: sample.expected,
      actual,
      pass,
    });
  }

  const conversation = await findAnyConversation(service);
  if (!conversation) {
    results.push({
      kind: "insert",
      label: "fixture_conversation",
      pass: false,
      detail: "No conversation row available for trigger insert checks",
    });
  } else {
    const senderId =
      conversation.customer_user_id ?? conversation.buyer_id ?? conversation.seller_id;
    const blockedBody = `2C block probe ${runId} CVV 321`;
    const allowedBody = `2C allow probe ${runId} qiymet 10 AZN`;

    const beforeBlocked = await countMessagesWithBody(service, conversation.id, blockedBody);
    const { data: blockedInsert, error: blockedError } = await service.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: senderId,
      body: blockedBody,
      sender_context: "customer",
    }).select("id").maybeSingle();

    const afterBlocked = await countMessagesWithBody(service, conversation.id, blockedBody);
    const blockedPass =
      Boolean(blockedError) &&
      containsStableError(blockedError) &&
      !blockedInsert &&
      afterBlocked === beforeBlocked &&
      !containsRawSecret(blockedError, blockedBody);

    results.push({
      kind: "insert_block",
      label: "direct_insert_cvv",
      pass: blockedPass,
      error: blockedError ? errorBlob(blockedError) : null,
      persisted: afterBlocked > beforeBlocked,
    });

    const { data: allowedInsert, error: allowedError } = await service
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: senderId,
        body: allowedBody,
        sender_context: "customer",
      })
      .select("id")
      .maybeSingle();

    const allowedPass = !allowedError && Boolean(allowedInsert?.id);
    results.push({
      kind: "insert_allow",
      label: "direct_insert_ordinary",
      pass: allowedPass,
      error: allowedError ? errorBlob(allowedError) : null,
      message_id: allowedInsert?.id ?? null,
    });

    if (allowedInsert?.id) {
      const editBody = `2C edit block ${runId} SMS kodu 112233`;
      const { error: editError } = await service
        .from("messages")
        .update({ body: editBody })
        .eq("id", allowedInsert.id)
        .select("id")
        .maybeSingle();

      const editPass = Boolean(editError) && containsStableError(editError) && !containsRawSecret(editError, editBody);
      results.push({
        kind: "update_block",
        label: "direct_update_otp",
        pass: editPass,
        error: editError ? errorBlob(editError) : null,
      });

      await service.from("messages").delete().eq("id", allowedInsert.id);
    }
  }

  const failed = results.filter((row) => !row.pass);
  const report = {
    ...reportBase,
    results,
    failed_count: failed.length,
    final_status: failed.length === 0 ? "READY FOR SQL REVIEW" : "CHANGES REQUIRED",
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `phase-2c-sensitive-credentials-${runId}.json`);
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${outPath}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
