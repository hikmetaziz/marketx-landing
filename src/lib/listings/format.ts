/** SSR və brauzer eyni format — locale-dən asılı deyil (9 700). */
function formatAzNumber(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(Math.abs(value))) : 0;
  return safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const AZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avqust",
  "sentyabr",
  "oktyabr",
  "noyabr",
  "dekabr",
] as const;

const AZERBAIJAN_TIMEZONE_OFFSET_MS = 4 * 60 * 60 * 1000;

function getAzerbaijanDateParts(date: Date): { day: number; month: number; year: number } {
  const shifted = new Date(date.getTime() + AZERBAIJAN_TIMEZONE_OFFSET_MS);
  return {
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth(),
    year: shifted.getUTCFullYear(),
  };
}

function getAzerbaijanDayNumber(date: Date): number {
  const parts = getAzerbaijanDateParts(date);
  return Math.floor(Date.UTC(parts.year, parts.month, parts.day) / 86_400_000);
}

export function formatListingPrice(price: number): string {
  return `${formatAzNumber(price)} AZN`;
}

/** Node və brauzerdə eyni çıxış — toLocaleDateString hydration mismatch verir. */
export function formatListingDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  const { day, month, year } = getAzerbaijanDateParts(date);
  return `${day} ${AZ_MONTHS[month]} ${year}`;
}

/** Web display only — today/yesterday/date labels for listing cards and metadata. */
export function formatListingRelativeDate(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  const diffDays = getAzerbaijanDayNumber(now) - getAzerbaijanDayNumber(date);

  if (diffDays < 0) {
    return formatListingDate(isoDate);
  }

  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Dünən";

  return formatListingDate(isoDate);
}

export function formatListingViewCount(count: number): string {
  const safe = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  return `${formatAzNumber(safe)} baxış`;
}
