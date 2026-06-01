export function formatListingPrice(price: number): string {
  return `${price.toLocaleString("az-AZ")} AZN`;
}

export function formatListingDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString("az-AZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Web display only — relative time for listing cards and detail metadata. */
export function formatListingRelativeDate(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    return formatListingDate(isoDate);
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) {
    return "az əvvəl";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} dəq əvvəl`;
  }

  if (diffHours < 24) {
    return `${diffHours} saat əvvəl`;
  }

  if (diffHours < 48) {
    return "dünən";
  }

  if (diffDays < 7) {
    return `${diffDays} gün əvvəl`;
  }

  return formatListingDate(isoDate);
}

export function formatListingViewCount(count: number): string {
  const safe = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  return `${safe.toLocaleString("az-AZ")} baxış`;
}
