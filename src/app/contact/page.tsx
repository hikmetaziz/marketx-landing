import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";

import { PageShell } from "@/components/layout/PageShell";
import { SITE } from "@/constants/data";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Əlaqə",
  description: `${SITE.name} əlaqə məlumatları — ${SITE.contactEmail} | ${SITE.domain}`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <PageShell title="Əlaqə">
      <div className="space-y-6">
        <div className="card-premium space-y-4 rounded-2xl p-5 hover:translate-y-0">
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="flex items-center gap-3 text-brand-text transition-colors hover:text-brand-primary"
          >
            <span className="icon-well inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-primary/20 text-brand-primary">
              <Mail className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs font-medium text-brand-muted">E-poçt</span>
              <span className="font-semibold">{SITE.contactEmail}</span>
            </span>
          </a>
          <div className="flex items-center gap-3 text-brand-text">
            <span className="icon-well inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-primary/20 text-brand-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs font-medium text-brand-muted">Ünvan</span>
              <span className="font-semibold">{SITE.location}</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-border/90 bg-brand-surface/50 p-5">
          <h2 className="text-base font-bold text-brand-text">Mesaj göndərin</h2>
          <p className="mt-2 text-sm text-brand-muted">
            Forma hazırlanma mərhələsindədir. Hazırda birbaşa e-poçt ilə əlaqə saxlayın.
          </p>
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="btn-primary-premium mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          >
            {SITE.contactEmail} ünvanına yaz
          </a>
        </div>
      </div>
    </PageShell>
  );
}
