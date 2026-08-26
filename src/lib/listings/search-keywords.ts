export const MAX_LISTING_SEARCH_KEYWORDS = 20;
export const MIN_LISTING_SEARCH_KEYWORD_LENGTH = 2;
export const MAX_LISTING_SEARCH_KEYWORD_LENGTH = 50;
export const MAX_LISTING_SEARCH_KEYWORDS_LENGTH = 500;

export type ListingSearchKeywordsResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function parseListingSearchKeywords(raw: unknown): ListingSearchKeywordsResult {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, value: "" };
  }

  if (typeof raw !== "string") {
    return { ok: false, error: "Axtarış açar sözləri düzgün deyil." };
  }

  const uniqueTerms: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(/[,\r\n]+/u)) {
    const term = part.trim().replace(/\s+/gu, " ");
    if (!term) continue;

    if (
      term.length < MIN_LISTING_SEARCH_KEYWORD_LENGTH ||
      term.length > MAX_LISTING_SEARCH_KEYWORD_LENGTH
    ) {
      return {
        ok: false,
        error: `Hər axtarış açar sözü ${MIN_LISTING_SEARCH_KEYWORD_LENGTH}–${MAX_LISTING_SEARCH_KEYWORD_LENGTH} simvol olmalıdır.`,
      };
    }

    const dedupeKey = term.toLocaleLowerCase("az-AZ");
    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);
    uniqueTerms.push(term);
  }

  if (uniqueTerms.length > MAX_LISTING_SEARCH_KEYWORDS) {
    return {
      ok: false,
      error: `Maksimum ${MAX_LISTING_SEARCH_KEYWORDS} axtarış açar sözü əlavə edə bilərsiniz.`,
    };
  }

  const value = uniqueTerms.join(", ");
  if (value.length > MAX_LISTING_SEARCH_KEYWORDS_LENGTH) {
    return {
      ok: false,
      error: `Axtarış açar sözlərinin ümumi uzunluğu maksimum ${MAX_LISTING_SEARCH_KEYWORDS_LENGTH} simvol ola bilər.`,
    };
  }

  return { ok: true, value };
}
