import type { Metadata } from "next";

import { DEFAULT_METADATA } from "@/lib/seo";

import { CategoryCardsSection } from "@/components/home/CategoryCardsSection";
import { HeroSection } from "@/components/home/HeroSection";
import { PopularListingsSection } from "@/components/home/PopularListingsSection";
import { SearchBarSection } from "@/components/home/SearchBarSection";

export const metadata: Metadata = {
  ...DEFAULT_METADATA,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="overflow-x-hidden bg-[#f6f7f9]">
      <div className="mx-auto grid w-full max-w-[1560px] min-[1440px]:grid-cols-[170px_minmax(0,1fr)_170px] min-[1440px]:gap-5">
        <div className="hidden min-[1440px]:block" aria-hidden="true" />
        <div className="min-w-0">
          <HeroSection />
          <SearchBarSection />
          <CategoryCardsSection />
          <PopularListingsSection />
        </div>
        <div className="hidden min-[1440px]:block" aria-hidden="true" />
      </div>
    </main>
  );
}
