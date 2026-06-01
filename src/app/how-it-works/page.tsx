import type { Metadata } from "next";

import { PageSection, PageShell, StepList } from "@/components/layout/PageShell";
import { BUYER_STEPS, SELLER_STEPS, SITE } from "@/constants/data";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Necə işləyir?",
  description: `MarktX platformasında alıcı və satıcılar üçün addım-addım təlimat — ${SITE.domain}`,
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <PageShell
      title="Necə işləyir?"
      subtitle="Veb saytda canlı elan funksiyaları tezliklə aktiv olacaq."
    >
      <div className="space-y-10">
        <PageSection title="Alıcılar üçün">
          <StepList items={BUYER_STEPS} />
        </PageSection>
        <PageSection title="Satıcılar üçün">
          <StepList items={SELLER_STEPS} />
        </PageSection>
      </div>
    </PageShell>
  );
}
