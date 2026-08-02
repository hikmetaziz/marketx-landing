import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readMobile = (path) =>
  readFileSync(join("F:/projects/mobile_apps/marktx-app", path), "utf8");

const createAction = read("src/app/create-listing/actions.ts");
const createPage = read("src/app/elan-yarat/page.tsx");
const createForm = read("src/components/listings/CreateListingForm.tsx");
const validation = read("src/lib/listings/create-listing-validation.ts");
const membership = read("src/lib/stores/membership.ts");
const accountListingActions = read("src/app/account/listings/actions.ts");
const listingInsertMigration = read(
  "supabase/migrations/20260720120000_restrict_listing_insert_to_store_members.sql",
);
const listingInsertVerification = read("supabase/verification/LISTING_CREATION_ACCESS_RLS_VERIFY.sql");
const listingInsertRollback = read(
  "supabase/manual-rollbacks/20260720120000_restrict_listing_insert_to_store_members_rollback.sql",
);
const mobileCreateListing = readMobile("app/(tabs)/create-listing.tsx");
const mobileListingStore = readMobile("lib/stores/listing-store.ts");

assert.match(createPage, /getListingCreationStoreAccess\(supabase, user\.id\)/);
assert.match(createPage, /if \(!storeAccess\.ok\)/);
assert.match(createPage, /storeAccess=\{storeAccess\}/);

assert.match(validation, /requireStoreId\?: boolean/);
assert.match(validation, /options\.requireStoreId && !storeId/);
assert.match(validation, /if \(storeId && !isUuid\(storeId\)\)/);

assert.match(membership, /\.from\("store_members"\)/);
assert.match(membership, /\.in\("role", \[\.\.\.ACTIVE_STORE_MEMBER_ROLES\]\)/);
assert.match(membership, /\.from\("stores"\)/);
assert.match(membership, /\.eq\("status", CLAIMED_STORE_STATUS\)/);

assert.match(createAction, /parseCreateListingInput\(input, \{ requireStoreId: true \}\)/);
assert.match(createAction, /canCreateListingForStore\(supabase, targetStoreId, user\.id\)/);
assert.match(createAction, /store_id: targetStoreId/);
assert.match(createAction, /store_id: basePayload\.store_id/);

assert.match(createForm, /storeAccess: \{/);
assert.match(createForm, /storeId: storeAccess\.storeId/);

assert.match(accountListingActions, /select\(\s*"id, user_id, store_id,/);
assert.match(accountListingActions, /canCreateListingForStore\(supabase, storeId, user\.id\)/);
assert.match(accountListingActions, /store_id: storeId/);
assert.match(accountListingActions, /store_id: duplicatePayload\.store_id/);

assert.match(mobileCreateListing, /import \{ isActiveStoreMember \}/);
assert.match(mobileCreateListing, /sellerProfileLoaded && !canCreateStoreListing/);
assert.match(mobileCreateListing, /!canCreateStoreListing \|\| !myStore\?\.id/);
assert.match(mobileCreateListing, /isActiveStoreMember\(myStore\.id, session\.user\.id\)/);
assert.match(mobileCreateListing, /const storeListingId = myStore\.id/);
assert.match(mobileCreateListing, /store_id: storeListingId/);
assert.doesNotMatch(mobileCreateListing, /\.\.\.\(storeListingId \? \{ store_id: storeListingId \} : \{\}\)/);
assert.doesNotMatch(mobileCreateListing, /publishAsStore/);
assert.match(mobileListingStore, /store\.status === 'claimed'/);
assert.doesNotMatch(mobileListingStore, /store\.owner_id/);

assert.match(listingInsertMigration, /drop policy if exists "listings_insert_own"/);
assert.match(listingInsertMigration, /create policy "listings_insert_store_member"/);
assert.match(listingInsertMigration, /auth\.uid\(\) = user_id/);
assert.match(listingInsertMigration, /store_id is not null/);
assert.match(listingInsertMigration, /s\.status = 'claimed'/);
assert.match(listingInsertMigration, /m\.role in \('owner', 'manager', 'staff'\)/);
assert.match(listingInsertMigration, /p\.role in \('admin', 'moderator'\)/);
assert.doesNotMatch(listingInsertMigration, /with check \(auth\.uid\(\) = user_id\)/);

assert.match(listingInsertVerification, /old_broad_insert_policy_absent/);
assert.match(listingInsertVerification, /store_member_insert_policy_present/);
assert.match(listingInsertVerification, /listing_creation_access_rls_verification_failed/);
assert.match(listingInsertVerification, /public\.listings/);
assert.match(listingInsertVerification, /public\.store_members/);
assert.doesNotMatch(listingInsertVerification, /insert into|update public|delete from|truncate/i);

assert.match(listingInsertRollback, /drop policy if exists "listings_insert_store_member"/);
assert.match(listingInsertRollback, /create policy "listings_insert_own"/);
assert.match(listingInsertRollback, /with check \(auth\.uid\(\) = user_id\)/);
assert.doesNotMatch(listingInsertRollback, /drop table|delete from|truncate|alter table/i);

console.log("listing creation access static checks passed");
