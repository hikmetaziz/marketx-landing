type PresentableSubcategory = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

type CategoryReference = {
  id: string;
  slug: string;
};

export const EV_BAG_CATEGORY_SLUG = "ev-ve-bag";
export const CANONICAL_MEISET_CATEGORY_SLUG = "meiset-texnikasi";
export const EV_BAG_MEISET_ALIAS_ID = "category-alias:meiset-texnikasi";

export const EV_BAG_TARGET_SUBCATEGORY_SLUGS = [
  "bag-ve-bostan",
  "bitkiler",
  "dekor-ve-interyer",
  "qida-ve-erzaq",
  "ev-ve-bag-ucun-isiqlandirma",
  "ev-tekstili",
  "ev-teserrufati-mallari",
  "mebel",
  "qab-qacaq-ve-metbex-levazimatlari",
  "temir-ve-tikinti",
  "xalcalar-ve-aksesuarlar",
] as const;

const MEISET_ALIAS: PresentableSubcategory = {
  id: EV_BAG_MEISET_ALIAS_ID,
  slug: CANONICAL_MEISET_CATEGORY_SLUG,
  name: "Məişət",
  sort_order: 90,
};

export function hasCompleteEvBagTaxonomy(subcategories: readonly PresentableSubcategory[]): boolean {
  const slugs = new Set(subcategories.map((subcategory) => subcategory.slug));
  return EV_BAG_TARGET_SUBCATEGORY_SLUGS.every((slug) => slugs.has(slug));
}

export function getEvBagPresentationSubcategories<T extends PresentableSubcategory>(
  categorySlug: string,
  subcategories: readonly T[],
): Array<T | PresentableSubcategory> {
  if (categorySlug !== EV_BAG_CATEGORY_SLUG || !hasCompleteEvBagTaxonomy(subcategories)) {
    return [...subcategories];
  }

  const bySlug = new Map(subcategories.map((subcategory) => [subcategory.slug, subcategory]));
  const presentation: Array<T | PresentableSubcategory> = [];

  for (const slug of EV_BAG_TARGET_SUBCATEGORY_SLUGS) {
    const subcategory = bySlug.get(slug);
    if (!subcategory) {
      return [...subcategories];
    }
    presentation.push(subcategory);
    if (slug === "mebel") {
      presentation.push(MEISET_ALIAS);
    }
  }

  return presentation;
}

export function isEvBagMeisetAliasId(value: string): boolean {
  return value === EV_BAG_MEISET_ALIAS_ID;
}

export function resolveEvBagMeisetAliasCategoryId(
  selectedSubcategoryId: string,
  categories: readonly CategoryReference[],
): string | null {
  if (!isEvBagMeisetAliasId(selectedSubcategoryId)) {
    return null;
  }

  return categories.find((category) => category.slug === CANONICAL_MEISET_CATEGORY_SLUG)?.id ?? null;
}

export function getEvBagAliasHref(categorySlug: string, subcategorySlug: string): string | null {
  return categorySlug === EV_BAG_CATEGORY_SLUG && subcategorySlug === CANONICAL_MEISET_CATEGORY_SLUG
    ? `/categories/${CANONICAL_MEISET_CATEGORY_SLUG}`
    : null;
}
