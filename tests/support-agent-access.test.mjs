import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function assertContains(file, pattern, message) {
  assert.match(file, pattern, message);
}

function assertNotContains(file, pattern, message) {
  assert.doesNotMatch(file, pattern, message);
}

function returnsTableColumns(sql, functionName) {
  const match = sql.match(
    new RegExp(`create or replace function public\\.${functionName}[\\s\\S]*?returns table \\(([\\s\\S]*?)\\)\\s*language`, "i"),
  );
  assert.ok(match, `${functionName} return shape was not found`);
  return match[1]
    .toLowerCase()
    .split(",")
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

const migration = read("../supabase/migrations/20260714114500_support_agent_admin_support_access.sql");
const verificationSql = read("../supabase/verification/SUPPORT_AGENT_ACCESS_RLS_TESTS.sql");
const adminSession = read("../src/lib/supabase/admin-session.ts");
const authStore = read("../src/lib/supabase/use-auth-user.ts");
const adminLayout = read("../src/app/admin/layout.tsx");
const adminIndex = read("../src/app/admin/page.tsx");
const supportPage = read("../src/app/admin/support/page.tsx");
const listingsPage = read("../src/app/admin/listings/page.tsx");
const listingDetailPage = read("../src/app/admin/listings/[id]/page.tsx");
const storesPage = read("../src/app/admin/stores/page.tsx");
const storeDetailPage = read("../src/app/admin/stores/[id]/page.tsx");
const storeNewPage = read("../src/app/admin/stores/new/page.tsx");
const listingActions = read("../src/app/admin/listings/actions.ts");
const storeActions = read("../src/app/admin/stores/actions.ts");
const headerAuthActions = read("../src/components/auth/HeaderAuthActions.tsx");

assertContains(migration, /support_agent/, "migration must introduce the support_agent role");
assertContains(migration, /create or replace function public\.marktx_is_admin\(\)/, "admin helper is required");
assertContains(migration, /create or replace function public\.marktx_is_support_staff\(\)/, "support helper is required");
assertContains(
  migration,
  /create or replace function public\.marktx_can_access_support_panel\(\)/,
  "support-panel helper is required",
);
assertContains(migration, /set search_path = ''/i, "security definer functions must pin an empty search_path");
assertContains(
  migration,
  /p\.role in \('admin', 'moderator', 'support_agent'\)/,
  "support helper must allow admin, existing moderator, and support_agent",
);
assertContains(
  migration,
  /if not public\.marktx_can_access_support_panel\(\) then\s+raise exception 'support_access_denied'/,
  "queue/detail RPCs must use the support-panel helper",
);

for (const functionName of ["list_admin_support_conversations", "list_reported_customer_store_conversations"]) {
  const columns = returnsTableColumns(migration, functionName);
  assert.equal(columns.includes("body"), false, `${functionName} must not return message body`);
  assert.equal(columns.includes("message_body"), false, `${functionName} must not return message body`);
  assert.equal(columns.includes("last_message"), false, `${functionName} must not return last message text`);
  assert.equal(columns.includes("messages"), false, `${functionName} must not return message history`);
}

assertContains(
  migration,
  /from public\.conversation_access_audit caa_scope/,
  "customer-store audited detail must require an existing escalation audit when not reported",
);
assertNotContains(
  migration,
  /or\s+p_access_reason\s+in\s+\('escalated', 'moderation', 'legal', 'security', 'support_assignment'\)/,
  "customer-store audited detail must not let an access reason create eligibility for a guessed private chat",
);
assertContains(
  migration,
  /revoke all on function public\.list_admin_support_conversations\(integer, integer\) from public, anon/,
  "support queue RPC must revoke anon/public execution",
);
assertContains(
  migration,
  /revoke all on function public\.list_reported_customer_store_conversations\(integer, integer\) from public, anon/,
  "customer-store queue RPC must revoke anon/public execution",
);

assertContains(adminSession, /role === "admin" \|\| role === "moderator" \|\| role === "support_agent"/, "web support role check is required");
assertContains(adminSession, /export async function requireSupportPanelAccess\(\)/, "server route support guard is required");
assertContains(adminLayout, /requireSupportPanelAccess/, "admin layout should allow support-panel users into the admin shell");
assertContains(adminIndex, /getAdminUser\(\)/, "admin index should route full admins separately");
assertContains(adminIndex, /redirect\("\/admin\/support"\)/, "support users should land on /admin/support");
assertContains(supportPage, /await requireSupportPanelAccess\(\)/, "support page must enforce support access server-side");

for (const [name, file] of [
  ["admin listings page", listingsPage],
  ["admin listing detail page", listingDetailPage],
  ["admin stores page", storesPage],
  ["admin store detail page", storeDetailPage],
  ["admin new store page", storeNewPage],
  ["admin listing actions", listingActions],
  ["admin store actions", storeActions],
]) {
  assertContains(file, /requireAdmin/, `${name} must remain admin-only`);
}

assertContains(authStore, /canAccessSupportPanel/, "client auth store should expose support-panel capability");
assertContains(authStore, /role === "admin" \|\| role === "moderator" \|\| role === "support_agent"/, "client support capability should match server roles");
assertContains(
  headerAuthActions,
  /!isAdmin && canAccessSupportPanel \? \(/,
  "support users should get support-only navigation",
);
assertContains(headerAuthActions, /href="\/admin\/support"/, "support navigation should point to /admin/support");
assertContains(headerAuthActions, /isAdmin \? \([\s\S]*href="\/admin\/listings"/, "listing moderation navigation should remain admin-only");

assertContains(verificationSql, /profiles_role_check_allows_support_agent/, "verification SQL should check role constraint");
assertContains(verificationSql, /support_queues_return_no_message_body_columns/, "verification SQL should check queue return shape");
assertContains(verificationSql, /anon_cannot_execute_support_queue_rpcs/, "verification SQL should check anon RPC denial");

console.log("support-agent-access static checks passed");
