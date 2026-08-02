import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chatPanel = readFileSync(new URL("../src/components/messaging/ChatPanel.tsx", import.meta.url), "utf8");
const messagingLib = readFileSync(new URL("../src/lib/messaging/index.ts", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../supabase/migrations/20260718101000_message_edit_delete_rpc.sql", import.meta.url),
  "utf8",
);
const verification = readFileSync(new URL("../supabase/verification/MESSAGE_EDIT_DELETE_RLS_TESTS.sql", import.meta.url), "utf8");

assert.match(chatPanel, /editConversationMessage/);
assert.match(chatPanel, /deleteConversationMessageText/);
assert.match(chatPanel, /editingMessageId/);
assert.match(chatPanel, /MoreHorizontal/);
assert.match(chatPanel, /function MessageActionsMenu/);
assert.match(chatPanel, /Düzəlt/);
assert.match(chatPanel, /Sil/);
assert.match(chatPanel, /Mesaj silindi/);
assert.match(chatPanel, /Düzəldildi/);
assert.match(chatPanel, /conversation\.can_send/);

assert.match(messagingLib, /\.rpc\("edit_conversation_message"/);
assert.match(messagingLib, /\.rpc\("delete_conversation_message_text"/);
assert.match(messagingLib, /event: "UPDATE"/);
assert.doesNotMatch(messagingLib, /\.from\("messages"\)\.update/);
assert.doesNotMatch(messagingLib, /\.from\("messages"\)\.delete/);

assert.match(migration, /create or replace function public\.edit_conversation_message/);
assert.match(migration, /create or replace function public\.delete_conversation_message_text/);
assert.match(migration, /security definer/g);
assert.match(migration, /set search_path = ''/g);
assert.match(migration, /sender_id <> v_user_id/);
assert.match(migration, /public\.marktx_can_access_conversation/);
assert.match(migration, /conversation_type = 'legacy_user_user'/);
assert.match(migration, /status in \('resolved', 'closed'\)/);
assert.match(migration, /body = 'Mesaj silindi'/);
assert.match(migration, /edited_at/);
assert.match(migration, /deleted_at/);
assert.doesNotMatch(migration, /delete from public\.messages/i);
assert.doesNotMatch(migration, /create policy .*messages.*update/i);
assert.doesNotMatch(migration, /create policy .*messages.*delete/i);
assert.match(migration, /revoke all on function public\.edit_conversation_message\(uuid, text\) from public, anon/);
assert.match(migration, /revoke all on function public\.delete_conversation_message_text\(uuid\) from public, anon/);
assert.match(migration, /grant execute on function public\.edit_conversation_message\(uuid, text\) to authenticated/);
assert.match(migration, /grant execute on function public\.delete_conversation_message_text\(uuid\) to authenticated/);

assert.match(verification, /sender_ownership_required/);
assert.match(verification, /delete_is_soft_delete_only/);
assert.match(verification, /anon_cannot_execute_edit/);
assert.match(verification, /anon_cannot_execute_delete/);

console.log("message edit/delete static checks passed");
