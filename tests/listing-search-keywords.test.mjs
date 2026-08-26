import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_LISTING_SEARCH_KEYWORDS,
  parseListingSearchKeywords,
} from "../src/lib/listings/search-keywords.ts";

test("normalizes separators, whitespace, and duplicate terms", () => {
  assert.deepEqual(
    parseListingSearchKeywords("  kansaner,  kondisoner\n12000   btu, AUX, aux  "),
    {
      ok: true,
      value: "kansaner, kondisoner, 12000 btu, AUX",
    },
  );
});

test("accepts an empty optional value", () => {
  assert.deepEqual(parseListingSearchKeywords(undefined), { ok: true, value: "" });
  assert.deepEqual(parseListingSearchKeywords(" , \n "), { ok: true, value: "" });
});

test("rejects too many unique terms", () => {
  const terms = Array.from({ length: MAX_LISTING_SEARCH_KEYWORDS + 1 }, (_, index) => `term-${index}`);
  assert.equal(parseListingSearchKeywords(terms.join(", ")).ok, false);
});

test("rejects terms outside the per-term length range", () => {
  assert.equal(parseListingSearchKeywords("a").ok, false);
  assert.equal(parseListingSearchKeywords("x".repeat(51)).ok, false);
});

test("rejects a canonical value longer than 500 characters without truncating", () => {
  const terms = Array.from(
    { length: 11 },
    (_, index) => `${String(index).padStart(2, "0")}-${"x".repeat(47)}`,
  );
  assert.equal(parseListingSearchKeywords(terms.join(", ")).ok, false);
});
