import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { SITE } from "@/constants/data";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Qiymət və Ödənişli Xidmətlər",
  description: `MarktX qiymət və ödənişli xidmətlər haqqında məlumat — ${SITE.domain}`,
  path: "/pricing",
});

const pricingPoints = [
  "Ödənişli xidmətlər (məsələn, elan irəlilədilməsi) gələcəkdə platformaya əlavə oluna bilər.",
  "Ödənişli irəlilətmə satış, baxış və ya mesaj zəmanətini vermir.",
  "Qiymətlər əvvəlcədən xəbərdarlıq edilməklə dəyişdirilə bilər.",
  "Ödəniş funksiyaları hazırda aktiv deyil — Phase 1-də yalnız məlumatlandırma məqsədi daşıyır.",
] as const;

export default function PricingPage() {
  return (
    <PageShell
      title="Qiymət və Ödənişli Xidmətlər"
      subtitle="MarktX hazırda əsas elan funksiyalarını pulsuz təqdim etməyə fokuslanır."
    >
      <div className="space-y-6">
        <ul className="space-y-3">
          {pricingPoints.map((point) => (
            <li
              key={point}
              className="rounded-xl border border-brand-border/90 bg-white p-4 text-sm leading-relaxed text-brand-muted shadow-sm"
            >
              {point}
            </li>
          ))}
        </ul>

        <div className="card-premium rounded-2xl p-5 hover:translate-y-0">
          <h2 className="text-base font-bold text-brand-text">Əlaqə</h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            Qiymət və ödənişli xidmətlər barədə suallarınız üçün bizimlə əlaqə saxlayın.
          </p>
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
          >
            {SITE.contactEmail}
          </a>
        </div>

        <p className="text-sm text-brand-muted">
          Ümumi sorğular üçün{" "}
          <Link href="/contact" className="font-semibold text-brand-primary hover:underline">
            əlaqə səhifəsinə
          </Link>{" "}
          baxa bilərsiniz.
        </p>
      </div>
    </PageShell>
  );
}
