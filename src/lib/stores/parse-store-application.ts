const STORE_APPLICATION_SUBJECT = "Yeni mağaza müraciəti";
const STORE_APPLICATION_HEADER = "MÜRACİƏT NÖVÜ: Yeni mağaza";

export type ParsedStoreApplication = {
  name: string;
  category: string;
  city: string;
  description: string;
  address: string;
  weekdays: string;
  openingTime: string;
  closingTime: string;
  phone: string;
  whatsapp: string;
  email: string;
  raw: string;
};

const DEFAULT_HOURS = {
  openingTime: "09:00",
  closingTime: "18:00",
};

type ParsedFieldKey =
  | keyof Omit<
      ParsedStoreApplication,
      "raw" | "openingTime" | "closingTime"
    >
  | "hours";

const LABEL_MAP: Record<string, ParsedFieldKey> = {
  "mağaza adı": "name",
  kateqoriya: "category",
  şəhər: "city",
  təsvir: "description",
  ünvan: "address",
  "iş günləri": "weekdays",
  "iş saatları": "hours",
  telefon: "phone",
  whatsapp: "whatsapp",
  "e-poçt": "email",
};

const EMPTY_VALUE_LABELS = new Set([
  "",
  "-",
  "—",
  "qeyd edilməyib",
]);

function normalizeLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("az-AZ");
}

function normalizeOptionalValue(value: string): string {
  const trimmed = value.trim();
  const normalized = trimmed.toLocaleLowerCase("az-AZ");

  return EMPTY_VALUE_LABELS.has(normalized) ? "" : trimmed;
}

function normalizeTime(
  value: string | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim() ?? "";

  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function parseHours(value: string): {
  openingTime: string;
  closingTime: string;
} {
  const parts = value
    .split(/\s*[–—-]\s*/, 2)
    .map((part) => part.trim());

  return {
    openingTime: normalizeTime(
      parts[0],
      DEFAULT_HOURS.openingTime,
    ),
    closingTime: normalizeTime(
      parts[1],
      DEFAULT_HOURS.closingTime,
    ),
  };
}

function getFirstLine(body: string): string {
  return body
    .trimStart()
    .split(/\r?\n/, 1)[0]
    .trim();
}

export function parseStoreApplicationMessage(
  body: string | null | undefined,
): ParsedStoreApplication | null {
  if (typeof body !== "string" || !body.trim()) {
    return null;
  }

  if (getFirstLine(body) !== STORE_APPLICATION_HEADER) {
    return null;
  }

  const result: ParsedStoreApplication = {
    name: "",
    category: "",
    city: "",
    description: "",
    address: "",
    weekdays: "",
    openingTime: DEFAULT_HOURS.openingTime,
    closingTime: DEFAULT_HOURS.closingTime,
    phone: "",
    whatsapp: "",
    email: "",
    raw: body,
  };

  let recognizedFieldCount = 0;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex <= 0) {
      continue;
    }

    const label = normalizeLabel(
      line.slice(0, separatorIndex),
    );

    const key = LABEL_MAP[label];

    if (!key) {
      continue;
    }

    const value = normalizeOptionalValue(
      line.slice(separatorIndex + 1),
    );

    recognizedFieldCount += 1;

    if (key === "hours") {
      const hours = parseHours(value);

      result.openingTime = hours.openingTime;
      result.closingTime = hours.closingTime;
      continue;
    }

    result[key] = value;
  }

  /*
   * Header mövcuddur, amma heç bir tanınan sahə yoxdursa,
   * mesaj malformed hesab edilir.
   */
  if (recognizedFieldCount === 0) {
    return null;
  }

  return result;
}

export function isStoreApplicationSubject(
  subject: string | null | undefined,
): boolean {
  return (
    typeof subject === "string" &&
    subject.trim() === STORE_APPLICATION_SUBJECT
  );
}

export function isStoreApplicationMessage(
  body: string | null | undefined,
): boolean {
  return (
    typeof body === "string" &&
    getFirstLine(body) === STORE_APPLICATION_HEADER
  );
}