import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chatPanel = readFileSync(new URL("../src/components/messaging/ChatPanel.tsx", import.meta.url), "utf8");
const inboxPanel = readFileSync(new URL("../src/components/messaging/MessagesInboxPanel.tsx", import.meta.url), "utf8");
const adminSupportPanel = readFileSync(new URL("../src/components/admin/AdminSupportPanel.tsx", import.meta.url), "utf8");
const storeMessagingPanel = readFileSync(new URL("../src/components/messaging/StoreMessagingPanel.tsx", import.meta.url), "utf8");
const messagingLib = readFileSync(new URL("../src/lib/messaging/index.ts", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../supabase/migrations/20260718100000_customer_store_conversation_block_rpc.sql", import.meta.url),
  "utf8",
);
const verification = readFileSync(
  new URL("../supabase/verification/BLOCK_CUSTOMER_STORE_CONVERSATION_RLS_TESTS.sql", import.meta.url),
  "utf8",
);

assert.match(chatPanel, /ConversationActionsMenu/);
assert.match(chatPanel, /blockCustomerStoreConversation/);
assert.match(chatPanel, /closeConversation/);
assert.match(chatPanel, /conversation\.conversation_type === "customer_store"/);
assert.match(chatPanel, /onBlock=\{canBlockConversation/);
assert.match(chatPanel, /onClose=\{canCloseConversation/);
assert.match(chatPanel, /onArchive=\{\(\) => void handleArchive\(\)\}/);
assert.match(chatPanel, /setErrorMessage\(messagesRes\.error \?\? ""\)/);
assert.match(chatPanel, /window\.addEventListener\("focus", onVisible\)/);
assert.match(chatPanel, /document\.addEventListener\("visibilitychange", onVisible\)/);
assert.match(chatPanel, /if \(!last\) \{/);

assert.doesNotMatch(inboxPanel, /ConversationActionsMenu/);
assert.doesNotMatch(inboxPanel, /archiveConversationForCurrentUser/);
assert.doesNotMatch(inboxPanel, /Yazışmanı sil/);

assert.doesNotMatch(adminSupportPanel, /ConversationActionsMenu/);
assert.doesNotMatch(adminSupportPanel, /archiveConversationForCurrentUser/);
assert.doesNotMatch(adminSupportPanel, /Yazışmanı sil/);

assert.doesNotMatch(storeMessagingPanel, /ConversationActionsMenu/);
assert.doesNotMatch(storeMessagingPanel, /archiveConversationForCurrentUser/);
assert.doesNotMatch(storeMessagingPanel, /Yazışmanı sil/);

assert.match(messagingLib, /blockCustomerStoreConversation/);
assert.match(storeMessagingPanel, /window\.setInterval\(\(\) => void load\(true\), 10000\)/);
assert.match(storeMessagingPanel, /document\.addEventListener\("visibilitychange", onVisible\)/);
assert.match(adminSupportPanel, /window\.setInterval\(\(\) => void load\(true\), 10000\)/);
assert.match(adminSupportPanel, /document\.addEventListener\("visibilitychange", onVisible\)/);
assert.match(messagingLib, /\.rpc\("block_customer_store_conversation"/);
assert.doesNotMatch(messagingLib, /from\("conversation_blocks"\)\.upsert/);

assert.match(migration, /create or replace function public\.block_customer_store_conversation/);
assert.match(migration, /security definer/);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /conversation_type = 'customer_store'/);
assert.match(migration, /v_user_id = v_conversation\.customer_user_id/);
assert.match(migration, /public\.marktx_store_member_has_role/);
assert.match(migration, /public\.marktx_is_support_admin/);
assert.match(migration, /v_conversation\.reported_at is not null/);
assert.match(migration, /from public\.conversation_access_audit caa/);
assert.match(migration, /caa\.actor_id = v_user_id/);
assert.match(migration, /status = 'closed'/);
assert.doesNotMatch(migration, /delete from public\.messages/i);
assert.match(migration, /revoke all on function public\.block_customer_store_conversation\(uuid, text\) from public, anon/);
assert.match(migration, /grant execute on function public\.block_customer_store_conversation\(uuid, text\) to authenticated/);

assert.match(verification, /anon_cannot_execute/);
assert.match(verification, /authenticated_can_execute/);
assert.match(verification, /support_block_is_reported_or_audited_only/);

console.log("messaging block UI and migration static checks passed");
