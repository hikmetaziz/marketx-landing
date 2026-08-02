import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20260714113000_store_support_admin_queue.sql", import.meta.url),
  "utf8",
);

const queueReturn = migration.match(/returns table \(([\s\S]*?)\)\s*language plpgsql/);
assert.ok(queueReturn, "list_admin_support_conversations return shape was not found");
assert.match(migration, /create or replace function public\.list_admin_support_conversations/);
assert.match(migration, /create or replace function public\.get_audited_store_support_conversation/);
assert.match(migration, /create or replace function public\.marktx_can_select_message_after_store_support_audit/);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /where id = p_conversation_id\s+and conversation_type = 'store_support'/);
assert.match(migration, /drop policy if exists "messages_select_accessible_phase2" on public\.messages/);
assert.match(migration, /using \(public\.marktx_can_select_message_after_store_support_audit\(conversation_id\)\)/);
assert.match(migration, /revoke all on function public\.list_admin_support_conversations\(integer, integer\) from public, anon/);
assert.match(migration, /revoke all on function public\.get_audited_store_support_conversation\(uuid, text, jsonb\) from public, anon/);
assert.match(
  migration,
  /revoke all on function public\.marktx_can_select_message_after_store_support_audit\(uuid\) from public, anon/,
);

const returnedColumns = queueReturn[1].toLowerCase();
const returnedColumnNames = returnedColumns
  .split(",")
  .map((line) => line.trim().split(/\s+/)[0])
  .filter(Boolean);
assert.equal(returnedColumnNames.includes("body"), false, "queue summary must not return message body");
assert.equal(returnedColumnNames.includes("message_body"), false, "queue summary must not return message body");
assert.equal(returnedColumnNames.includes("last_message"), false, "queue summary must not return last_message body");

console.log("store-support-admin-queue static checks passed");
