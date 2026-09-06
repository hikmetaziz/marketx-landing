"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { EvBagTypeField } from "@/lib/taxonomy/ev-bag-type-fields";
import { buildEvBagTypeHref } from "@/lib/taxonomy/ev-bag-type-fields";

type EvBagTypeFilterProps = {
  field: EvBagTypeField;
  selectedType: string;
};

export function EvBagTypeFilter({ field, selectedType }: EvBagTypeFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="mb-5 max-w-sm md:mb-6">
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-brand-text">{field.label}</span>
        <select
          value={selectedType}
          onChange={(event) =>
            router.push(
              buildEvBagTypeHref(pathname, searchParams.toString(), event.target.value),
              { scroll: false },
            )
          }
          className="h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text outline-none focus:border-brand-primary"
        >
          <option value="">Bütün növlər</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
