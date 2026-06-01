const SESSION_PREFIX = "marktx-viewed:";

export function hasViewedListingInSession(listingId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return sessionStorage.getItem(`${SESSION_PREFIX}${listingId}`) === "1";
  } catch {
    return false;
  }
}

export function markListingViewedInSession(listingId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(`${SESSION_PREFIX}${listingId}`, "1");
  } catch {
    // sessionStorage unavailable — skip persistence
  }
}
