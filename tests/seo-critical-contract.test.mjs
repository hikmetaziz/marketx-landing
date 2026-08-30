import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("legacy listing routes use one-to-one permanent redirects", () => {
  const indexRoute = read("../src/app/listings/page.tsx");
  const detailRoute = read("../src/app/listings/[slug]/page.tsx");
  const nextConfig = read("../next.config.ts");

  assert.match(indexRoute, /permanentRedirect\("\/elanlar"\)/);
  assert.match(detailRoute, /permanentRedirect\(`\/elanlar\/\$\{encodeURIComponent\(slug\)\}`\)/);
  assert.doesNotMatch(indexRoute + detailRoute, /\bredirect\(/);
  assert.match(nextConfig, /source:\s*"\/listings"[\s\S]*?destination:\s*"\/elanlar"[\s\S]*?permanent:\s*true/);
  assert.match(nextConfig, /source:\s*"\/listings\/:slug"[\s\S]*?destination:\s*"\/elanlar\/:slug"[\s\S]*?permanent:\s*true/);
});

test("canonical public URLs consistently use the www host", () => {
  const site = read("../src/constants/data.ts");
  assert.match(site, /url:\s*"https:\/\/www\.marketx\.az"/);
  assert.doesNotMatch(site, /url:\s*"https:\/\/marketx\.az"/);
});

test("public UUID listing URLs redirect to the canonical slug", () => {
  const route = read("../src/app/elanlar/[id]/page.tsx");

  assert.match(route, /if \(isListingUuid\(id\)\)/);
  assert.match(route, /permanentRedirect\(listingCanonicalPath\(liveListing\.slug\)\)/);
  assert.match(route, /listingCanonicalPath\(listingForSeo\?\.slug \?\? id\)/);
  assert.match(route, /export const dynamic = "force-dynamic"/);
});

test("listing JSON-LD uses only an enriched public store as seller", () => {
  const route = read("../src/app/elanlar/[id]/page.tsx");
  const jsonLd = read("../src/lib/listings/listing-json-ld.ts");

  assert.match(route, /seller:\s*listing\.store/);
  assert.match(jsonLd, /listing\.seller\?\.name\.trim\(\)/);
  assert.match(jsonLd, /\/stores\/\$\{encodeURIComponent\(sellerSlug\)\}/);
  assert.doesNotMatch(jsonLd, /seller:\s*\{[\s\S]*?name:\s*SITE\.name/);
  assert.doesNotMatch(jsonLd, /user_id|contact_phone|email/);
});

test("sitemap excludes generated category URLs with unproven indexability", () => {
  const sitemap = read("../src/app/sitemap.ts");

  assert.doesNotMatch(sitemap, /getCatalogueSlugs|getCanonicalLeafRoutes|categoryEntries|leafCategoryEntries/);
  assert.match(sitemap, /\.\.\.listingEntries, \.\.\.storeEntries/);
});

test("every public listing status query excludes explicit sample and test sources", () => {
  const listings = read("../src/lib/listings/live-listings.ts");
  const statusNeedle = '.in("status", PUBLIC_STATUSES)';
  let offset = 0;
  let statusQueryCount = 0;

  while ((offset = listings.indexOf(statusNeedle, offset)) !== -1) {
    const queryTail = listings.slice(offset, offset + 240);
    assert.match(queryTail, /\.eq\("is_sample", false\)/);
    assert.match(queryTail, /\.not\("source", "in", NON_PUBLIC_LISTING_SOURCES\)/);
    statusQueryCount += 1;
    offset += statusNeedle.length;
  }

  assert.ok(statusQueryCount > 0);
  assert.match(listings, /"sample","old_ai_draft","import_test","test"/);
});
