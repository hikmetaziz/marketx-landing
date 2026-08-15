"use client";

import Image from "next/image";
import { useState } from "react";

import { sanitizeImageUrl } from "@/lib/images/validate-image-url";

type Props = {
  src: string;
  alt: string;
  fallbackClass: string;
  sizes?: string;
  fit?: "cover" | "contain";
};

function ListingImageFallback({ alt, fallbackClass }: Pick<Props, "alt" | "fallbackClass">) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${fallbackClass}`}
      aria-hidden="true"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted/70">{alt}</span>
    </div>
  );
}

export function ListingImage({ src, alt, fallbackClass, sizes, fit = "cover" }: Props) {
  const [failed, setFailed] = useState(false);
  const safeSrc = sanitizeImageUrl(src);

  if (!safeSrc || failed) {
    return <ListingImageFallback alt={alt} fallbackClass={fallbackClass} />;
  }

  const skipOptimizer = safeSrc.startsWith("blob:");

  return (
    <Image
      src={safeSrc}
      alt={alt}
      fill
      unoptimized={skipOptimizer}
      sizes={sizes ?? "(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 280px"}
      className={fit === "contain" ? "object-contain p-6" : "object-cover"}
      onError={() => setFailed(true)}
    />
  );
}
