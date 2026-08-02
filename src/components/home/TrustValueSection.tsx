import { Clock3, Lock, ShieldCheck, Users } from "lucide-react";

import { TRUST_CARDS } from "@/constants/data";

const iconMap = {
  shield: ShieldCheck,
  clock: Clock3,
  users: Users,
  lock: Lock,
} as const;

export function TrustValueSection() {
  return (
    <section className="border-y border-brand-border bg-white py-8 sm:py-10" aria-labelledby="trust-value-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="trust-value-heading" className="sr-only">
          MarktX üstünlükləri
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {TRUST_CARDS.map((card) => {
            const Icon = iconMap[card.icon];

            return (
              <article
                key={card.title}
                className="flex min-h-[88px] items-start gap-3.5 lg:border-l lg:border-brand-border lg:px-6 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light/60 text-brand-primary">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={2.1} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-snug text-brand-text">{card.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-brand-muted">
                    {card.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
