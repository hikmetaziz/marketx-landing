import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const webChat = readFileSync(new URL("../src/components/messaging/ChatPanel.tsx", import.meta.url), "utf8");
const webMessaging = readFileSync(new URL("../src/lib/messaging/index.ts", import.meta.url), "utf8");
const webTypes = readFileSync(new URL("../src/types/message.ts", import.meta.url), "utf8");
const webListingButton = readFileSync(new URL("../src/components/messaging/ListingMessageButton.tsx", import.meta.url), "utf8");

const mobileRoot = "F:/projects/mobile_apps/marktx-app";
const mobileChat = readFileSync(`${mobileRoot}/app/chat/[id].tsx`, "utf8");
const mobileMessaging = readFileSync(`${mobileRoot}/lib/messaging/index.ts`, "utf8");
const mobileTypes = readFileSync(`${mobileRoot}/types/message.ts`, "utf8");

const closedBanner = "Bu söhbət bağlanıb. Yeni mesaj göndərmək mümkün deyil.";
const legacyBanner = "Bu köhnə yazışma yalnız oxuma rejimindədir.";
const unavailableBanner = "Bu məhsul artıq aktiv deyil. Əvvəlki yazışmanı davam etdirə bilərsiniz.";

for (const [name, source] of [
  ["web chat", webChat],
  ["mobile chat", mobileChat],
]) {
  assert.match(source, new RegExp(closedBanner), `${name}: missing closed/resolved banner`);
  assert.match(source, new RegExp(legacyBanner), `${name}: missing legacy read-only banner`);
  assert.match(source, new RegExp(unavailableBanner), `${name}: missing unavailable listing banner`);
  assert.match(source, /conversation\.conversation_type === ['"]legacy_user_user['"]/);
  assert.match(source, /conversation\.status === ['"]closed['"] \|\| conversation\.status === ['"]resolved['"]/);
  assert.match(source, /listing_availability_status === ['"]unavailable['"]/);
  assert.match(source, /listing_status !== ['"]active['"]/);
  assert.match(source, /lastFailedDraft && conversation\.can_send/, `${name}: retry must stay hidden for read-only states`);
}

for (const source of [webMessaging, mobileMessaging]) {
  assert.match(source, /listings \( title, price, status, availability_status, slug, image_url, image_urls \)/);
  assert.match(source, /listing_status: listing\?\.status \?\? null/);
  assert.match(source, /listing_availability_status: listing\?\.availability_status \?\? null/);
  assert.match(source, /can_send: !legacy && .*status !== ['"]closed['"] && .*status !== ['"]resolved['"]/s);
}

for (const [name, source] of [
  ["web types", webTypes],
  ["mobile types", mobileTypes],
]) {
  assert.match(source, /listing_status: string \| null;/, `${name}: missing listing_status`);
  assert.match(source, /listing_availability_status: string \| null;/, `${name}: missing listing_availability_status`);
}

assert.match(webListingButton, /status === "sold"/, "new chat from sold listing must remain blocked on web listing detail");

console.log("messaging UX state checks passed");
