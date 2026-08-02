import type { Metadata } from "next";
import Link from "next/link";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Səhifə tapılmadı",
  description: "Axtardığınız MarktX səhifəsi tapılmadı.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">404</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-text">Səhifə tapılmadı</h1>
      <p className="mt-3 text-sm leading-relaxed text-brand-muted">
        Link səhv ola bilər və ya səhifə silinib. Ana səhifəyə qayıdın və ya elanlara baxın.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="btn-primary-premium inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white"
        >
          Ana səhifə
        </Link>
        <Link
          href="/elanlar"
          className="inline-flex items-center justify-center rounded-xl border border-brand-border px-6 py-3 text-sm font-semibold text-brand-text hover:border-brand-primary/40 hover:text-brand-primary"
        >
          Elanlar
        </Link>
      </div>
    </div>
  );
}
