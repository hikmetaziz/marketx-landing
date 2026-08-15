import type { CategoryCatalogueIconKey } from "@/constants/category-catalogue";

/** DB `icon_key` (MaterialIcons) → veb Lucide catalogue key */
const MATERIAL_TO_LUCIDE: Record<string, CategoryCatalogueIconKey> = {
  apartment: "building",
  "directions-car": "car",
  "car-repair": "hammer",
  smartphone: "phone",
  devices: "monitor",
  kitchen: "washing",
  yard: "house",
  weekend: "armchair",
  checkroom: "shirt",
  handyman: "briefcase",
  work: "clipboard",
  "child-care": "baby",
  pets: "paw",
  store: "store",
  build: "hammer",
  school: "graduation",
  category: "grid",
};

const SLUG_TO_LUCIDE: Record<string, CategoryCatalogueIconKey> = {
  "dasinmaz-emlak": "building",
  "avtomobil-ve-neqliyyat": "car",
  "avto-ehtiyat-hisseleri-ve-avadanliq": "hammer",
  neqliyyat: "car",
  telefon: "phone",
  elektronika: "monitor",
  "meiset-texnikasi": "washing",
  "ev-ve-bag": "house",
  "mebel-ve-interyer": "armchair",
  "geyim-ve-aksesuar": "shirt",
  xidmetler: "briefcase",
  "is-elanlari": "clipboard",
  "usaq-mehsullari": "baby",
  "usaq-alemi": "baby",
  heyvanlar: "paw",
  "biznes-ve-avadanliq": "store",
  "temir-ve-ustalar": "hammer",
  "tehsil-ve-kurslar": "graduation",
  diger: "grid",
};

export function resolveCatalogueIconKey(
  slug: string,
  iconKey: string | null | undefined,
): CategoryCatalogueIconKey {
  if (iconKey && MATERIAL_TO_LUCIDE[iconKey]) {
    return MATERIAL_TO_LUCIDE[iconKey];
  }
  return SLUG_TO_LUCIDE[slug] ?? "grid";
}
