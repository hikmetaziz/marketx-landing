import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section
      className="relative isolate mx-auto min-h-[330px] max-w-[1180px] overflow-hidden border-b border-brand-border bg-white md:min-h-[510px]"
      aria-labelledby="hero-heading"
    >
      <Image
        src="/images/home/marktx-marketplace-hero-v2.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1440px) 1180px, 100vw"
        className="object-cover object-[47%_center] sm:object-[34%_center] lg:object-center"
      />

      <div className="relative z-10 flex min-h-[330px] items-start px-4 pb-8 pt-7 sm:px-6 md:min-h-[510px] md:pb-20 md:pt-14 lg:px-7 lg:pt-16">
        <div className="w-[58%] max-w-[245px] sm:max-w-[360px] md:w-auto md:max-w-[620px]">
          <p className="mb-2 inline-flex items-center rounded-lg border border-brand-primary/25 bg-brand-primary-light/30 px-2.5 py-1 text-xs font-bold text-brand-primary-dark md:mb-5 md:px-3 md:py-1.5 md:text-sm">
            MarktX — Elan və mağazalar bir yerdə
          </p>

          <h1
            id="hero-heading"
            className="max-w-[540px] text-[26px] font-extrabold leading-[1.04] text-[#0b1f3a] sm:text-4xl md:text-5xl lg:text-[50px]"
          >
            <span className="block">Online elan</span>
            <span className="mt-1 block text-[#173b69] sm:mt-2">MarktX-la daha asan.</span>
          </h1>

          <p className="mt-2 max-w-[230px] text-[13px] leading-5 text-brand-muted sm:max-w-[340px] sm:text-base md:mt-6 md:max-w-[500px] md:text-lg md:leading-7">
            Məhsul, xidmət və mağazaları bir platformada kəşf edin. Kateqoriyanı seçin,
            elanları müqayisə edin və birbaşa əlaqə saxlayın.
          </p>

          <Link
            href="/account/store/apply"
            className="group mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#f97316] px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#ea580c] hover:shadow-[0_14px_30px_rgba(249,115,22,0.34)] active:translate-y-0 sm:mt-5"
          >
            Mağazanı yarat
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
