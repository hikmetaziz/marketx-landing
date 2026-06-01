import {
  Armchair,
  Briefcase,
  Building2,
  Car,
  Grid2x2,
  House,
  Monitor,
  WashingMachine,
} from "lucide-react";
import Link from "next/link";

import { HOME_CATEGORIES } from "@/constants/data";
import { categoryToSlug } from "@/lib/categories";

const iconMap = {
  monitor: Monitor,
  washing: WashingMachine,
  house: House,
  armchair: Armchair,
  building: Building2,
  car: Car,
  briefcase: Briefcase,
  grid: Grid2x2,
} as const;

export function CategoryCardsSection() {
  return (
    <section className="pb-6 sm:pb-7" aria-labelledby="categories-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="categories-heading" className="sr-only">
          Əsas kateqoriyalar
        </h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-8">
          {HOME_CATEGORIES.map((category) => {
            const Icon = iconMap[category.icon as keyof typeof iconMap];
            const href = `/categories/${categoryToSlug(category.title)}`;

            return (
              <Link
                key={category.title}
                href={href}
                className="card-premium flex h-[128px] flex-col items-center justify-center gap-3 rounded-2xl px-2.5 py-4 text-center"
              >
                <span className="icon-well inline-flex h-12 w-12 items-center justify-center rounded-xl border border-brand-primary/20 text-brand-primary">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                </span>
                <span className="text-sm font-semibold leading-tight text-brand-text">
                  {category.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
