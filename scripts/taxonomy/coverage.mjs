import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { REQUIRED_LEAF_COUNTS, TAXONOMY_VERSION_NAME } from "./marktx-taxonomy-v1.mjs";

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function text(filePath) {
  return readFileSync(resolve(filePath), "utf8");
}

const snapshotPath = resolve(
  readArg("--snapshot", `generated/${TAXONOMY_VERSION_NAME}.json`),
);
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
const errors = [];

for (const parent of snapshot.parents ?? []) {
  const leaves = (parent.groups ?? []).flatMap((group) =>
    (group.leaves ?? []).map((leaf) => ({
      ...leaf,
      group_key: group.key,
      group_label: group.label,
    })),
  );
  const expectedLeafCount = REQUIRED_LEAF_COUNTS.get(parent.key);
  if (typeof expectedLeafCount !== "number") {
    errors.push(`${parent.slug} coverage missing expected leaf count`);
  } else if (leaves.length !== expectedLeafCount) {
    errors.push(`${parent.slug} coverage expected ${expectedLeafCount} leaves`);
  }
  for (const leaf of leaves) {
    if (!leaf.group_key || !leaf.group_label) {
      errors.push(`${parent.slug}:${leaf.slug} missing group metadata`);
    }
  }
}

const files = {
  browse: text("src/app/categories/[slug]/page.tsx"),
  grouped: text("src/components/categories/GroupedSubcategoryGrid.tsx"),
  searchForm: text("src/components/listings/ListingSearchForm.tsx"),
  searchParser: text("src/lib/listings/search.ts"),
  seoSitemap: text("src/app/sitemap.ts"),
  taxonomyRuntime: text("src/lib/taxonomy/marktx-taxonomy.ts"),
  taxonomyFetch: text("src/lib/taxonomy/fetch-listing-taxonomy.ts"),
  createForm: text("src/components/listings/CreateListingForm.tsx"),
  editForm: text("src/components/listings/EditListingForm.tsx"),
};

const requiredMarkers = [
  ["browse", "GroupedSubcategoryGrid"],
  ["grouped", "groupSubcategoriesForDisplay"],
  ["searchForm", "subcategoryOptions"],
  ["searchParser", "subcategory"],
  ["seoSitemap", "getCanonicalLeafRoutes"],
  ["taxonomyRuntime", TAXONOMY_VERSION_NAME],
  ["taxonomyRuntime", "getCanonicalLeafBySlugOrAlias"],
  ["taxonomyFetch", "mergeCanonicalTaxonomySubcategories"],
  ["createForm", "selectedSubcategories"],
  ["editForm", "selectedSubcategories"],
];

for (const [fileKey, marker] of requiredMarkers) {
  if (!files[fileKey].includes(marker)) {
    errors.push(`${fileKey} missing marker ${marker}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`taxonomy_coverage_error=${error}`);
  process.exit(1);
}

console.log(`taxonomy_coverage=pass snapshot=${snapshotPath}`);
