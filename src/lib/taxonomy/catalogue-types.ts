import type { CategoryCatalogueIconKey } from "@/constants/category-catalogue";

export type CatalogueCategoryRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  icon_key: string | null;
  catalogue_image_path: string | null;
  home_visible: boolean | null;
};

export type CategoryCatalogueEntry = {
  id: string;
  title: string;
  slug: string;
  icon: CategoryCatalogueIconKey;
  imageBasePath: string;
};

export type CategoryFilter = {
  categoryId: string;
  legacyTexts: string[];
};

export type SubcategoryEntry = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  group_key?: string | null;
  group_label?: string | null;
  group_order?: number | null;
  taxonomy_version?: string | null;
  is_listing_enabled?: boolean | null;
  is_filter_enabled?: boolean | null;
};
