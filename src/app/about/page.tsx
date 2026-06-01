import type { Metadata } from "next";

import { PageShell } from "@/components/layout/PageShell";
import { ABOUT_TRUST, SITE } from "@/constants/data";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Haqqımızda",
  description: `${SITE.name} haqqında — Azərbaycanda online elan platforması | ${SITE.domain}`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <PageShell title="Haqqımızda">
      <p className="text-base leading-relaxed text-brand-muted">
        MarktX istifadəçiləri bir araya gətirən online elan platformasıdır.
        Məqsədimiz elan yerləşdirməyi,  və istifadəçilər arasında əlaqəni daha rahat
        etməkdir.
      </p>
      <p className="mt-4 text-sm text-brand-muted">{SITE.aiNote}.</p>

      <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
        {ABOUT_TRUST.map((card) => (
          <article key={card.title} className="card-premium rounded-2xl p-4 hover:translate-y-0">
            <h2 className="text-base font-bold text-brand-text">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted">{card.description}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
