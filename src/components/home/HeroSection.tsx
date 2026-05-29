import { LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";

import { HERO } from "@/constants/data";

import { HeroPreview } from "./HeroPreview";

export function HeroSection() {
  return (
    <section className="bg-white py-8 sm:py-10 lg:py-12" aria-labelledby="hero-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
        <div className="max-w-xl">
          <h1
            id="hero-heading"
            className="text-[1.85rem] font-extrabold leading-[1.12] tracking-tight text-brand-text sm:text-4xl lg:text-[2.65rem]"
          >
            {HERO.headlineBefore}
            <span className="text-brand-primary">{HERO.headlineBrand}</span>
            {HERO.headlineAfter}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-brand-muted sm:text-lg">
            {HERO.subtitle}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={HERO.primaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-primary-dark"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {HERO.primaryCta.label}
            </Link>
            <Link
              href={HERO.secondaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-border bg-white px-6 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/50 hover:text-brand-primary"
            >
              <LayoutGrid className="h-4 w-4" />
              {HERO.secondaryCta.label}
            </Link>
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}
