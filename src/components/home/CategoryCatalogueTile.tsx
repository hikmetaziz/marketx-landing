import Link from "next/link";
import Image from "next/image";

import type { CategoryCatalogueEntry } from "@/lib/taxonomy/catalogue-types";

type CategoryCatalogueTileProps = {
  entry: CategoryCatalogueEntry;
  mobileCompact?: boolean;
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

export function CategoryCatalogueTile({ entry, mobileCompact = false }: CategoryCatalogueTileProps) {
  const imageSrc = resolveCatalogueImageSrc(entry);
  const linkClassName = mobileCompact
    ? "group flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-lg border border-brand-border bg-white px-2 py-2.5 text-center shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-colors hover:border-brand-primary/40 hover:bg-[#f8fbff] md:min-h-[132px] md:gap-2.5 md:px-2.5 md:py-3.5"
    : "group flex min-h-[132px] flex-col items-center justify-center gap-2.5 rounded-lg border border-brand-border bg-white px-2.5 py-3.5 text-center shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-colors hover:border-brand-primary/40 hover:bg-[#f8fbff]";
  const imageClassName = mobileCompact
    ? "relative flex h-12 w-full max-w-[120px] items-center justify-center overflow-hidden rounded-md bg-brand-surface md:h-[72px] md:max-w-[144px]"
    : "relative flex h-[72px] w-full max-w-[144px] items-center justify-center overflow-hidden rounded-md bg-brand-surface";
  const titleClassName = mobileCompact
    ? "flex min-h-8 items-center justify-center text-[12px] font-semibold leading-[1.25] text-brand-text md:min-h-9 md:text-sm md:leading-[1.3]"
    : "flex min-h-9 items-center justify-center text-sm font-semibold leading-[1.3] text-brand-text";

  return (
    <Link
      href={`/categories/${entry.slug}`}
      className={linkClassName}
    >
      <span className={imageClassName}>
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 150px"
          className="object-contain transition-transform duration-200 group-hover:scale-105"
        />
      </span>
      <span className={titleClassName}>
        {entry.title}
      </span>
    </Link>
  );
}
