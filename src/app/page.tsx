import type { Metadata } from "next";

import { DEFAULT_METADATA } from "@/lib/seo";

import { CategoryCardsSection } from "@/components/home/CategoryCardsSection";
import { HeroSection } from "@/components/home/HeroSection";
import { PopularListingsSection } from "@/components/home/PopularListingsSection";
import { SearchBarSection } from "@/components/home/SearchBarSection";
import { TrustValueSection } from "@/components/home/TrustValueSection";

export const metadata: Metadata = {
  ...DEFAULT_METADATA,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="home-premium-bg overflow-x-hidden">
      <HeroSection />
      <SearchBarSection />
      <CategoryCardsSection />
      <TrustValueSection />
      <PopularListingsSection />
    </div>
  );
}
