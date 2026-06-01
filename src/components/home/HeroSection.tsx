import Image from "next/image";
import { LayoutGrid, Sparkles } from "lucide-react";
import Link from "next/link";

import { BrandName } from "@/components/BrandLogo";
import { HERO } from "@/constants/data";

export function HeroSection() {
  return (
    <section className="pb-1 pt-4 sm:pt-6 lg:pt-7" aria-labelledby="hero-heading">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.40fr)_minmax(0,0.60fr)] lg:gap-10 lg:px-8">
        <div className="lg:pr-2">
          <h1
            id="hero-heading"
            className="text-[2.15rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-brand-text sm:text-[2.85rem] lg:text-[3.35rem]"
          >
            {HERO.headlineBefore}
            <BrandName />
            {HERO.headlineAfter}
          </h1>
          <p className="mt-3.5 max-w-xl text-base leading-relaxed text-brand-muted sm:mt-4 sm:text-[17px] lg:text-lg">
            {HERO.subtitle}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-muted/90">
            <Sparkles className="h-4 w-4 text-brand-primary/70" aria-hidden="true" />
            {HERO.subtitleNote}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center lg:mt-7">
            <Link
              href={HERO.primaryCta.href}
              className="btn-primary-premium inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-white"
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={2.5} />
              {HERO.primaryCta.label}
            </Link>
            <Link
              href={HERO.secondaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-border/90 bg-white/80 px-7 py-3.5 text-sm font-semibold text-brand-text shadow-sm backdrop-blur-sm transition-all hover:border-brand-primary/35 hover:bg-white hover:text-brand-primary hover:shadow-md"
            >
              <LayoutGrid className="h-4 w-4 text-brand-primary" />
              {HERO.secondaryCta.label}
            </Link>
          </div>
        </div>

        <div className="relative w-full min-w-0">
          <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-slate-50 to-white ring-1 ring-brand-border/50 shadow-[0_28px_64px_rgba(15,23,42,0.16)] lg:rounded-3xl">
            <Image
              src="/images/hero-marketx.png"
              alt="MarktX marketplace hero"
              width={1672}
              height={941}
              priority
              quality={80}
              sizes="(max-width: 768px) 100vw, 60vw"
              className="h-auto w-full max-w-[1672px] object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
