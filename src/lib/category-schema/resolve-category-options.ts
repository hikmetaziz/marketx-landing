import type { TaxonomyAttributeDefinition } from "@/lib/taxonomy/listing-taxonomy-types";

const AUTOMOBILE_BRANDS = [
  "Audi",
  "BMW",
  "BYD",
  "Changan",
  "Chery",
  "Chevrolet",
  "Ford",
  "Geely",
  "Haval",
  "Honda",
  "Hyundai",
  "Kia",
  "Lada",
  "Land Rover",
  "Lexus",
  "Mazda",
  "Mercedes-Benz",
  "Mitsubishi",
  "Nissan",
  "Opel",
  "Peugeot",
  "Porsche",
  "Renault",
  "Skoda",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
] as const;

const AUTOMOBILE_MODELS: Record<string, string[]> = {
  Audi: ["A3", "A4", "A6", "Q3", "Q5", "Q7"],
  BMW: ["1 Series", "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X6"],
  BYD: ["Atto 3", "Dolphin", "Han", "Seal", "Song Plus", "Tang"],
  Changan: ["Alsvin", "CS35", "CS55", "CS75", "Eado", "UNI-K"],
  Chery: ["Arrizo 6", "Tiggo 2", "Tiggo 4", "Tiggo 7", "Tiggo 8"],
  Chevrolet: ["Captiva", "Cobalt", "Cruze", "Lacetti", "Malibu", "Nexia", "Tracker", "Traverse"],
  Ford: ["Escape", "Explorer", "Fiesta", "Focus", "Fusion", "Kuga", "Mondeo", "Mustang"],
  Geely: ["Atlas", "Azkarra", "Coolray", "Emgrand", "Monjaro", "Tugella"],
  Haval: ["Dargo", "F7", "F7x", "H6", "H9", "Jolion"],
  Honda: ["Accord", "Civic", "CR-V", "Fit", "HR-V", "Pilot"],
  Hyundai: ["Accent", "Elantra", "i10", "i20", "i30", "Santa Fe", "Sonata", "Tucson"],
  Kia: ["Ceed", "Cerato", "K5", "Picanto", "Rio", "Sorento", "Soul", "Sportage"],
  Lada: ["Granta", "Kalina", "Largus", "Niva", "Priora", "Vesta", "XRAY"],
  "Land Rover": ["Defender", "Discovery", "Range Rover", "Range Rover Evoque", "Range Rover Sport"],
  Lexus: ["ES", "GX", "IS", "LX", "NX", "RX", "UX"],
  Mazda: ["3", "6", "CX-3", "CX-30", "CX-5", "CX-9"],
  "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "GLA", "GLC", "GLE", "S-Class"],
  Mitsubishi: ["ASX", "L200", "Lancer", "Outlander", "Pajero", "Pajero Sport"],
  Nissan: ["Altima", "Juke", "Leaf", "Micra", "Murano", "Pathfinder", "Qashqai", "Sentra", "Teana", "X-Trail"],
  Opel: ["Astra", "Corsa", "Insignia", "Mokka", "Vectra", "Zafira"],
  Peugeot: ["2008", "208", "3008", "301", "308", "408", "508", "Partner"],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Renault: ["Captur", "Clio", "Duster", "Fluence", "Kadjar", "Kaptur", "Logan", "Megane", "Sandero", "Symbol"],
  Skoda: ["Fabia", "Kodiaq", "Karoq", "Octavia", "Rapid", "Superb", "Yeti"],
  Subaru: ["Forester", "Impreza", "Legacy", "Outback", "XV"],
  Suzuki: ["Baleno", "Grand Vitara", "Jimny", "Swift", "SX4", "Vitara"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y"],
  Toyota: ["Camry", "Corolla", "Highlander", "Land Cruiser", "Prius", "RAV4", "Yaris"],
  Volkswagen: ["Golf", "Jetta", "Passat", "Polo", "Tiguan", "Touareg", "Transporter"],
  Volvo: ["S60", "S90", "V40", "V60", "XC40", "XC60", "XC90"],
};

const PHONE_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Huawei",
  "Honor",
  "Oppo",
  "Vivo",
  "Realme",
  "Google",
  "Nokia",
  "OnePlus",
  "Sony",
  "Motorola",
  "Infinix",
  "Tecno",
] as const;

const PHONE_MODELS: Record<string, string[]> = {
  Apple: [
    "iPhone 11",
    "iPhone 12",
    "iPhone 12 Pro",
    "iPhone 13",
    "iPhone 13 Pro",
    "iPhone 14",
    "iPhone 14 Pro",
    "iPhone 15",
    "iPhone 15 Pro",
    "iPhone SE",
  ],
  Samsung: [
    "Galaxy A14",
    "Galaxy A24",
    "Galaxy A34",
    "Galaxy A54",
    "Galaxy S21",
    "Galaxy S22",
    "Galaxy S23",
    "Galaxy S24",
    "Galaxy Z Flip",
    "Galaxy Z Fold",
  ],
  Xiaomi: ["Redmi 10", "Redmi 12", "Redmi Note 12", "Redmi Note 13", "Mi 11", "Mi 12", "Poco X5", "Poco F5"],
  Huawei: ["Nova 11", "Nova Y90", "P40", "P50", "P60", "Mate 40", "Mate 50"],
  Honor: ["Honor 70", "Honor 90", "Honor X8", "Honor X9", "Magic 5"],
  Oppo: ["A57", "A78", "Reno 8", "Reno 10", "Find X5"],
  Vivo: ["Y16", "Y22", "Y35", "V25", "V27", "X80", "X90"],
  Realme: ["C33", "C55", "10", "11", "GT Neo 3"],
  Google: ["Pixel 6", "Pixel 6a", "Pixel 7", "Pixel 7a", "Pixel 8"],
  Nokia: ["G11", "G21", "X10", "X20", "XR20"],
  OnePlus: ["Nord CE 3", "Nord N30", "11", "12"],
  Sony: ["Xperia 1 IV", "Xperia 5 IV", "Xperia 10 IV"],
  Motorola: ["Moto G23", "Moto G54", "Edge 40"],
  Infinix: ["Hot 30", "Note 30", "Zero 30"],
  Tecno: ["Camon 20", "Spark 10", "Pova 5"],
};

const ELECTRONICS_BRANDS_BY_SUBCATEGORY: Record<string, string[]> = {
  "masaustu-komputerler": ["ASUS", "Dell", "HP", "Lenovo", "Acer", "MSI", "Apple", "Intel", "AMD"],
  noutbuklar: ["Apple", "ASUS", "Dell", "HP", "Lenovo", "Acer", "MSI", "Huawei", "Honor"],
  monobloklar: ["Apple", "ASUS", "Dell", "HP", "Lenovo", "Acer", "MSI"],
  monitorlar: ["Dell", "LG", "Samsung", "AOC", "ASUS", "BenQ", "Xiaomi"],
  prosessorlar: ["Intel", "AMD"],
  "ana-platalar": ["ASUS", "Gigabyte", "MSI", "ASRock"],
  videokartlar: ["NVIDIA", "AMD", "ASUS", "Gigabyte", "MSI", "Sapphire"],
  "operativ-yaddas-ram": ["Kingston", "Corsair", "Crucial", "G.Skill", "Samsung"],
  "ssd-hdd-ve-yaddas-qurgulari": ["Samsung", "Kingston", "Western Digital", "Seagate", "Crucial", "SanDisk"],
  televizorlar: ["Samsung", "LG", "Sony", "Philips", "TCL", "Hisense", "Xiaomi"],
  proyektorlar: ["Epson", "BenQ", "ViewSonic", "Xiaomi", "Samsung"],
  "tv-box-ve-media-pleyerler": ["Apple", "Xiaomi", "Google", "Amazon", "NVIDIA"],
  qulaqliqlar: ["Apple", "Samsung", "Sony", "JBL", "Anker", "Xiaomi", "Bose"],
  "portativ-dinamikler": ["JBL", "Sony", "Anker", "Bose", "Marshall", "Xiaomi"],
  "ev-audio-sistemleri": ["Sony", "Samsung", "LG", "Yamaha", "Pioneer", "Bose"],
  "oyun-konsollari": ["Sony", "Microsoft", "Nintendo"],
  "oyun-aksesuarlari": ["Sony", "Microsoft", "Nintendo", "Logitech", "Razer"],
  "foto-ve-videokameralar": ["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "GoPro", "DJI"],
  "obyektiv-ve-foto-video-aksesuarlari": ["Canon", "Nikon", "Sony", "Fujifilm", "Sigma", "Tamron"],
  "smart-saat-ve-wearable-cihazlar": ["Apple", "Samsung", "Xiaomi", "Huawei", "Garmin", "Amazfit"],
  "agilli-ve-tehlukesizlik-sistemleri": ["Xiaomi", "Ezviz", "Hikvision", "TP-Link", "Aqara"],
  "dronlar-ve-aksesuarlar": ["DJI", "Autel", "Parrot"],
};

export function normalizeOptionKey(value: string): string {
  return value.trim().normalize("NFKC").toLocaleLowerCase("az");
}

export function dedupeOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const option of options) {
    const value = option.trim();
    if (!value) {
      continue;
    }
    const key = normalizeOptionKey(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

export type CategoryOptionContext = {
  categoryKey: string;
  subcategorySlug?: string | null;
  attributeValues?: Record<string, unknown>;
};

function resolveBrandOptions(categoryKey: string, subcategorySlug?: string | null): string[] {
  if (categoryKey === "automobile" || categoryKey === "auto_parts") return dedupeOptions(AUTOMOBILE_BRANDS);
  if (categoryKey === "phone") return dedupeOptions(PHONE_BRANDS);
  if (categoryKey === "electronics") {
    return subcategorySlug ? dedupeOptions(ELECTRONICS_BRANDS_BY_SUBCATEGORY[subcategorySlug] ?? []) : [];
  }
  return [];
}

function resolveCatalogOptions(catalog: Record<string, string[]>, key: unknown): string[] {
  const normalizedKey = typeof key === "string" ? normalizeOptionKey(key) : "";
  if (!normalizedKey) return [];
  const catalogKey = Object.keys(catalog).find((item) => normalizeOptionKey(item) === normalizedKey);
  return catalogKey ? dedupeOptions(catalog[catalogKey] ?? []) : [];
}

function resolveModelOptions(categoryKey: string, brand: unknown): string[] {
  if (categoryKey === "automobile" || categoryKey === "auto_parts") return resolveCatalogOptions(AUTOMOBILE_MODELS, brand);
  if (categoryKey === "phone") return resolveCatalogOptions(PHONE_MODELS, brand);
  return [];
}

function categoryKeyFromDefinition(definition: TaxonomyAttributeDefinition): string | null {
  const match = definition.id.match(/^schema-v\d+-(automobile|auto_parts|phone|electronics|home_garden)-/);
  return match?.[1] ?? null;
}

export function resolveCategoryAttributeOptions(
  definition: TaxonomyAttributeDefinition,
  context: CategoryOptionContext,
): string[] {
  if (definition.options.length > 0) {
    return dedupeOptions(definition.options);
  }

  const categoryKey = context.categoryKey || categoryKeyFromDefinition(definition);
  if (!categoryKey) {
    return [];
  }

  if (definition.option_source === "brands") {
    return resolveBrandOptions(categoryKey, context.subcategorySlug);
  }

  if (definition.option_source === "models") {
    const parentKey = definition.depends_on ?? "brand";
    const brand = context.attributeValues?.[parentKey];
    return resolveModelOptions(categoryKey, brand);
  }

  return [];
}

export function enrichAttributeDefinitionsWithOptions(
  definitions: TaxonomyAttributeDefinition[],
  context: CategoryOptionContext,
): TaxonomyAttributeDefinition[] {
  return definitions.map((definition) => {
    const options = resolveCategoryAttributeOptions(definition, context);
    if (options.length === 0 || options === definition.options) {
      return definition;
    }
    return { ...definition, options };
  });
}
