import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/20260903120000_private_support_attachments.sql");
const upload = read("src/lib/messaging/support-attachments.ts");
const references = read("src/lib/messaging/support-attachment-references.ts");
const chatPanel = read("src/components/messaging/ChatPanel.tsx");
const adminActions = read("src/app/admin/stores/actions.ts");
const storeApplicationForm = read("src/components/store/NewStoreApplicationForm.tsx");
const listingUpload = read("src/lib/listings/upload.ts");

assert.match(migration, /'support-attachments',\s*'support-attachments',\s*false/);
assert.match(migration, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
assert.match(migration, /security definer[\s\S]*set search_path = ''/);
assert.match(migration, /return public\.marktx_can_access_conversation\(v_conversation_id\)/);
assert.match(migration, /v_conversation_type not in \('customer_support', 'store_support'\)/);
assert.match(migration, /for select\s+to authenticated/);
assert.match(migration, /for insert\s+to authenticated[\s\S]*\(storage\.foldername\(name\)\)\[2\] = auth\.uid\(\)::text/);
assert.match(migration, /for delete\s+to authenticated[\s\S]*public\.marktx_is_support_admin\(\)/);
assert.doesNotMatch(migration, /for update\s+to authenticated/i);
assert.doesNotMatch(migration, /to anon/);

assert.match(upload, /const path = `\$\{conversationId\}\/\$\{userId\}\/\$\{token\}\.\$\{ext\}`/);
assert.match(upload, /\.from\(SUPPORT_ATTACHMENTS_BUCKET\)[\s\S]*\.upload\(path, blob, \{ contentType, upsert: false \}\)/);
assert.doesNotMatch(upload, /getPublicUrl/);
assert.doesNotMatch(upload, /\.from\("listing-images"\)/);
assert.match(references, /SUPPORT_ATTACHMENT_REFERENCE_PREFIX = "support-attachment:"/);
assert.match(chatPanel, /createSignedUrl\(path, SUPPORT_ATTACHMENT_SIGNED_URL_TTL_SECONDS\)/);
assert.match(adminActions, /supportAttachmentReferenceToPath\(source\)/);
assert.match(adminActions, /url\.protocol === "https:" \|\| url\.protocol === "http:"/);
assert.match(storeApplicationForm, /const messageResult = await sendConversationMessage\(/);
assert.match(storeApplicationForm, /if \(messageResult\.error\) \{[\s\S]*removeSupportAttachments\(\[\.\.\.logoUpload\.paths, \.\.\.coverUpload\.paths\]\)/);

assert.match(listingUpload, /\.from\("listing-images"\)/);
assert.match(listingUpload, /getPublicUrl/);

console.log("private support attachment static checks passed");
