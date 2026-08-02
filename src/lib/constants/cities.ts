export type CityOption = {
  label: string;
  value: string;
  slug: string;
};

export type CityFilterAllOption = {
  label: "Bütün şəhərlər";
  value: "";
  slug: "";
};

const AZERBAIJAN_CITY_LABELS = [
  "Abşeron",
  "Ağcabədi",
  "Ağdam",
  "Ağdaş",
  "Ağdərə",
  "Ağstafa",
  "Ağsu",
  "Astara",
  "Babək",
  "Bakı",
  "Balakən",
  "Bərdə",
  "Beyləqan",
  "Biləsuvar",
  "Cəbrayıl",
  "Cəlilabad",
  "Culfa",
  "Daşkəsən",
  "Digər",
  "Füzuli",
  "Gədəbəy",
  "Gəncə",
  "Goranboy",
  "Göyçay",
  "Göygöl",
  "Hacıqabul",
  "Xaçmaz",
  "Xankəndi",
  "Xaricdən gətirilir",
  "Xızı",
  "Xocalı",
  "Xocavənd",
  "Xırdalan",
  "İmişli",
  "İsmayıllı",
  "Kəlbəcər",
  "Kəngərli",
  "Kürdəmir",
  "Laçın",
  "Lənkəran",
  "Lerik",
  "Masallı",
  "Mingəçevir",
  "Naftalan",
  "Naxçıvan",
  "Neftçala",
  "Oğuz",
  "Ordubad",
  "Qax",
  "Qazax",
  "Qəbələ",
  "Qobustan",
  "Quba",
  "Qubadlı",
  "Qusar",
  "Saatlı",
  "Sabirabad",
  "Salyan",
  "Samux",
  "Sədərək",
  "Siyəzən",
  "Sumqayıt",
  "Şabran",
  "Şahbuz",
  "Şamaxı",
  "Şəki",
  "Şəmkir",
  "Şərur",
  "Şirvan",
  "Şuşa",
  "Tərtər",
  "Tovuz",
  "Ucar",
  "Yardımlı",
  "Yevlax",
  "Zaqatala",
  "Zəngilan",
  "Zərdab",
] as const;

const cityCollator = new Intl.Collator("az");

export function cityToSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const AZERBAIJAN_CITY_OPTIONS: readonly CityOption[] = AZERBAIJAN_CITY_LABELS
  .map((label) => ({
    label,
    value: label,
    slug: cityToSlug(label),
  }))
  .sort((left, right) => cityCollator.compare(left.label, right.label));

export const CITY_FILTER_ALL_OPTION: CityFilterAllOption = {
  label: "Bütün şəhərlər",
  value: "",
  slug: "",
};

export const CITY_OPTIONS = AZERBAIJAN_CITY_OPTIONS.map((option) => option.value);

const CITY_VALUES = new Set(CITY_OPTIONS);

export function isCityValue(value: string): boolean {
  return CITY_VALUES.has(value);
}

export function cityFromParam(value: string): string {
  const normalized = value.trim();
  const slug = cityToSlug(normalized);

  return AZERBAIJAN_CITY_OPTIONS.find((option) => option.value === normalized || option.slug === slug)?.value ?? "";
}
