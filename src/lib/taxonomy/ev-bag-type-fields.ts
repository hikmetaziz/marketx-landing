import type {
  CategoryField,
  CategoryFieldOption,
  CategorySchemaSnapshot,
} from "@/lib/category-schema/schema-contract";

const EV_BAG_CATEGORY_SLUG = "ev-ve-bag";

export const EV_BAG_PRIMARY_TYPE_FIELD_KEYS = {
  "bag-ve-bostan": "garden_type",
  bitkiler: "plant_type",
  "dekor-ve-interyer": "decor_type",
  "qida-ve-erzaq": "food_type",
  "ev-ve-bag-ucun-isiqlandirma": "lighting_type",
  "ev-tekstili": "textile_type",
  "ev-teserrufati-mallari": "household_type",
  mebel: "furniture_type",
  "qab-qacaq-ve-metbex-levazimatlari": "kitchenware_type",
  "temir-ve-tikinti": "repair_type",
  "xalcalar-ve-aksesuarlar": "carpet_type",
} as const;

export type EvBagTypeField = {
  key: string;
  label: string;
  options: CategoryFieldOption[];
};

export type EvBagTypeFilter = {
  fieldKey: string;
  value: string;
};

function isSelectableField(field: CategoryField): boolean {
  return (
    field.type === "select" ||
    field.type === "searchable_select" ||
    field.type === "dependent_select"
  );
}

export function getEvBagTypeField(
  snapshot: CategorySchemaSnapshot,
  categorySlug: string,
  subcategorySlug: string,
): EvBagTypeField | null {
  if (categorySlug !== EV_BAG_CATEGORY_SLUG) {
    return null;
  }

  const fieldKey = EV_BAG_PRIMARY_TYPE_FIELD_KEYS[
    subcategorySlug as keyof typeof EV_BAG_PRIMARY_TYPE_FIELD_KEYS
  ];
  if (!fieldKey) {
    return null;
  }

  const schema = snapshot.schemas.find(
    (candidate) =>
      candidate.schema_version.active &&
      candidate.category_slug === EV_BAG_CATEGORY_SLUG &&
      candidate.subcategory_slugs.includes(subcategorySlug),
  );
  if (!schema?.subcategory_slugs.includes(subcategorySlug)) {
    return null;
  }

  const field = schema.fields.find((candidate) => candidate.key === fieldKey);
  if (!field || !isSelectableField(field) || !field.options?.length) {
    return null;
  }

  return {
    key: field.key,
    label: field.label,
    options: field.options,
  };
}

export function resolveEvBagTypeFilter(
  snapshot: CategorySchemaSnapshot,
  categorySlug: string,
  subcategorySlug: string,
  requestedValue: string,
): EvBagTypeFilter | null {
  const field = getEvBagTypeField(snapshot, categorySlug, subcategorySlug);
  const value = requestedValue.trim();
  if (!field || !value || !field.options.some((option) => option.value === value)) {
    return null;
  }

  return { fieldKey: field.key, value };
}

export function buildEvBagTypeHref(
  pathname: string,
  currentSearch: string,
  selectedType: string,
): string {
  const params = new URLSearchParams(currentSearch);
  const value = selectedType.trim();

  if (value) {
    params.set("type", value);
  } else {
    params.delete("type");
  }
  params.delete("page");

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
