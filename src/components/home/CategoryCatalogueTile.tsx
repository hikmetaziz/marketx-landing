import Link from "next/link";
import Image from "next/image";

import type { CategoryCatalogueEntry } from "@/lib/taxonomy/catalogue-types";

type CategoryCatalogueTileProps = {
  entry: CategoryCatalogueEntry;
};

const IMAGE_BY_SLUG: Record<string, string> = {
  "avto-ehtiyat-hisseleri-ve-avadanliq": "/images/catalogue/avtomobil-ve-neqliyyat.png",
};

function resolveCatalogueImageSrc(entry: CategoryCatalogueEntry): string {
  if (IMAGE_BY_SLUG[entry.slug]) {
    return IMAGE_BY_SLUG[entry.slug];
  }
  if (/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(entry.imageBasePath)) {
    return entry.imageBasePath;
  }
  return `${entry.imageBasePath}.png`;
}

export function CategoryCatalogueTile({ entry }: CategoryCatalogueTileProps) {
  const imageSrc = resolveCatalogueImageSrc(entry);

  return (
    <Link
      href={`/categories/${entry.slug}`}
      className="group flex min-h-[132px] flex-col items-center justify-center gap-2.5 rounded-lg border border-brand-border bg-white px-2.5 py-3.5 text-center shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-colors hover:border-brand-primary/40 hover:bg-[#f8fbff]"
    >
      <span className="relative flex h-[72px] w-full max-w-[144px] items-center justify-center overflow-hidden rounded-md bg-brand-surface">
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 150px"
          className="object-contain transition-transform duration-200 group-hover:scale-105"
        />
      </span>
      <span className="flex min-h-9 items-center justify-center text-sm font-semibold leading-[1.3] text-brand-text">
        {entry.title}
      </span>
    </Link>
  );
}
