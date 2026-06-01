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
    <section className="pb-6 sm:pb-7" aria-labelledby="trust-value-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="trust-value-heading" className="sr-only">
          MarktX üstünlükləri
        </h2>

        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {TRUST_CARDS.map((card) => {
            const Icon = iconMap[card.icon];

            return (
              <article
                key={card.title}
                className="card-premium flex min-h-[120px] items-start gap-3.5 rounded-2xl p-4 hover:translate-y-0"
              >
                <span className="icon-well inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand-primary/20 text-brand-primary">
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
