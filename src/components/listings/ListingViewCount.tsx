"use client";

import { useEffect, useState } from "react";

import { incrementListingView } from "@/app/listings/[slug]/actions";
import { formatListingViewCount } from "@/lib/listings/format";
import {
  hasViewedListingInSession,
  markListingViewedInSession,
} from "@/lib/listings/view-session";

type ListingViewCountProps = {
  listingId: string;
  initialCount: number;
  className?: string;
};

export function ListingViewCount({ listingId, initialCount, className = "" }: ListingViewCountProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (hasViewedListingInSession(listingId)) {
      return;
    }

    markListingViewedInSession(listingId);

    let mounted = true;

    void incrementListingView(listingId).then((result) => {
      if (mounted && result.ok) {
        setCount(result.viewCount);
      }
    });

    return () => {
      mounted = false;
    };
  }, [listingId]);

  return (
    <p className={`text-sm text-brand-muted ${className}`} aria-label={`${count} baxış`}>
      👁 {formatListingViewCount(count)}
    </p>
  );
}

type ListingViewDisplayProps = {
  count: number;
  className?: string;
};

export function ListingViewDisplay({ count, className = "" }: ListingViewDisplayProps) {
  return (
    <p className={`text-sm text-brand-muted ${className}`} aria-label={`${count} baxış`}>
      👁 {formatListingViewCount(count)}
    </p>
  );
}
