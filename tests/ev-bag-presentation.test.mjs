import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_MEISET_CATEGORY_SLUG,
  EV_BAG_CATEGORY_SLUG,
  EV_BAG_MEISET_ALIAS_ID,
  EV_BAG_TARGET_SUBCATEGORY_SLUGS,
  getEvBagAliasHref,
  getEvBagPresentationSubcategories,
  resolveEvBagMeisetAliasCategoryId,
} from "../src/lib/taxonomy/ev-bag-presentation.ts";

const legacySubcategories = [
  { id: "mebel-id", slug: "mebel", name: "Mebel", sort_order: 10 },
  { id: "legacy-appliance-id", slug: "meiset-texnikasi", name: "Məişət texnikası", sort_order: 20 },
  { id: "legacy-decor-id", slug: "ev-dekoru", name: "Ev dekoru", sort_order: 30 },
  { id: "legacy-repair-id", slug: "temir-aletleri", name: "Təmir alətləri", sort_order: 40 },
  { id: "legacy-garden-id", slug: "bag-heyet", name: "Bağ / həyət", sort_order: 50 },
  { id: "legacy-kitchen-id", slug: "metbex-esyalari", name: "Mətbəx əşyaları", sort_order: 60 },
];

const targetNames = [
  "Bağ və bostan",
  "Bitkilər",
  "Dekor və interyer",
  "Qida və ərzaq",
  "Ev və bağ üçün işıqlandırma",
  "Ev tekstili",
  "Ev təsərrüfatı malları",
  "Mebel",
  "Qab-qacaq və mətbəx ləvazimatları",
  "Təmir və tikinti",
  "Xalçalar və aksesuarlar",
];

const targetSubcategories = EV_BAG_TARGET_SUBCATEGORY_SLUGS.map((slug, index) => ({
  id: slug === "mebel" ? "mebel-id" : `${slug}-id`,
  slug,
  name: targetNames[index],
  sort_order: (index + 1) * 10,
}));

test("preserves the existing Ev və bağ presentation until every target row exists", () => {
  assert.deepEqual(
    getEvBagPresentationSubcategories(EV_BAG_CATEGORY_SLUG, legacySubcategories),
    legacySubcategories,
  );
});

test("shows exactly 11 target rows plus the synthetic Məişət alias after migration", () => {
  const presentation = getEvBagPresentationSubcategories(EV_BAG_CATEGORY_SLUG, [
    ...legacySubcategories.filter((subcategory) => subcategory.slug !== "mebel"),
    ...targetSubcategories,
  ]);

  assert.equal(presentation.length, 12);
  assert.deepEqual(
    presentation.map((item) => item.slug),
    [
      ...EV_BAG_TARGET_SUBCATEGORY_SLUGS.slice(0, 8),
      CANONICAL_MEISET_CATEGORY_SLUG,
      ...EV_BAG_TARGET_SUBCATEGORY_SLUGS.slice(8),
    ],
  );
  assert.equal(presentation[8]?.id, EV_BAG_MEISET_ALIAS_ID);
  assert.deepEqual(presentation.map((item) => item.name), [
    ...targetNames.slice(0, 8),
    "Məişət",
    ...targetNames.slice(8),
  ]);
  assert.equal(presentation.find((item) => item.slug === "mebel")?.id, "mebel-id");
  assert.equal(presentation.some((item) => item.id.startsWith("legacy-")), false);
});

test("resolves the Məişət choice to the canonical category without a production UUID", () => {
  const categories = [
    { id: "ev-bag-id", slug: EV_BAG_CATEGORY_SLUG },
    { id: "canonical-meiset-id", slug: CANONICAL_MEISET_CATEGORY_SLUG },
  ];

  assert.equal(
    resolveEvBagMeisetAliasCategoryId(EV_BAG_MEISET_ALIAS_ID, categories),
    "canonical-meiset-id",
  );
  assert.equal(resolveEvBagMeisetAliasCategoryId("ordinary-subcategory-id", categories), null);
  assert.equal(
    getEvBagAliasHref(EV_BAG_CATEGORY_SLUG, CANONICAL_MEISET_CATEGORY_SLUG),
    "/categories/meiset-texnikasi",
  );
});

test("alias and standalone paths select the same canonical Kondisionerlər IDs", () => {
  const canonicalCategory = {
    id: "canonical-meiset-id",
    slug: CANONICAL_MEISET_CATEGORY_SLUG,
    subcategories: [
      { id: "kondisionerler-id", slug: "kondisionerler", name: "Kondisionerlər", sort_order: 30 },
    ],
  };
  const categories = [{ id: "ev-bag-id", slug: EV_BAG_CATEGORY_SLUG }, canonicalCategory];
  const aliasCategoryId = resolveEvBagMeisetAliasCategoryId(EV_BAG_MEISET_ALIAS_ID, categories);
  const aliasSubcategoryId = canonicalCategory.subcategories.find(
    (subcategory) => subcategory.slug === "kondisionerler",
  )?.id;

  assert.equal(aliasCategoryId, canonicalCategory.id);
  assert.equal(aliasSubcategoryId, canonicalCategory.subcategories[0]?.id);
});
