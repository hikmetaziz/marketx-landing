import taxonomySnapshot from "../../../generated/marktx-taxonomy-auto-phone-electronics-v1.json";

import type { SubcategoryEntry } from "@/lib/taxonomy/catalogue-types";
import type { TaxonomySubcategory } from "@/lib/taxonomy/listing-taxonomy-types";

export const MARKTX_TAXONOMY_VERSION_NAME = "marktx-taxonomy-auto-phone-electronics-v1";

export type MarktxTaxonomyLeaf = {
  slug: string;
  name: string;
  order: number;
  aliases: string[];
};

export type MarktxTaxonomyGroup = {
  key: string;
  label: string;
  order: number;
  leaves: MarktxTaxonomyLeaf[];
};

export type MarktxTaxonomyParent = {
  key: "automobile" | "auto_parts" | "phone" | "electronics";
  slug: string;
  name: string;
  sort_order: number;
  icon_key: string;
  catalogue_image_path: string;
  color_hex: string;
  aliases: string[];
  groups: MarktxTaxonomyGroup[];
};

export type MarktxTaxonomySnapshot = {
  version: number;
  version_name: typeof MARKTX_TAXONOMY_VERSION_NAME;
  generated_from: string;
  parents: MarktxTaxonomyParent[];
};

export type CanonicalLeafRoute = {
  categorySlug: string;
  categoryName: string;
  subcategorySlug: string;
  subcategoryName: string;
};

export type GroupedSubcategories = {
  key: string;
  label: string;
  order: number;
  subcategories: SubcategoryEntry[];
};

const snapshot = taxonomySnapshot as MarktxTaxonomySnapshot;
const SYNTHETIC_ID_PREFIX = "canonical:";

function normalizeSlug(value: string): string {
  return value.trim().toLocaleLowerCase("az");
}

export function getCanonicalTaxonomySnapshot(): MarktxTaxonomySnapshot {
  return snapshot;
}

export function getCanonicalParents(): MarktxTaxonomyParent[] {
  return snapshot.parents;
}

export function getCanonicalParentBySlug(slug: string): MarktxTaxonomyParent | null {
  const normalized = normalizeSlug(slug);
  return snapshot.parents.find((parent) => parent.slug === normalized) ?? null;
}

export function getCanonicalParentBySlugOrAlias(slugOrAlias: string): MarktxTaxonomyParent | null {
  const normalized = normalizeSlug(slugOrAlias);
  return (
    snapshot.parents.find(
      (parent) => parent.slug === normalized || parent.aliases.some((alias) => normalizeSlug(alias) === normalized),
    ) ?? null
  );
}

export function isCanonicalParentSlug(slug: string): boolean {
  return getCanonicalParentBySlug(slug) !== null;
}

export function getCanonicalLeavesByParentSlug(categorySlug: string): Array<MarktxTaxonomyLeaf & {
  parent_slug: string;
  parent_name: string;
  group_key: string;
  group_label: string;
  group_order: number;
}> {
  const parent = getCanonicalParentBySlug(categorySlug);
  if (!parent) {
    return [];
  }

  return parent.groups
    .flatMap((group) =>
      group.leaves.map((leaf) => ({
        ...leaf,
        parent_slug: parent.slug,
        parent_name: parent.name,
        group_key: group.key,
        group_label: group.label,
        group_order: group.order,
      })),
    )
    .sort((left, right) => left.order - right.order || left.slug.localeCompare(right.slug));
}

export function getCanonicalLeafBySlug(
  categorySlug: string,
  subcategorySlug: string,
): ReturnType<typeof getCanonicalLeavesByParentSlug>[number] | null {
  const normalized = normalizeSlug(subcategorySlug);
  return getCanonicalLeavesByParentSlug(categorySlug).find((leaf) => leaf.slug === normalized) ?? null;
}

export function getCanonicalLeafBySlugOrAlias(
  categorySlug: string,
  subcategorySlugOrAlias: string,
): ReturnType<typeof getCanonicalLeavesByParentSlug>[number] | null {
  const normalized = normalizeSlug(subcategorySlugOrAlias);
  return (
    getCanonicalLeavesByParentSlug(categorySlug).find(
      (leaf) => leaf.slug === normalized || leaf.aliases.some((alias) => normalizeSlug(alias) === normalized),
    ) ?? null
  );
}

export function isCanonicalSubcategoryForParent(categorySlug: string, subcategorySlug: string): boolean {
  return getCanonicalLeafBySlugOrAlias(categorySlug, subcategorySlug) !== null;
}

export function getCanonicalLeafRoutes(): CanonicalLeafRoute[] {
  return snapshot.parents.flatMap((parent) =>
    getCanonicalLeavesByParentSlug(parent.slug).map((leaf) => ({
      categorySlug: parent.slug,
      categoryName: parent.name,
      subcategorySlug: leaf.slug,
      subcategoryName: leaf.name,
    })),
  );
}

export function getCanonicalSearchSubcategoryOptions(categorySlug: string) {
  return getCanonicalLeavesByParentSlug(categorySlug).map((leaf) => ({
    label: leaf.name,
    value: leaf.slug,
  }));
}

export function isSyntheticCanonicalSubcategoryId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(SYNTHETIC_ID_PREFIX);
}

function syntheticSubcategoryId(categorySlug: string, subcategorySlug: string): string {
  return `${SYNTHETIC_ID_PREFIX}${categorySlug}:${subcategorySlug}`;
}

function canonicalEntryFromLeaf(
  categorySlug: string,
  leaf: ReturnType<typeof getCanonicalLeavesByParentSlug>[number],
  existing?: SubcategoryEntry | null,
): SubcategoryEntry {
  return {
    id: existing?.id ?? syntheticSubcategoryId(categorySlug, leaf.slug),
    slug: leaf.slug,
    name: leaf.name,
    sort_order: leaf.order,
    group_key: leaf.group_key,
    group_label: leaf.group_label,
    group_order: leaf.group_order,
    taxonomy_version: MARKTX_TAXONOMY_VERSION_NAME,
    is_listing_enabled: true,
    is_filter_enabled: true,
  };
}

export function mergeCanonicalSubcategoryEntries(
  categorySlug: string,
  entries: SubcategoryEntry[],
): SubcategoryEntry[] {
  const parent = getCanonicalParentBySlug(categorySlug);
  if (!parent) {
    return [...entries].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
  }

  const bySlug = new Map(entries.map((entry) => [normalizeSlug(entry.slug), entry]));
  const canonical = getCanonicalLeavesByParentSlug(parent.slug).map((leaf) => {
    const existing =
      bySlug.get(leaf.slug) ??
      leaf.aliases.map((alias) => bySlug.get(normalizeSlug(alias))).find((entry): entry is SubcategoryEntry => Boolean(entry));
    return canonicalEntryFromLeaf(parent.slug, leaf, existing);
  });

  return canonical;
}

export function mergeCanonicalTaxonomySubcategories(
  categorySlug: string,
  categoryId: string,
  entries: TaxonomySubcategory[],
): TaxonomySubcategory[] {
  return mergeCanonicalSubcategoryEntries(categorySlug, entries).map((entry) => ({
    ...entry,
    category_id: categoryId,
  }));
}

export function groupSubcategoriesForDisplay(
  categorySlug: string,
  subcategories: SubcategoryEntry[],
): GroupedSubcategories[] {
  const parent = getCanonicalParentBySlug(categorySlug);
  if (!parent) {
    return subcategories.length > 0
      ? [{ key: "subcategories", label: "Alt kateqoriyalar", order: 1, subcategories }]
      : [];
  }

  const bySlug = new Map(subcategories.map((subcategory) => [subcategory.slug, subcategory]));
  return parent.groups
    .map((group) => ({
      key: group.key,
      label: group.label,
      order: group.order,
      subcategories: group.leaves
        .map((leaf) => bySlug.get(leaf.slug))
        .filter((entry): entry is SubcategoryEntry => Boolean(entry)),
    }))
    .filter((group) => group.subcategories.length > 0);
}
