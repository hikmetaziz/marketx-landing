const STORAGE_KEY = "marktx-sample-favorites";

const listeners = new Set<() => void>();

function emitFavoriteChange() {
  listeners.forEach((listener) => listener());
}

function readFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  emitFavoriteChange();
}

export function subscribeFavoriteListingIds(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getFavoriteListingIds(): string[] {
  return readFavoriteIds();
}

export function isListingFavorited(listingId: string): boolean {
  return readFavoriteIds().includes(listingId);
}

export function toggleFavoriteListingId(listingId: string): boolean {
  const current = readFavoriteIds();
  const isFavorited = current.includes(listingId);

  if (isFavorited) {
    writeFavoriteIds(current.filter((id) => id !== listingId));
    return false;
  }

  writeFavoriteIds([...current, listingId]);
  return true;
}

export { STORAGE_KEY as LOCAL_FAVORITES_STORAGE_KEY };
