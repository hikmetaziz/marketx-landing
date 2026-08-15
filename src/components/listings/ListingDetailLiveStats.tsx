"use client";

import { useEffect, useState } from "react";

import { incrementListingView } from "@/app/listings/[slug]/actions";
import { ListingDetailStats } from "@/components/listings/ListingDetailSections";
import {
  hasViewedListingInSession,
  markListingViewedInSession,
} from "@/lib/listings/view-session";

type ListingDetailLiveStatsProps = {
  listingId: string;
  initialViews: number;
  favorites: number;
  recordView?: boolean;
};

export function ListingDetailLiveStats({
  listingId,
  initialViews,
  favorites,
  recordView = true,
}: ListingDetailLiveStatsProps) {
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    if (!recordView || hasViewedListingInSession(listingId)) {
      return;
    }

    markListingViewedInSession(listingId);

    let mounted = true;

    void incrementListingView(listingId).then((result) => {
      if (mounted && result.ok) {
        setViews(result.viewCount);
      }
    });

    return () => {
      mounted = false;
    };
  }, [listingId, recordView]);

  return <ListingDetailStats views={views} favorites={favorites} />;
}
