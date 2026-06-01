"use client";

import { useState } from "react";

import { ListingImage } from "@/components/ui/ListingImage";
import {
  getListingImages,
  LISTING_IMAGE_FALLBACK_CLASS,
  type ListingImageSource,
} from "@/lib/listings/listing-images";

const MAX_THUMBNAILS = 6;
const DETAIL_MAIN_IMAGE_SIZES = "(max-width: 1024px) 100vw, 640px";
const DETAIL_THUMB_IMAGE_SIZES = "80px";

type ListingDetailGalleryProps = {
  listing: ListingImageSource;
  title: string;
  fallbackClass?: string;
};

export function ListingDetailGallery({
  listing,
  title,
  fallbackClass = LISTING_IMAGE_FALLBACK_CLASS,
}: ListingDetailGalleryProps) {
  const images = getListingImages(listing);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const visibleImages = images.slice(0, MAX_THUMBNAILS);
  const selectedImage = visibleImages[selectedIndex] ?? visibleImages[0] ?? null;
  const totalCount = visibleImages.length;

  const countBadge =
    totalCount <= 1
      ? "1 şəkil"
      : `${selectedIndex + 1} / ${totalCount}`;

  return (
    <div className="min-w-0 space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-brand-border/80 bg-brand-surface shadow-sm">
        <div className="relative aspect-[4/3] w-full">
          {selectedImage ? (
            <ListingImage
              src={selectedImage}
              alt={title}
              fallbackClass={fallbackClass}
              sizes={DETAIL_MAIN_IMAGE_SIZES}
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${fallbackClass}`}
            >
              <span className="px-4 text-center text-sm font-semibold text-brand-muted">{title}</span>
            </div>
          )}
        </div>
        {totalCount > 0 ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {countBadge}
          </span>
        ) : null}
      </div>

      {totalCount > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {visibleImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`${title} — şəkil ${index + 1}`}
              aria-current={selectedIndex === index}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-colors ${
                selectedIndex === index ? "border-brand-primary" : "border-transparent"
              }`}
            >
              <ListingImage
                src={image}
                alt={`${title} ${index + 1}`}
                fallbackClass={fallbackClass}
                sizes={DETAIL_THUMB_IMAGE_SIZES}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
