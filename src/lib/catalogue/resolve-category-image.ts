import fs from "node:fs";
import path from "node:path";

const CATALOGUE_PREFIX = "/images/catalogue/";
const EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;
const KNOWN_EXTENSION = /\.(png|webp|jpe?g)$/i;

/** public/images/catalogue/{slug}[.{ext}] — asset varsa public URL qaytarır. */
export function resolveCategoryCatalogueImage(imageBasePath: string): string | null {
  const trimmed = imageBasePath.trim();
  if (!trimmed.startsWith(CATALOGUE_PREFIX)) {
    return null;
  }

  const relative = trimmed.slice(CATALOGUE_PREFIX.length);
  if (!relative) {
    return null;
  }

  const dir = path.join(process.cwd(), "public", "images", "catalogue");

  if (KNOWN_EXTENSION.test(relative)) {
    return fs.existsSync(path.join(dir, relative)) ? trimmed : null;
  }

  for (const ext of EXTENSIONS) {
    if (fs.existsSync(path.join(dir, `${relative}.${ext}`))) {
      return `${trimmed}.${ext}`;
    }
  }

  return null;
}
