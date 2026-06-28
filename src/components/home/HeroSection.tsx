import { LayoutGrid } from "lucide-react";
import Link from "next/link";

import { BrandName } from "@/components/BrandLogo";
import { HERO } from "@/constants/data";

export function HeroSection() {
  return (
    <section className="relative z-10 pb-10 pt-14 sm:pt-18 lg:pt-22" aria-labelledby="hero-heading">
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        {/* Başlıq */}
        <h1
          id="hero-heading"
          className="text-[2.6rem] font-extrabold leading-[1.06] tracking-[-0.035em] text-white sm:text-[3.5rem] lg:text-[4.4rem]"
        >
          {HERO.headlineBefore}
          <BrandName />
          {HERO.headlineAfter}
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-white/75 sm:text-xl">
          {HERO.subtitle}
        </p>

        {/* CTA buttons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href={HERO.primaryCta.href}
            className="btn-primary-premium inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-black/25"
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            {HERO.primaryCta.label}
          </Link>
          <Link
            href={HERO.secondaryCta.href}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/50"
          >
            <LayoutGrid className="h-4 w-4 text-white/70" aria-hidden="true" />
            {HERO.secondaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
