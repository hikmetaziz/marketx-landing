import { ALL_CATEGORIES } from "@/constants/data";

/** Lucide icon key — CategoryCatalogueTile map edir. */
export type CategoryCatalogueIconKey =
  | "building"
  | "car"
  | "phone"
  | "monitor"
  | "washing"
  | "house"
  | "armchair"
  | "shirt"
  | "briefcase"
  | "clipboard"
  | "baby"
  | "paw"
  | "store"
  | "hammer"
  | "graduation"
  | "grid";

export const ICON_BY_TITLE: Record<(typeof ALL_CATEGORIES)[number], CategoryCatalogueIconKey> = {
  "Daşınmaz əmlak": "building",
  "Avtomobil və nəqliyyat": "car",
  "Avto ehtiyat hissələri və avadanlıq": "hammer",
  Telefon: "phone",
  Elektronika: "monitor",
  "Məişət texnikası": "washing",
  "Ev və bağ": "house",
  "Geyim və aksesuar": "shirt",
  Xidmətlər: "briefcase",
  "İş elanları": "clipboard",
  "Uşaq məhsulları": "baby",
  Heyvanlar: "paw",
  "Biznes və avadanlıq": "store",
  "Təmir və ustalar": "hammer",
  "Təhsil və kurslar": "graduation",
  Digər: "grid",
};

