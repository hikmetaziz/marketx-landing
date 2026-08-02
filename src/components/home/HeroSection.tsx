import Image from "next/image";

export function HeroSection() {
  return (
    <section
      className="relative isolate mx-auto min-h-[510px] max-w-[1180px] overflow-hidden border-b border-brand-border bg-white"
      aria-labelledby="hero-heading"
    >
      <Image
        src="/images/home/marktx-marketplace-hero-v2.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1440px) 1180px, 100vw"
        className="object-cover object-[15%_center] sm:object-[22%_center] lg:object-center"
      />

      <div className="relative z-10 flex min-h-[510px] items-start px-4 pb-16 pt-11 sm:px-6 sm:pb-20 sm:pt-14 lg:px-7 lg:pt-16">
        <div className="max-w-[620px]">
          <p className="mb-5 inline-flex items-center rounded-lg border border-brand-primary/25 bg-brand-primary-light/30 px-3 py-1.5 text-sm font-bold text-brand-primary-dark">
            MarktX — Elan və mağazalar bir yerdə
          </p>

          <h1
            id="hero-heading"
            className="max-w-[540px] text-4xl font-extrabold leading-[1.08] text-[#0b1f3a] sm:text-5xl lg:text-[50px]"
          >
            <span className="block">Axtar, tap, əlaqə saxla.</span>
            <span className="mt-2 block text-[#173b69]">Asan. Sürətli. Etibarlı.</span>
          </h1>

          <p className="mt-6 max-w-[500px] text-base leading-7 text-brand-muted sm:text-lg">
            Məhsul, xidmət və mağazaları bir platformada kəşf edin. Kateqoriyanı seçin,
            elanları müqayisə edin və birbaşa əlaqə saxlayın.
          </p>
        </div>
      </div>
    </section>
  );
}
